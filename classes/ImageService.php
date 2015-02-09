<?php
/**
 * MediaService
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
 * @version     $Id: MediaService.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * MediaService
 *
 * @package     CrowdFusion
 */
class ImageService extends AbstractMediaService {

    protected $thumbnailSizes;
    protected $makeJpegsFromPngs;
    protected $thumbnailCmsSize;
    protected $maximumDimension;

    public function setImagesThumbnailSizes($thumbnailSizes)
    {
        if (is_array($thumbnailSizes))
        {
			$trimmedSizes = array();
            foreach($thumbnailSizes as $key => $val)
			{
				$trimmedSizes[$key] = trim($val);
			}
			$thumbnailSizes = $trimmedSizes;
        } else {
            $thumbnailSizes = trim($thumbnailSizes);
        }

        $this->thumbnailSizes = $thumbnailSizes;
    }

    public function setImagesMakeJpegsFromPngs($makeJpegsFromPngs)
    {
        $this->makeJpegsFromPngs = $makeJpegsFromPngs;
    }

    public function setImagesThumbnailCmsSize($thumbnailCmsSize)
    {
        $this->thumbnailCmsSize = $thumbnailCmsSize;
    }

    public function setImagesMaximumDimension($maximumDimension)
    {
        $this->maximumDimension = $maximumDimension;
    }

    /**
     * @var $Events Events
     */
    protected $Events;
    public function setEvents(Events $Events) {
        $this->Events = $Events;
    }

    protected $Thumbnails;

    public function setThumbnails(ThumbnailsInterface $Thumbnails)
    {
        $this->Thumbnails = $Thumbnails;
    }

    protected function getMediaAspect()
    {
        return '@images';
    }

    protected function getDefaultExtension()
    {
        return 'jpg';
    }

    /*
     *
     */
    public function filenameForNode($node)
    {
        $ext = pathinfo($node->Title, PATHINFO_EXTENSION);
        $filename = str_replace('.'.$ext, '', $node->Title);

        $dateStamp = '/';
        if($this->mediaOrganizeByDate) {
            $dateStamp = $this->getDateStamp($node);
        }

        return $dateStamp.SlugUtils::createSlug($filename);
    }

	/**
	 * Rebuild the thumbnails for a given image node.
	 *
     * @param NodeRef $nodeRef              This is the noderef of the media record.
     * @param bool    $forceRebuildExisting Force rebuild existing thumbnails (defaults to false)
     * @param bool    $checkFileExists      Check if file exists on storage facility (defaults to true)
     *
     * @return void
     */
    public function rebuildThumbnails(NodeRef $nodeRef, $forceRebuildExisting = false, $checkFileExists = true)
    {
        if ($forceRebuildExisting) {
            $this->forceRebuildThumbnails($nodeRef, $checkFileExists);
        } else {
            $this->rebuildMissingThumbnails($nodeRef, $checkFileExists);
        }
    }

    public function createInitialThumbnails($mediaNode, $originalFilePath, $desiredFileWithoutExtension = null)
    {
        if (!$desiredFileWithoutExtension) {
            $desiredFileWithoutExtension = $this->filenameForNode($mediaNode);
        }

        $thumbnailFileNodes = array();
        $sizes = $this->getUniqueThumbnailSizes($mediaNode->getElement()->getSlug());
        foreach($sizes as $size) {
            $thumbnailFileNodes[$size] = $this->createAndStoreThumbnail(
                $mediaNode->Element,
                $size,
                $originalFilePath,
                $desiredFileWithoutExtension
            );
        }

        return $thumbnailFileNodes;
    }

    protected function determineOverrideFileFormat($mediaElement, $filePath)
    {
        if (strtolower(pathinfo($filePath, PATHINFO_EXTENSION)) == 'png') {
            if (empty($this->makeJpegsFromPngs)) {
                return null;
            }
            if (!is_array($this->makeJpegsFromPngs)) {
                return 'jpg';
            }
            if (!empty($this->makeJpegsFromPngs[$mediaElement->Slug])) {
                return 'jpg';
            }
            if (!empty($this->makeJpegsFromPngs['default'])) {
                return 'jpg';
            }
        }
        return null;
    }

