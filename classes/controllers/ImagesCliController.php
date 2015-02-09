<?php
/**
 * Command Line controller for images, used to rebuild thumbnails.
 */

class ImagesCliController extends AbstractCliController
{
    /* @var ImageService */
    protected $MediaService;

    /* @var ElementService */
    protected $ElementService;

    /* @var NodeServiceInterface */
    protected $NodeService;

    /* @var GearmanService $GearmanService */
    protected $GearmanService;

    /* @var DataSourceInterface $systemDataSource */
    protected $systemDataSource;

    /* @var NodeCache $nodecache */
    protected $nodecache;

    /* @var DatabaseInterface */
    private $db;

    /**
     * @param AbstractMediaService $val
     */
    public function setImageService(AbstractMediaService $val)
    {
        $this->MediaService = $val;
    }

    /**
     * @param ElementService $val
     */
    public function setElementService(ElementService $val)
    {
        $this->ElementService = $val;
    }

    /**
     * @param NodeServiceInterface $val
     */
    public function setNodeService(NodeServiceInterface $val)
    {
        $this->NodeService = $val;
    }

    /**
     * @param GearmanService $val
     */
    public function setGearmanService(GearmanService $val)
    {
        $this->GearmanService = $val;
    }

    /**
     * @param DataSourceInterface $val
     */
    public function setSystemDataSource(DataSourceInterface $val)
    {
        $this->systemDataSource = $val;
    }

    /**
     * @param NodeCache $val
     */
    public function setNodeCache(NodeCache $val)
    {
        $this->nodecache = $val;
    }

    /**
     * @param $severity
     * @param $message
     * @param $filepath
     * @param $line
     */
    public function handleErrors($severity, $message, $filepath, $line)
    {
        if ($severity != E_NOTICE && $severity != E_STRICT) {
            $this->Logger->warn("Uncaught Error: $severity $message $filepath $line");
        }
    }

    /**
     * @param $exception
     */
    public function handleExceptions($exception)
    {
        if ($exception instanceof Exception) {
            $msg = $exception->getMessage();
        } else {
            $msg = (string) $exception;
        }
        $this->Logger->warn("Uncaught Exception: $msg");
    }

