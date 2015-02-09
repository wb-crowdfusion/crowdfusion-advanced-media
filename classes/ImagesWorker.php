<?php

class ImagesWorker extends AbstractGearmanWorker
{
    /* @var NodeRefService */
    protected $NodeRefService;

    /* @var ImageService */
    protected $ImageService;

    /**
     * @param NodeRefService $val
     */
    public function setNodeRefService(NodeRefService $val)
    {
        $this->NodeRefService = $val;
    }

    /**
     * @param ImageService $val
     */
    public function setImageService(ImageService $val)
    {
        $this->ImageService = $val;
    }

    /**
     * Rebuilds thumbnails for a single node ref or array of node refs.
     */
    public function rebuildThumbnails()
    {
        $data = $this->getData();
        $forceRebuildExisting = isset($data['forceRebuildExisting']) ? StringUtils::strToBool($data['forceRebuildExisting']) : false;

        if (isset($data['nodeRef'])) {
            $this->rebuildThumbnailsOnNodeRef($data['nodeRef'], $forceRebuildExisting);
            return;
        }

        if (!isset($data['nodeRefs']) || !is_array($data['nodeRefs'])) {
            return;
        }

        foreach ($data['nodeRefs'] as $nodeRef) {
            $this->rebuildThumbnailsOnNodeRef($nodeRef, $forceRebuildExisting);
            $this->TransactionManager->commit()->begin();
            usleep(100000);
        }
    }

    /**
     * Rebuilds thumbnails for a single node ref
     *
     * @param string $nodeRefStr
     * @param bool $forceRebuildExisting
     */
    private function rebuildThumbnailsOnNodeRef($nodeRefStr, $forceRebuildExisting = false)
    {
        $nodeRef = $this->NodeRefService->parseFromString($nodeRefStr);
        try {
            $this->ImageService->rebuildThumbnails($nodeRef, $forceRebuildExisting, false);
        } catch(Exception $e) {
            $this->Logger->warn("$nodeRefStr failed with error: " . $e->getMessage());
        }
    }

    /**
     * Updates the the #thumbnails-json meta on the
     * node which is a denormalization of the #thumbnails
     * tag role.
     */
    public function syncJsonThumbnails()
    {
        $data = $this->getData();
        $nodeRefs = explode(',', $data['nodeRefs']);

        foreach ($nodeRefs as $nodeRef) {
            $nodeRef = $this->NodeRefService->parseFromString($nodeRef);
            try {
                $this->ImageService->syncJsonThumbnails($nodeRef);
                $this->TransactionManager->commit()->begin();
            } catch (Exception $e) {
                $this->Logger->warn("$nodeRef failed with error: " . $e->getMessage());
            }
        }
    }
}