    protected function processSpecificMedia($mediaNode, $originalFilePath, $desiredFilename, $desiredFileWithoutExtension, StorageFacilityFile $preconfiguredFile = null)
    {
        $nodeRef = $mediaNode->getNodeRef();
        $mediaElement = $nodeRef->getElement();

        $overrideFileFormat = $this->determineOverrideFileFormat($mediaElement, $originalFilePath);

        //REDUCE THE SIZE OF THE ORIGINAL IF EXCEEDS SPECIFIED MAX DIMENSION
        if(!empty($this->maximumDimension)) {
            $thumbFileName = $this->Thumbnails->createThumbnail($originalFilePath,$this->maximumDimension,null,null,$overrideFileFormat);
            $originalFilePath = dirname($originalFilePath).'/'.$thumbFileName;
        }

        //STORE ORIGINAL FILE IN SF & CREATE NODE
        $originalFileNode = $this->FileService->createFileNode($mediaElement, $desiredFilename, $originalFilePath, $preconfiguredFile);

        //REMOVE LOCAL ORIGINAL WORKING FILE
        @unlink($originalFilePath);

        //PROCESS TAGS
        if ($originalFileNode != null) {
            //REPLACE ORIGINAL FILE TAG
            $tag = new Tag($originalFileNode->getElement()->getSlug(),$originalFileNode->Slug,'#original');
            $tag->TagLinkNode = $originalFileNode;
            $mediaNode->replaceOutTag($tag);
        }
    }

    public function createAndStoreThumbnail(Element $mediaElement, $size, $originalFilePath, $desiredFileWithoutExtension)
    {
        $overrideFileFormat = $this->determineOverrideFileFormat($mediaElement, $originalFilePath);
        //GENERATE THUMBNAIL FILE
        $thumbFileName = $this->Thumbnails->createThumbnail($originalFilePath,$size,null,dirname($originalFilePath),$overrideFileFormat);
        $extension = strtolower(pathinfo($thumbFileName, PATHINFO_EXTENSION));
        $fullThumbPath = dirname($originalFilePath).'/'.$thumbFileName;

        $suffix = '-'.$size.'.'.$extension;

        //ENSURE FILENAME IS 128 OR LESS
        $len = strlen($desiredFileWithoutExtension.$suffix);
        if($len > 128) {
            $desiredFileWithoutExtension = substr($desiredFileWithoutExtension,0,128 - strlen($suffix));
        }

        //STORE THUMBNAIL FILE IN SF & CREATE NODE
        $thumbNode = $this->FileService->createFileNode($mediaElement, $desiredFileWithoutExtension.$suffix,$fullThumbPath);

        //REMOVE LOCAL THUMBNAIL FILE
        @unlink($fullThumbPath);

        return $thumbNode;
    }

    /**
     * @param null $elementSlug
     * @return array
     * @throws Exception
     */
    public function getUniqueThumbnailSizes($elementSlug = null)
    {
        $sizes = $this->thumbnailCmsSize;
        if (is_string($this->thumbnailSizes)) {
            $sizes .= ',' . $this->thumbnailSizes;
        } else if (is_array($this->thumbnailSizes)) {
            if (array_key_exists($elementSlug, $this->thumbnailSizes)) {
                $sizes .= ',' . $this->thumbnailSizes[$elementSlug];
            }
        } else {
            throw new Exception("Invalid thumbnail sizes [{$elementSlug}]");
        }

        return array_unique(StringUtils::smartSplit($sizes, ','));
    }

    /**
     * populates #thumbnails-json for the node
     *
     * @param NodeRef $nodeRef
     * @return void
     */
    public function syncJsonThumbnails(NodeRef $nodeRef)
    {

        $node = $this->NodeService->getByNodeRef($nodeRef, new NodePartials(null, '#thumbnails.fields', null));
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
    }

    /**
     * @param NodeRef $nodeRef This is the noderef of the media record.
     * @param bool $checkFileExists
     *
     * @throws Exception
     */
    public function rebuildMissingThumbnails(NodeRef $nodeRef, $checkFileExists = true)
    {
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('', '#original,#thumbnails'));
        if(empty($node))
            throw new Exception('Node not found for NodeRef ['.$nodeRef.']');

        $mediaElement = $nodeRef->getElement();

        //$original = $node->getOutTag('#original');