    /**
     * Populate missing thumbnails on nodes.
     *
     * - string 'element' is the type of element to run this process on.
     *
     * - int 'batchSize' number of nodes to populate at a time (DEFAULT = 500, MAX = 2500)
     *
     * - int 'chunkSize' size of the chunks to split the batch into.  there is a fixed delay
     *      between chunk processing (.2 seconds). (DEFAULT = 50, MAX = 250)
     *
     * - int 'maxNodes' number of nodes that should be processed overall.  In most cases you only
     *      need to generate thumbnails for the last say 10k images.  Nodes are handled newest->oldest
     *      so it may not be worth generating thumbs for older content.  WARNING - doing the entire set
     *      of nodes could increase s3 storage by a lot depending on how many missing sizes there are.
     *
     * - int 'wait' time, in seconds, to pause between batches (DEFAULT = 30, MAX = 600)
     *
     * - boolean 'useGearman' is to set whether we use Gearman to process this batch. (DEFAULT = true)
     *
     * - boolean 'forceRebuild' WARNING!!!!  DESTRUCTIVE!!! if true all thumbs will be regenerated. (DEFAULT = false, CURRENTLY DISABLED)
     *
     * - boolean 'dryRun' Will not make any thumbs, used for debugging. (DEFAULT = false)
     */
    protected function rebuildThumbnails()
    {
        $element      = $this->Request->getRequiredParameter('element');
        $batchSize    = abs((int) $this->Request->getParameter('batchSize'));
        $chunkSize    = abs((int) $this->Request->getParameter('chunkSize'));
        $maxNodes     = abs((int) $this->Request->getParameter('maxNodes'));
        $wait         = abs((int) $this->Request->getParameter('wait'));
        $useGearman   = $this->Request->getParameter('useGearman');
        $forceRebuild = $this->Request->getParameter('forceRebuild');
        $dryRun       = $this->Request->getParameter('dryRun');

        // sanitize parameters
        $batchSize    = ($batchSize < 1 || $batchSize > 2500) ? 500 : $batchSize;
        $chunkSize    = ($chunkSize < 1 || $chunkSize > 250) ? 50 : $chunkSize;
        $maxNodes     = ($maxNodes < 1 || $maxNodes > 100000) ? 10000 : $maxNodes;
        $wait         = ($wait < 1 || $wait > 600) ? 30 : $wait;
        $useGearman   = (is_null($useGearman)) ? true : StringUtils::strToBool($useGearman);
        $forceRebuild = false; // (is_null($forceRebuild)) ? false : StringUtils::strToBool($forceRebuild);
        $dryRun       = (is_null($dryRun)) ? false : StringUtils::strToBool($dryRun);

        /* @var Element $elementObj */
        // this will throw an exception if the element is invalid
        $elementObj = $this->ElementService->getBySlug($element);

        $this->Logger->info('Started at ' . $this->DateFactory->newLocalDate() . ' by ' . trim(`whoami`) . ' (pid ' . posix_getpid() . ') in ' . $_SERVER['ENVIRONMENT']);
        $this->Logger->info("Throttle set to [{$batchSize}] nodeRefs every [{$wait}] seconds with [{$chunkSize}] chunk size.");

        if ($useGearman) {
            $this->Logger->info("Batches will be run through Gearman.");
        } else {
            set_error_handler(array($this, 'handleErrors'));
            set_exception_handler(array($this, 'handleExceptions'));
        }

        if ($dryRun) {
            $this->Logger->info("DRY RUN - NO THUMBS WILL ACTUALLY BE GENERATED.");
        }

        $totalCount = $this->loadNodeRefsWithMissingThumbs($element, $maxNodes);
        $totalProcessed = 0;
        $totalBatches = 0;

        if ($totalCount < 1) {
            $this->Logger->info("No missing thumbnail sizes for [{$element}].  Do nothing.");
            return;
        }

        $this->Logger->info("Found [{$totalCount}] nodes for [{$element}] with missing thumbnails.");

        while (true) {
            $offset = $totalBatches * $batchSize;
            $nodeRefs = $this->getNodeRefsWithMissingThumbs($element, $batchSize, $offset);

            if (!is_array($nodeRefs) || count($nodeRefs) < 1) {
                $this->Logger->info("nodeRefs array is empty");
                break;
            }

            if ($totalProcessed >= $maxNodes) {
                $this->Logger->info("Processed up to max nodes [{$maxNodes}].  Exitting.");
                break;
            }

            $chunks = array_chunk($nodeRefs, $chunkSize);

            foreach ($chunks as $chunk) {
                if ($useGearman) {
                    $chunkCount = count($chunk);
                    $totalProcessed += $chunkCount;
                    if ($dryRun) {
                        $this->Logger->info("[{$totalProcessed}:{$totalCount}] DRY RUN Sending [{$chunkCount}] nodeRefs to gearman.");
                    } else {
                        $params = array('nodeRefs' => $chunk, 'forceRebuildExisting' => $forceRebuild);
                        $this->GearmanService->doBackgroundJob('ImagesWorker', 'rebuildThumbnails', $params);
                        $this->Logger->info("[{$totalProcessed}:{$totalCount}] Sending [{$chunkCount}] nodeRefs to gearman.");
                    }
                } else {
                    foreach ((array) $chunk as $nodeRef) {
                        $totalProcessed++;
                        try {
                            if ($dryRun) {
                                $this->Logger->info("[{$totalProcessed}:{$totalCount}] DRY RUN $nodeRef");
                            } else {
                                $nodeRefObj = new NodeRef($elementObj, end(explode(':', $nodeRef)));
                                $this->MediaService->rebuildThumbnails($nodeRefObj, $forceRebuild, false);
                                $this->TransactionManager->commit()->begin();
                                $this->Logger->info("[{$totalProcessed}:{$totalCount}] $nodeRef");
                            }
                        } catch (Exception $e) {
                            $this->Logger->warn("[{$totalProcessed}:{$totalCount}] Failed on [$nodeRef] with error: {$e->getMessage()}");
                        }
                    }

                    $this->nodecache->clearLocalCache();
                }

                usleep(200000);
            }

            $totalBatches++;
            $this->Logger->info("Processed batch [{$totalBatches}].  Going to sleep for [{$wait}] seconds.\n");
            sleep($wait);
        }

        $this->dropTempTable($element);
        $this->Logger->info("Processed [{$totalProcessed}] nodes in [{$totalBatches}] batches.");
        $this->Logger->info('Completed at ' . $this->DateFactory->newLocalDate());
    }

