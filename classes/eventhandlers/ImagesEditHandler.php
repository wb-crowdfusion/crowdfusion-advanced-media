<?php
/**
 * ImagesEditHandler
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
 * ImagesEditHandler
 *
 * @package     CrowdFusion
 */
class ImagesEditHandler
{
    protected $ImageService;
    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    protected $FileService;
    public function setFileService(FileService $FileService)
    {
        $this->FileService = $FileService;
    }

    protected $ElementService;
    public function setElementService(ElementService $ElementService)
    {
        $this->ElementService = $ElementService;
    }

    protected $NodeService;
    public function setNodeService(NodeServiceInterface $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /*
     * processEdit() - Triggered on edit to build thumbnails only if
     *                 no thumbnails have been generated yet.
     */
    public function preEdit(NodeRef $nodeRef, Node $node)
    {
        // node has no file
        if (!($originalFileTag = $node->getOutTag('#original'))) { return; }

        // node already has thumbnails that are going to be added
        if ($node->hasOutTags('#thumbnails')) { return; }

        $q = new NodeQuery();
        $q->setParameter('Elements.in',   $nodeRef->Element->Slug)
          ->setParameter('Slugs.in',      $nodeRef->Slug)
          ->setParameter('OutTags.exist', '#thumbnails')
          ->setParameter('Count.only',    true);

        // already has thumbnails
        if ($this->NodeService->findAll($q)->getTotalRecords()) { return; }

        $file = $this->FileService->retrieveFileFromNode(
            $nodeRef->Element,
            new NodeRef(
                $this->ElementService->getBySlug($originalFileTag->TagElement),
                $originalFileTag->TagSlug
            )
        );

        if (!$file) {
            throw new ThumbnailsException('Could not retrieve original file!');
        }

        $originalFilePath = $file->getLocalPath();

        $thumbnailFileNodes = $this->ImageService->createInitialThumbnails(
            $node,
            $originalFilePath
        );

        $newThumbnailTags = array();
        foreach($thumbnailFileNodes as $size => $thumbnailFileNode) {
            $tag = new Tag($thumbnailFileNode->getElement()->getSlug(),
                           $thumbnailFileNode->Slug,
                           '#thumbnails',
                           $size,
                           $size);
            $newThumbnailTags[] = $tag;

        }
        $node->replaceOutTags('#thumbnails',$newThumbnailTags);
    }
}