        if($node->hasOutTags('#original')) { //'!empty($original) && !empty($original->TagLinkNode)) {
            $missingThumbnailSizes = array();

            $file = $this->FileService->retrieveFileFromNode($mediaElement, $node->getOutTag('#original')->TagLinkNodeRef);
            if(!empty($file))
            {
                if (!getimagesize($file->getLocalPath())){
                    // remove temp file created by storage facility
                    @unlink($file->getLocalPath());
                    return;
                }

                $thumbnailTags = $node->getOutTags('#thumbnails');
                $sizes = $this->getUniqueThumbnailSizes($nodeRef->getElement()->getSlug());
                $newThumbnailTags = array();

                //FIND ALL SIZES THAT NEED TO BE GENERATED
                foreach($sizes as $size) {
                    $found = false;
                    foreach($thumbnailTags as $tag) {
                        $fileExists = true;
                        if($checkFileExists && !$this->FileService->checkFileExistsFromId($mediaElement, $tag->TagLinkTitle))
                            $fileExists = false;
                        if($tag->TagValue == $size && $fileExists)
                            $found = true;
                    }
                    if(!$found)
                        $missingThumbnailSizes[] = $size;
                }

                //REMOVE UNEEDED THUMBNAIL FILE NODES
                foreach($thumbnailTags as $tag) {
                    //RECREATE SHALLOW TAG OBJECT DUE TO PHP EXCEPTION HANDLING WITH DEEP-REFERENCE OBJECT GRAPHS
                    $newThumbnailTags[] = new Tag($tag->getTagElement(),$tag->getTagSlug(),'#thumbnails',$tag->getTagValue(),$tag->getTagValue());
                }

                unset($thumbnailTags);

                $thumbnailFileNodes = array();
                foreach($missingThumbnailSizes as $size) {
                    $thumbnailFileNodes[$size] = $this->createAndStoreThumbnail($mediaElement, $size, $file->getLocalPath(), $this->filenameForNode($node));
                }

                //REPLACE THUMBNAIL FILE TAGS
                foreach($thumbnailFileNodes as $size => $thumbnailFileNode) {
                    $tag = new Tag($thumbnailFileNode->getElement()->getSlug(),
                                   $thumbnailFileNode->Slug,
                                   '#thumbnails',
                                   $size,
                                   $size);
                    $newThumbnailTags[] = $tag;

                }
                $node->replaceOutTags('#thumbnails',$newThumbnailTags);

                $this->NodeService->edit($node);

                // remove temp file created by storage facility
                @unlink($file->getLocalPath());
            }
        }
    }

    /**
     * @param NodeRef $nodeRef This is the noderef of the media record.
     *
     * @throws Exception
     */
    public function forceRebuildThumbnails(NodeRef $nodeRef)
    {
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('', '#original,#thumbnails'));
        if(empty($node))
            throw new Exception('Node not found for NodeRef ['.$nodeRef.']');

        $mediaElement = $nodeRef->getElement();

        //$original = $node->getOutTag('#original');

        if($node->hasOutTags('#original')) { //'!empty($original) && !empty($original->TagLinkNode)) {

            $file = $this->FileService->retrieveFileFromNode($mediaElement, $node->getOutTag('#original')->TagLinkNodeRef);
            if(!empty($file))
            {
                if (!getimagesize($file->getLocalPath())){
                    // remove temp file created by storage facility
                    @unlink($file->getLocalPath());
                    return;
                }

                $thumbnailTags = $node->getOutTags('#thumbnails');
                $sizes = $this->getUniqueThumbnailSizes($nodeRef->getElement()->getSlug());
                $newThumbnailTags = array();

                unset($thumbnailTags);

                $thumbnailFileNodes = array();
                foreach($sizes as $size) {
                    $thumbnailFileNodes[$size] = $this->createAndStoreThumbnail($mediaElement, $size, $file->getLocalPath(), $this->filenameForNode($node));
                }

                //REPLACE THUMBNAIL FILE TAGS
                foreach($thumbnailFileNodes as $size => $thumbnailFileNode) {
                    $tag = new Tag($thumbnailFileNode->getElement()->getSlug(),
                                   $thumbnailFileNode->Slug,
                                   '#thumbnails',
                                   $size,
                                   $size);
                    $newThumbnailTags[] = $tag;

                }
                $node->replaceOutTags('#thumbnails',$newThumbnailTags);

                $this->NodeService->edit($node);

                // Since force rebuild is destructive, this event will allow any other plugins to hook
                // in and rebuild thumbnails that may be now missing.
                $this->Events->trigger(__CLASS__ . '.rebuildthumbnails.forcerebuild.post', $node);

                // remove temp file created by storage facility
                @unlink($file->getLocalPath());
            }
        }
    }


}
