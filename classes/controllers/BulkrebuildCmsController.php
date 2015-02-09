<?php
/**
 * Bulk Rebuild Thumbnails CMS Controller
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
 * @package   CrowdFusion
 * @copyright 2009-2010 Crowd Fusion Inc.
 * @license   http://www.opensource.org/licenses/bsd-license.php BSD License
 * @version   $Id: BulkrebuildCmsController.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * Bulk Rebuild Thumbnails CMS Controller
 *
 * @package   CrowdFusion
 */
class BulkrebuildCmsController extends AbstractBulkActionController
{

    /**
     * @var ImageService $ImageService
     */
    protected $ImageService;
    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    public function execute() {

        $this->_beginBulkaction();

        $noderefs = $this->_getNodeRefs();

        foreach($noderefs as $noderef) {

            if(!$noderef->getElement()->hasAspect('@images')) {
                $this->_failureBulkaction('Not an image',$noderef->getElement()->Slug,$noderef->Slug);
                continue;
            }

            try {

                $this->ImageService->rebuildMissingThumbnails($noderef);
                $this->_updateBulkaction($noderef->getElement()->Slug,$noderef->Slug);

            } catch(Exception $e) {
                $this->_failureBulkaction($e->getMessage(),$noderef->getElement()->Slug,$noderef->Slug);
            }
        }

        return $this->_endBulkaction();
    }

}