    /**
     * @deprecated call rebuildThumbnails with the proper parameters
     *
     */
    protected function rebuildThumbnailsDistributed()
    {
        $this->rebuildThumbnails();
    }

    /**
     * Gets an array of nodeRefs that need to have #thumbnails populated.
     *
     * @param string $element
     * @param int $limit
     * @param int $offset
     *
     * @return array
     */
    private function getNodeRefsWithMissingThumbs($element, $limit = 500, $offset = 0)
    {
        $tempTableName = $this->getTempTableName($element);
        $sql = "SELECT CONCAT('{$element}:', slug) FROM {$tempTableName} ORDER BY id ASC LIMIT {$offset}, {$limit}";

        $this->Logger->info($sql);

        $db = $this->getDBConnection();
        $results = $db->readAll($sql);
        $nodeRefs = array();

        foreach ($results as $nestedArray) {
            foreach ($nestedArray as $val) {
                $nodeRefs[] = $val;
            }
        }

        return $nodeRefs;
    }

    /**
     * Loads up all of the node refs (up to max nodes) into a temporary table.
     *
     * @param string $element
     * @param int $maxNodes
     *
     * @return int - the total number of records found
     */
    private function loadNodeRefsWithMissingThumbs($element, $maxNodes = 10000)
    {
        $this->createTempTable($element);
        $tempTableName = $this->getTempTableName($element);

        $cElement = StringUtils::camelize($element);
        $thumbSizes = $this->MediaService->getUniqueThumbnailSizes($element);
        $totalSizes = count($thumbSizes);
        $tableName = str_replace('-', '_', 'n-' . $element);

        $sql = array();
        foreach($thumbSizes as $thumbSize) {
            $sql[] = <<<EOL
(
    SELECT
        IF(COUNT(1),1,0)
    FROM
        {$tableName}_outtags b
    WHERE
        b.Table{$cElement}ID = a.Table{$cElement}ID
        AND b.Role = 'thumbnails'
        AND b.Value = '{$thumbSize}'
)
EOL;
        }

        $sql = implode('+', $sql);
        $sql = <<<EOL
INSERT IGNORE INTO {$tempTableName}
    (slug)
SELECT
    SQL_CALC_FOUND_ROWS
    Slug
FROM
    (
        SELECT
            a.Slug, a.Table{$cElement}ID
        FROM
            {$tableName} a
        WHERE
            a.Status <> 'deleted'
            AND {$totalSizes} > ({$sql})
    ) as T1
ORDER BY
    Table{$cElement}ID DESC
LIMIT
    $maxNodes
EOL;

        $this->Logger->info($sql);

        $db = $this->getDBConnection();
        $db->write($sql, DatabaseInterface::AFFECTED_ROWS);

        return intVal($db->readField('SELECT FOUND_ROWS()'));
    }

    /**
     * Creates a temporary table where we can store all of the nodes that need
     * to have thumbnails generated.
     *
     * @param string $element
     */
    private function createTempTable($element)
    {
        $db = $this->getDBConnection();
        $tableName = $this->getTempTableName($element);
        $db->write("drop temporary table if exists {$tableName}");
$sql = <<<EOL
create temporary table {$tableName} (
    `id` int not null auto_increment,
    `slug` varchar(255) unique not null,
    primary key (id)
)
EOL;
        $db->write($sql);
        $this->Logger->info("Created [{$tableName}]");
    }

    /**
     * Removes the temporary table.  Mysql *should* do this automatically
     * when the connection closes but left here in case we switch this to
     * a real table at some point.
     *
     * @param string $element
     */
    private function dropTempTable($element)
    {
        $db = $this->getDBConnection();
        $tableName = $this->getTempTableName($element);
        $db->write("drop temporary table if exists {$tableName}");
        $this->Logger->info("Dropped [{$tableName}]");
    }

    /**
     * Gets a temp table name.
     *
     * @param string $element
     * @return string
     */
    private function getTempTableName($element)
    {
        $element = str_replace('-', '_', $element);
        return "_tmp_rebuild_thumbs_$element";
    }

    /**
     * Gets a connection to the master DB.
     *
     * @return DatabaseInterface
     */
    private function getDBConnection()
    {
        if (null === $this->db) {
            $this->db = $this->systemDataSource->getConnectionsForReadWrite()->offsetGet(0)->getConnection();
        }

        return $this->db;
    }
}
