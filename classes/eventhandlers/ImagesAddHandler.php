<?php
/**
 * ImagesAddHandler
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2010 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted under the terms of the BSD License.
 *
 * @package     CrowdFusion
 * @copyright   2009-2010 Crowd Fusion Inc.
 * @license     http://www.opensource.org/licenses/bsd-license.php BSD License
 * @version     $Id$
 */

/**
 * ImagesAddHandler
 *
 * @package     CrowdFusion
 */
class ImagesAddHandler extends ImagesQuickAddHandler {

    protected $triggered = false;

    protected $imagesThumbnailCmsSize;

    protected $RequestContext;
    public function setRequestContext($RequestContext)
    {
        $this->RequestContext = $RequestContext;
    }

    protected $ImageService;
    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    /** @var FileService */
    protected $FileService;
    public function setFileService(FileService $FileService)
    {
        $this->FileService = $FileService;
    }

    /** @var RegulatedNodeService */
    protected $RegulatedNodeService;
    public function setRegulatedNodeService(RegulatedNodeService $RegulatedNodeService)
    {
        $this->RegulatedNodeService = $RegulatedNodeService;
    }

    /** @var TransactionManager */
    protected $TransactionManager;
    public function setTransactionManager(TransactionManagerInterface $transactionManager)
    {
        $this->TransactionManager = $transactionManager;
    }

    /** @var GearmanService */
    protected $GearmanService;
    public function setGearmanService(GearmanService $GearmanService)
    {
        $this->GearmanService = $GearmanService;
    }

    public function setImagesThumbnailCmsSize($imagesThumbnailCmsSize)
    {
        $this->imagesThumbnailCmsSize = $imagesThumbnailCmsSize;
    }

    protected function getMediaService()
    {
        return $this->ImageService;
    }

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /**
     * For event in shared context:
     * Node.@images.add.post
     *
     * @param NodeRef $nodeRef      NodeRef Being Added
     * @param Node    $node         Node Being added
     * @param null    $notUsed      Paramater passed in via Events::trigger, but set to null, and not used.
     * @param bool    $asyncRebuild Wether to rebuildThumbnails asyncronously or not (defaults to true)
     *
     * @return void
     */
    public function processAdd(NodeRef $nodeRef, Node $node, $notUsed = null, $asyncRebuild = true)
    {
        $node = $this->RegulatedNodeService->getByNodeRef($nodeRef, new NodePartials('','#original.fields'));

        //-----------
        // Build CMS thumbnail separately so that it's ready when this action completes.
        $file = $this->FileService->retrieveFileFromNode($node->getElement(), $node->getOutTag('#original')->TagLinkNodeRef);
        if ($file === null ){
            throw new Exception('File cannot be retrieved for Node');
        }
        $cmsThumb = $this->ImageService->createAndStoreThumbnail($node->getElement(), $this->imagesThumbnailCmsSize, $file->getLocalPath(), $this->ImageService->filenameForNode($node));

        $tag = new Tag($cmsThumb->getElement()->getSlug(),
            $cmsThumb->Slug,
            '#thumbnails',
            $this->imagesThumbnailCmsSize,
            $this->imagesThumbnailCmsSize);

        $node->replaceOutTags('#thumbnails',array($tag));

        $this->RegulatedNodeService->edit($node);

        if ($asyncRebuild) {

            // commit so the node is ready for the worker
            $this->TransactionManager->commit()->begin();

            //-----------
            // Rebuild thumbnails asynchronously
            $workerParams = array(
                'nodeRef'              => ''.$node->getNodeRef(),
                'forceRebuildExisting' => false
            );

            $this->GearmanService->doBackgroundJob('ImagesWorker', 'rebuildThumbnails', $workerParams, 'high');
        } else {
            $this->ImageService->rebuildMissingThumbnails($node->getNodeRef(), false);
        }

        // remove storage facility generated temp file
        @unlink($file->getLocalPath());
    }

    /**
     * For event in web/app context:
     * Node.@images.add.post
     * Since web context is directly a user, we want to make sure the images are generated immediately before
     * the page refreshes, so things like avatars, etc will be completed.
     *
     * @param NodeRef $nodeRef NodeRef Being Added
     * @param Node    $node    Node Being added
     *
     * @return void
     */
    public function processAddWeb(NodeRef $nodeRef, Node $node)
    {
        $this->processAdd($nodeRef, $node, null, false);
    }

}
