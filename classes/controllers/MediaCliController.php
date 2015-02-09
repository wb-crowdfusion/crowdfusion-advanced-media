<?php
 /**
 * MediaCliController
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2011 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @license     http://www.crowdfusion.com/licenses/enterprise CF Enterprise License
 * @version     $Id$
 */

/**
 * @package CrowdFusion
 */
class MediaCliController extends AbstractCliController
{

    /**
     * @var ImageService
     */
    protected $ImageService;

    /**
     * [IoC]
     *
     * @param ImageService $ImageService
     * @return void
     */
    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    /**
     * @var NodeRefService
     */
    protected $NodeRefService;

    /**
     * [IoC]
     *
     * @param NodeRefService $NodeRefService
     * @return void
     */
    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }

    /**
     * @var NodeService
     */
    protected $NodeService;

    /**
     * [IoC]
     *
     * @param NodeService $NodeService
     * @return void
     */
    public function setNodeService(NodeService $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    /**
     * @var string
     */
    protected $workDir;

    /**
     * [IoC]
     *
     * @param string $vendorCacheDirectory
     * @return void
     */
    public function setVendorCacheDirectory($vendorCacheDirectory)
    {
        $this->workDir = $vendorCacheDirectory;
    }

    /**
     * @var HttpRequest
     */
    protected $HttpRequest;

    /**
     * [IoC]
     *
     * @param HttpRequest $HttpRequest
     * @return void
     */
    public function setHttpRequest(HttpRequest $HttpRequest)
    {
        $this->HttpRequest = $HttpRequest;
    }

    /**
     * @var GearmanService
     */
    protected $GearmanService;
    /**
     * [IoC]
     *
     * @param GearmanService $GearmanService
     * @return void
     */
    public function setGearmanService(GearmanService $GearmanService)
    {
        $this->GearmanService = $GearmanService;
    }

    /**
     * @var ElementService
     */
    protected $ElementService;

    /**
     * [IoC]
     *
     * @param ElementService $ElementService
     * @return void
     */
    public function setElementService(ElementService $ElementService)
    {
        $this->ElementService = $ElementService;
    }

    /**
     * @var Logger
     */
    protected $Logger;

    /**
     * [IoC]
     *
     * @param Logger $Logger
     * @return void
     */
    public function setLogger(LoggerInterface $Logger)
    {
        $this->Logger = $Logger;
    }

    /**
     * populate #thumbnails-json using gearman
     *
     * Parameters:
     *  element: required param to specify element or @aspect
     *  interval: nodes to process per pass; default 100
     *  limit: nodes to process per job: default 5000
     *  offset: node to skip to for the job: default 0
     * @return void
     */
    public function syncJsonThumbnailsDistributed()
    {
        $interval = $this->Request->getParameter('interval') or $interval = 100;
        $interval = intval($interval);
        $limit = $this->Request->getParameter('limit') or $limit = 5000;
        $limit = intval($limit);
        $initialOffset = $this->Request->getParameter('offset') or $initialOffset = 0;
        $initialOffset = intval($initialOffset);

        $elementField = $this->Request->getParameter('element');
        $aspect = $this->Request->getParameter('aspect');

        if(!empty($elementField)) {

            if(strpos($elementField, '@') === 0) {
                $elements = $this->ElementService->findAllWithAspect($elementField);
                if(empty($elements)) {
                    echo "No Elements found for aspect [{$elementField}]\n";
                    return;
                }
            }
            else {
                $element = $this->ElementService->getBySlug($elementField);
                if(empty($element))
                {
                    echo "Element not found for slug [{$elementField}]\n";
                    return;
                }
            }
            $elements = array($elementField);
            $offset = $initialOffset;
        }
        else if(!empty($aspect)) {
            $elementsForAspect = $this->ElementService->findAllWithAspect($aspect);
            if(empty($elementsForAspect)) {
                echo "No Elements found for aspect [{$aspect}]\n";
                return;
            }
            $elements = array();
            foreach($elementsForAspect as $e) {
                $elements[] = $e->Slug;
            }
            $offset = 0;
        }
        else {
            echo "Error - must specify one of element or aspect\n";
            return;
        }

        $elementList = implode(',', $elements);
        echo "\nProcessing elements: $elementList\n";
        echo "offset = $offset, interval = $interval, limit = $limit\n";

        if($offset > 0)
            echo "\nskipping to $offset limit $limit\n";

        $count = 0;

        $startTime = time();

        foreach($elements as $element) {

            echo"\nProcessing element: $element\n";

            $nq = new NodeQuery();
            $nq->setParameter('Elements.in', $element);
            $nq->setParameter('Count.only', true);
            $nq->setParameter('Status.all', true);
            $nq->setOrderBy('ActiveDate DESC');

            $totalNodeCount = $this->NodeService->findAll($nq)->getTotalRecords();

            echo "Nodes to process: $totalNodeCount\n";

            $countForElement = 0;

            while(true)
            {
                $nq = new NodeQuery();
                $nq->setParameter('NodeRefs.only', true);
                $nq->setParameter('Elements.in', $element);
                $nq->setOrderBy('ActiveDate DESC');
                $nq->setParameter('Status.all', true);
                $nq->setLimit($interval);

                $nq->setOffset($offset);
                //$nodes = $this->NodeService->findAll($nq, true)->getResults();
                $nodes = $this->NodeService->findAll($nq)->getResults();

                if(empty($nodes)) {
                    echo "\nElement '$element' done - $countForElement nodes processed\n";
                    break;
                }

                $this->Logger->debug('Processing '.count($nodes));
                $nodeRefs = array();
                foreach($nodes as $nodeRef)
                {
                    $nodeRefs[] = ''.$nodeRef;

                    $count++;
                    $countForElement++;

                    if($count > $limit) {
                        echo "Limit hit at '$element' node $countForElement\r";
                        break;
                    }
                }

                echo "Nodes processed - element: $countForElement, total: $count\r";

                $params = array(
                    'nodeRefs' => implode(',', $nodeRefs),
                );
                $this->Logger->debug('Initializing Gearman job: '.  ($count+$initialOffset-1)." [$count:$limit] ".$nodeRef);
                $this->GearmanService->doBackgroundJob('ImagesWorker', 'syncJsonThumbnails', $params, 'low');
                usleep(10000);

                if($count > $limit) {
                    echo "\nLimit hit in '$element' - $countForElement nodes processed, $count jobs initialized\n";
                    $this->Logger->debug('Limit hit: '.$count.' jobs initialized');
                    break;
                }
                $offset = ($offset + $interval);
            }
            $offset = 0;
        }
        echo "\n\nDone! $count nodes processed\n";
        $endTime = time();
        $t = $endTime - $startTime;
        $minutes = ceil($t / 60);
        echo "Process took $minutes minutes to complete\n\n";
    }

    /**
     * populates the #thumbnails-json meta on media nodes
     *
     * Parameters:
     *   interval - # of nodes to process per pass, defaults to 25
     *   limit - # of nodes to process per run, defaults to 0 (all)
     *   offset - starting offset, defaults to 0
     *
     * @return void
     */
    public function syncJsonThumbnails()
    {
        $interval = $this->Request->getParameter('interval') or $interval = 25;
        $nodeLimit = $this->Request->getParameter('limit') or $nodeLimit = 0;
        $offset = $this->Request->getParameter('offset') or $offset = 0;

        $nq = new NodeQuery();

        $nq->setParameter('Elements.in','@images');
        $nq->setParameter('OutTags.select','#thumbnails.fields');
        $nq->setOrderBy('ActiveDate','DESC');
        $nq->setLimit($interval);
        $nq->setOffset($offset);

        $nq = $this->NodeService->findAll($nq,true);
        $nodes = $nq->getResults();
        $processedNodes = 0;
        while(count($nodes)>0) {
            foreach($nodes as $node) {
                /* @var Node $node */
                $tags = $node->getOutTags('#thumbnails');

                $thumbs = array();

                foreach($tags as $tag) {
                    /* @var Tag $tag */
                    $thumb = new stdClass();

                    $thumb->value = $tag->TagValue;
                    $thumb->url = $tag->TagLinkNode->jump('#url');
                    $thumb->size = intval($tag->TagLinkNode->jump('#size'));
                    $thumb->height = intval($tag->TagLinkNode->jump('#height'));
                    $thumb->width = intval($tag->TagLinkNode->jump('#width'));

                    $thumbs[] = $thumb;
                }

                $this->NodeService->updateMeta($node->NodeRef,'#thumbnails-json',JSONUtils::encode($thumbs));

                echo $node->Slug."\n";
            }

            $this->TransactionManager->commit()->begin();
            $processedNodes += count($nodes);

            if($nodeLimit > 0 && $processedNodes >= $nodeLimit) {
                break;
            }

            $offset = ($offset + $interval);
            unset($nodes);
            $nq->setLimit($interval);
            $nq->setOffset($offset);
            $nq->clearResults();
            $nq = $this->NodeService->findAll($nq, true);
        	$nodes = $nq->getResults();
        }
    }


    public function importPhotos()
    {
        $dir = $this->Request->getParameter("dir");
        if (!empty($dir)) {
            $this->_importPhotosFromDir($dir);
            return;
        }
        $file = $this->Request->getParameter("file");
        if (!empty($file)) {
            $this->_importPhotosFromJson($file);
            return;
        }
    }

    protected function _importPhotosFromDir($dir) {
        $h = opendir($dir);

        while(($fname = readdir($h)) !== FALSE) {
            if(StringUtils::endsWith(strtolower($fname),'.jpg')) {
                try {
                    echo "importing $fname...";

                    $nodeRef = $this->NodeRefService->oneFromAspect('@images');
                    $nodeRef = $this->NodeRefService->generateNodeRef($nodeRef,$fname);
                    $node = new Node($nodeRef);

                    $node->Title = $fname;
                    $node->Status = "published";
                    $node->ActiveDate = $this->DateFactory->newStorageDate();

                    $node = $this->ImageService->storeMedia(rtrim($dir,'/').'/'.$fname,$node);
                    $this->NodeService->add($node);

                    echo "done\n";

                    unset($nodeRef);
                    unset($node);

                } catch(Exception $e) {
                    echo "Exception: ".$e->getMessage()."\n";
                }
            }
        }

        closedir($h);

    }

    protected function _importPhotosFromJson($file) {
        try {
            $contents = file_get_contents($file);
            $json = JSONUtils::decode($contents);

            foreach ($json as $v) {
                echo "importing {$v->title}...";

                $url = $v->src;
                $parts = parse_url($url);
                $slug = SlugUtils::createSlug(basename($parts['path']));
                preg_match('/(\.\w*)$/', $parts['path'], $ext);

                $nodeRef = $this->NodeRefService->oneFromAspect('@images');
                $nodeRef = $this->NodeRefService->generateNodeRef($nodeRef,$slug);
                $node = new Node($nodeRef);

                if (!$this->NodeService->refExists($node->getNodeRef())) {
                    // go fetch file from url
                    $data = $this->HttpRequest->fetchURL($url);
                    // create a unique output file name
                    $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'urlfetch', !empty($ext[1]) ? strtolower($ext[1]) : null);
                    file_put_contents($sourceFile, $data);

                    $node->Title = rtrim($v->title);
                    $node->Status = "published";
                    $node->ActiveDate = $this->DateFactory->newStorageDate();

                    $node = $this->ImageService->storeMedia($sourceFile,$node,basename($parts['path']));
                    $this->NodeService->add($node);

                    echo "done\n";
                }
                else {
                    echo "exists\n";
                }

                unset($nodeRef);
                unset($node);
            }
        }
        catch (Exception $e) {
            echo "Exception: ".$e->getMessage()."\n";
        }
    }

    public function tagGalleryPhotos()
    {
        $galleryNodeRef = $this->NodeRefService->parseFromString('media-gallery:test-gallery');

        $interval = 25;
        $offset = 0;

        $nq = new NodeQuery();

        $nq->setParameter('Elements.in','image');
        $nq->setParameter('NodeRefs.only',true);
        $nq->setOrderBy('ActiveDate','DESC');
        $nq->setLimit($interval);
        $nq->setOffset($offset);

        $nq = $this->NodeService->findAll($nq,true);
        $nodes = $nq->getResults();

        while(count($nodes)>0) {
            foreach($nodes as $node) {

                $tag = new Tag(
                    $node->getElement()->getSlug(),
                    $node->getSlug(),
                    '#media-gallery-items'
                );

                try {
                    $this->NodeService->addOutTag($galleryNodeRef,$tag);
                    echo $node->Slug."\n";
                } catch(Exception $e) {
                    echo $node->Slug." error: ".$e->getMessage()."\n";
                }
            }

            $offset = ($offset + $interval);

            unset($nodes);

            $nq->setLimit($interval);
            $nq->setOffset($offset);
            $nq->clearResults();

            $nq = $this->NodeService->findAll($nq, true);
        	$nodes = $nq->getResults();
        }
   }
}