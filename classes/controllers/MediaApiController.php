<?php

/**
 * Api Controller for advanced media files.
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
 * Api Controller for advanced media files.
 */
class MediaApiController extends NodeApiController
{
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // fields

    /** @var MediaService */
    protected $MediaService;
    /** @var NodeRefService */
    protected $NodeRefService;
    protected $imagesThumbnailCmsSize;
    protected $thumbnailSizes;

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // auto-wired setters

    public function setMediaService(MediaService $mediaService)
    {
        $this->MediaService = $mediaService;
    }

    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }

    public function setImagesThumbnailCmsSize($imagesThumbnailCmsSize)
    {
        $this->imagesThumbnailCmsSize = $imagesThumbnailCmsSize;
    }

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

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // actions

    /**
     * QuickAdds a Node with POSTed fields.
     */
    public function quickAdd()
    {
        try {
            $this->checkNonce();

            $params = $this->Request->getParameters();
            $params['_uploadedFiles'] = $this->Request->getUploadedFiles();

            if(empty($params['Title']))
                throw new Exception('Title parameter is required',210);

            if(empty($params['ElementSlug']))
                throw new Exception('ElementSlug parameter is required',220);

            $node = $this->MediaService->quickAdd($params);

            // build output
            $output = array('totalRecords' => 1, 'nodes' => array());

            $c = $this->_buildNodeJSON($node,true,true);

            $output['nodes'][] = $c;

            $this->sendJSON($output);
        }
        catch(Exception $e)
        {
            $this->sendExceptionError($e);
        }
    }

    /**
     * Replaces specified thumbnail file.
     */
    public function replaceThumbnail()
    {
        try {
            $file = $this->Request->getParameter('File');
            if (! empty($file)) {
                $filetype = $this->Request->getParameter('Type');
                $files = $this->Request->getUploadedFiles();
                $params['_uploadedFiles'] = $files;
                $params['File'] = $file;

                list($sourceFile, $sourceFileName) = $this->MediaService->getSourceFile($params);
                $binary = fread(fopen($sourceFile, 'r'), filesize($sourceFile));
                $srcFile = 'data:image/'.$filetype.';base64,'.base64_encode($binary);
                $thumbnailValue = $this->Request->getRequiredParameter('thumbnailValue');
            }
            else {
                $srcFile = $this->Request->getParameter('srcFile');
                $thumbnailValue = $this->Request->getRequiredParameter('thumbnailValue');
            }

            if($thumbnailValue == $this->imagesThumbnailCmsSize) {
                $this->sendError('-1','This thumbnail cannot be modified because it is reserved for CMS use.');
                return;
            }

            $nodeRef = $this->getNodeRef();
            $extension = $this->Request->getParameter('extension');
            $this->MediaService->replaceThumbnail($nodeRef,$thumbnailValue,$srcFile,$extension);

            if (!empty($file)) {
                unlink($sourceFile);
            }

            // construct $output
            $output = new stdClass();

            $node = $this->RegulatedNodeService->getByNodeRef($nodeRef,new NodePartials('#thumbnails-json'));
            $json = $node->getMetaValue('#thumbnails-json');
            if($json != null) {
                $thumbnails = JSONUtils::decode($json);

                foreach($thumbnails as $thmb) {
                    if ($thmb->value == $thumbnailValue) {
                        $output = $thmb;
                        break;
                    }
                }
            }

            $this->sendJSON($output);
        } catch(Exception $e) {
            $this->sendExceptionError($e);
        }
    }

    /**
     * Adds a thumbnail to media node.
     */
    public function addThumbnail()
    {
        try {
            $file = $this->Request->getParameter('File');
            if (! empty($file)) {
                $filetype = $this->Request->getParameter('Type');
                $files = $this->Request->getUploadedFiles();
                $params['_uploadedFiles'] = $files;
                $params['File'] = $file;

                list($sourceFile, $sourceFileName) = $this->MediaService->getSourceFile($params);
                list($width, $height) = getimagesize($sourceFile);
                $binary = fread(fopen($sourceFile, 'r'), filesize($sourceFile));
                $srcFile = 'data:image/'.$filetype.';base64,'.base64_encode($binary);
                $thumbnailValue = $width.'x'.$height;
            }
            else {
                $srcFile = $this->Request->getParameter('srcFile');
                $thumbnailValue = $this->Request->getRequiredParameter('thumbnailValue');
            }

            if($thumbnailValue == $this->imagesThumbnailCmsSize) {
                $this->sendError('-1','This thumbnail cannot be modified because it is reserved for CMS use.');
                return;
            }

            $nodeRef = $this->getNodeRef();
            $extension = $this->Request->getParameter('extension');
            $this->MediaService->addThumbnail($nodeRef,$thumbnailValue,$srcFile,$extension);

            if (!empty($file)) {
                unlink($sourceFile);
            }

            // construct $output
            $output = new stdClass();

            $node = $this->RegulatedNodeService->getByNodeRef($nodeRef,new NodePartials('#thumbnails-json'));
            $json = $node->getMetaValue('#thumbnails-json');
            if($json != null) {
                $thumbnails = JSONUtils::decode($json);

                foreach($thumbnails as $thmb) {
                    if ($thmb->value == $thumbnailValue) {
                        $output = $thmb;
                        break;
                    }
                }
            }

            $this->sendJSON($output);
        } catch(Exception $e) {
            $this->sendExceptionError($e);
        }
    }

    /**
     * Removes a thumbnail from a media node.
     */
    public function removeThumbnail()
    {
        $thumbnailValue = $this->Request->getRequiredParameter('thumbnailValue');

        if($thumbnailValue == $this->imagesThumbnailCmsSize) {
            $this->sendError('-1','This thumbnail cannot be removed because it is reserved for CMS use.');
            return;
        }

        try {
            $nodeRef = $this->getNodeRef();
            $this->MediaService->removeThumbnail($nodeRef,$thumbnailValue);
            $this->sendEmptyOK();
        } catch(Exception $e) {
            $this->sendExceptionError($e);
        }
    }

    /**
     * Uploads and extracts an archive, placing them in temporary nodes for handling.
     */
    public function uploadArchive()
    {
        $params = $this->Request->getParameters();
        $files = $this->Request->getUploadedFiles();

        try
        {
            $params['_uploadedFiles'] = $files;
            $nodes = $this->MediaService->uploadArchive($params);
            if (! is_array($nodes))
                $nodes = array($nodes);

            // build output
            $output = array('totalRecords' => count($nodes), 'nodes' => array());

            foreach($nodes as $node) {
                $c = $this->_buildNodeJSON($node,true,true);

                $output['nodes'][] = $c;
            }

            $this->sendJSON($output);
        }
        catch(Exception $e)
        {
            $this->sendExceptionError($e);
        }
    }

    /**
     * Fetches a specific media node.
     *
     * @param ElementSlug  _required_  e.g. image
     * @param NodeSlug  _required_  the Slug of the node to retrieve
     * @param Thumbnails _optional_  comma delimited list of thumbnail sizes to return e.g. "150,100x100" or "all"
     * @param Meta.select  _optional_  list of Meta fields to return as per NodeApiController
     * @param OutTags.select  _optional_  list of OutTags to retrieve as per NodeApiController
     * @param Depth _optional_ whether to include original/thumbnail tags (TBD)
     */
    public function get()
    {
        $noderef = $this->getNodeRef();

        $hasJsonThumbnails = $noderef->getElement()->hasAspect('mixin-json-thumbnails');

        $nodePartials = new NodePartials(
            $this->Request->getParameter('Meta_select'),
            $this->Request->getParameter('OutTags_select'),
            $this->Request->getParameter('InTags_select'));

        $nodePartials->increaseOutPartials('#original.fields');

        if($hasJsonThumbnails && StringUtils::strToBool($this->Request->getParameter('retrieveThumbnails')))
            $nodePartials->increaseMetaPartials('#thumbnails-json');

        $node = $this->RegulatedNodeService->getByNodeRef($noderef,$nodePartials);

        $c = $this->_buildNodeJSON($node, true, StringUtils::strToBool($this->Request->getParameter('retrieveThumbnails')));

        //todo: include metas
        //todo: include tags

        $this->sendJSON($c);
    }

    /**
     * Searches for nodes using specified critera.
     *
     * @param Elements.in _required_ e.g. 'image'
     *
     * @param MaxRows _optional_
     * @param Offset _optional_
     * @param Page _optional_

     * @param Title.like _optional_
     * @param Title.ieq _optional_
     * @param Title.eq _optional_
     * @param Title.firstChar _optional_
     * @param Status.isActive _optional_
     * @param Status.all _optional_
     * @param Status.eq _optional_

     * @param ActiveDate.before _optional_
     * @param ActiveDate.after _optional_
     * @param ActiveDate.start _optional_
     * @param ActiveDate.end _optional_

     * @param CreationDate.before _optional_
     * @param CreationDate.after _optional_
     * @param CreationDate.start _optional_
     * @param CreationDate.end _optional_
     *
     */
    public function findAll()
    {
        $dto = new NodeQuery();
        $this->buildLimitOffset($dto);
        $this->buildSorts($dto);
        $this->buildFilters($dto);

        $this->passthruParameter($dto, 'Elements.in');
        $this->passthruParameter($dto, 'Sites.in');
        $this->passthruParameter($dto, 'Slugs.in');

        $this->passthruParameter($dto, 'Meta.select');
        $this->passthruParameter($dto, 'OutTags.select');
        $this->passthruParameter($dto, 'InTags.select');
        $this->passthruParameter($dto, 'Sections.select');

        $this->passthruParameter($dto, 'Title.like');
        $this->passthruParameter($dto, 'Title.ieq');
        $this->passthruParameter($dto, 'Title.eq');
        $this->passthruParameter($dto, 'Title.firstChar');
        $this->passthruParameter($dto, 'Status.isActive');
        $this->passthruParameter($dto, 'Status.all');
        $this->passthruParameter($dto, 'Status.eq');
        $this->passthruParameter($dto, 'TreeID.childOf');
        $this->passthruParameter($dto, 'TreeID.eq');

        $this->passthruParameter($dto, 'ActiveDate.before');
        $this->passthruParameter($dto, 'ActiveDate.after');
        $this->passthruParameter($dto, 'ActiveDate.start');
        $this->passthruParameter($dto, 'ActiveDate.end');

        $this->passthruParameter($dto, 'CreationDate.before');
        $this->passthruParameter($dto, 'CreationDate.after');
        $this->passthruParameter($dto, 'CreationDate.start');
        $this->passthruParameter($dto, 'CreationDate.end');

        $this->passthruParameter($dto, 'OutTags.exist');
        $this->passthruParameter($dto, 'InTags.exist');
        $this->passthruParameter($dto, 'Meta.exist');
        $this->passthruParameter($dto, 'Sections.exist');

        foreach($this->Request->getParameters() as $name => $value)
        {
            if(strpos($name, '#') === 0)
                $dto->setParameter(str_replace('_','.', $name), $value);
        }

        //expand metas to include thumbnails json
        $metaSelect = $dto->getParameter('Meta.select');
        $dto->setParameter('Meta.select', (empty($metaSelect) ? "" : $metaSelect.",")."#thumbnails-json");

        //expand outtags to include original
        $outTagsSelect = $dto->getParameter('OutTags.select');
        $dto->setParameter('OutTags.select', (empty($outTagsSelect) ? "" : $outTagsSelect.",")."#original.fields");

        $dto->isRetrieveTotalRecords(true);

        if($this->Request->getParameter('OrderBy') != null) {
            $dto->setOrderBys(array());
            $dto->setOrderBy($this->Request->getParameter('OrderBy'));
        }

        $dto = $this->RegulatedNodeService->findAll($dto,true);

        $s = array('totalRecords' => $dto->getTotalRecords(), 'nodes' => array());

        $res = $dto->getResults();
        if ($res != null) {
            foreach($dto->getResults() as $node) {
                $c = $this->_buildNodeJSON($node,true,false);

                $s['nodes'][] = $c;
            }
        }

        $this->sendJSON($s);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // private methods

    protected function getNodeRef()
    {
        $noderef = $this->Request->getParameter('nodeRef');

        if($noderef == null) {
            $elementSlug = $this->Request->getParameter('ElementSlug');
            $nodeSlug = $this->Request->getParameter('NodeSlug');
        } else {
            if(($i = strpos($noderef,'#')) === FALSE) {
                return $this->NodeRefService->parseFromString($noderef);
            } else {
                return array($this->NodeRefService->parseFromString(substr($noderef,0,$i)),substr($noderef,$i));
            }
        }

        if(empty($elementSlug) && empty($nodeSlug))
            return null;

        $element = $this->ElementService->getBySlug($elementSlug);

        if($nodeSlug == '')
            $noderef = new NodeRef($element);
        else
            $noderef = new NodeRef($element,$nodeSlug);

        return $noderef;
    }

    /**
     * Sends data to client as JSON.
     *
     * @param mixed $data The data to send
     */
    protected function sendJSON($data)
    {
        // set the status to 200 - OK
        $this->Response->sendStatus(Response::SC_OK);

        //  set appropriate content-type
        $this->Response->addHeader('Content-Type', 'application/json; charset="'.$this->charset.'"');

        // convert to JSON & write out
        echo JSONUtils::encode($data);
    }

    /**
     * Used when operation succeeded, but no content to return.
     *
     * Simply sets the http status to 204 - no content.
     */
    protected function sendEmptyOK()
    {
        // just set the status to 204 - no content
        $this->Response->sendStatus(Response::SC_NO_CONTENT);
    }

    /**
     * Writes a standard JSON error response.
     *
     * @param $exception An Exception with error message
     */
    protected function sendExceptionError(Exception $exception)
    {
        $this->Logger->error($exception->getMessage());
        $this->sendError($exception->getCode(), $exception->getMessage());
    }

    /**
     * Writes a standard JSON error response.
     *
     * @param $code The error code
     * @param $message The error mmessage
     */
    protected function sendError($code, $message)
    {
        $response = new stdClass();
        $response->Errors = array();
        $e = new stdClass();
        $e->Code = $code;
        $e->Message = $message;
        $response->Errors[] = $e;

        $this->Response->sendStatus(Response::SC_BAD_REQUEST);

        // convert to JSON & write out
        die(JSONUtils::encode($response));
    }

    /**
     * Writes a standard JSON error response.
     *
     * @param array $errors The error info - $errors[]['code'], $errors[]['message']
     */
    protected function sendErrors($errors)
    {
        $response = new stdClass();
        $response->Errors = array();

        foreach($errors as $error)
        {
            $e = new stdClass();
            $e->Code = $error['code'];
            $e->Message = $error['message'];
            $response->Errors[] = $e;
        }

        $this->Response->sendStatus(Response::SC_BAD_REQUEST);

        // convert to JSON & write out
        die(JSONUtils::encode($response));
    }

    /**
     * Build Node JSON structure with thumbnail information.
     */
    protected function _buildNodeJSON(Node $node, $includeOriginal = false, $includeThumbnails = false) {
        $data = new stdClass();

        $data->slug = $node->Slug;
        $data->element = $node->Element->Slug;
        $data->title = $node->Title;
        $data->status = $node->Status;
        $data->activeDate = $node->ActiveDate;
        $data->recordLink = $node->RecordLink;
        $data->sortOrder = $node->SortOrder;

        if ($includeOriginal) {
            $nodeRef = $node->getNodeRef();
            if($nodeRef->getElement()->hasAspect('images') || $nodeRef->getElement()->hasAspect('temporary-zipped-media')) {
                // Build the original and thumbnail info as well
                foreach(array('url','size','width','height') as $f) {
                    $data->$f = $node->jump("#original.#$f");
                    if(is_numeric($data->$f))
                        $data->$f = intval($data->$f);
                }
            }
            else {
                // Include the URL for non image media
                $data->url = $node->jump("#original.#url");
            }
        }

        $json = $node->getMetaValue('#thumbnails-json');

        if($json != null) {
            $thumbnails = JSONUtils::decode($json);
            if ($includeThumbnails) {
                $data->thumbnails = $thumbnails;
                $data->thumbnailsPending = (array)$this->_getPendingThumbnails($node->getElement()->getSlug(),$thumbnails);
            }

            foreach($thumbnails as $thmb) {
                if($thmb->value == $this->imagesThumbnailCmsSize) {
                    $data->thumbnailUrl = $thmb->url;
                    break;
                }
            }
        }

        return $data;
    }

    protected function _getPendingThumbnails($elementSlug,$thumbnails) {
        $sizes = $this->imagesThumbnailCmsSize;
        if(is_string($this->thumbnailSizes)) {
            $sizes .= ','.$this->thumbnailSizes;
        } else if(is_array($this->thumbnailSizes)) {
            if(array_key_exists($elementSlug,$this->thumbnailSizes))
                $sizes .= ','.$this->thumbnailSizes[$elementSlug];
        } else
            throw new Exception("Invalid thumbnail sizes [{$elementSlug}]");

        $sizes = array_unique(StringUtils::smartSplit($sizes,','));

        $have = array();
        foreach ($thumbnails as $thumb) {
            $have[] = $thumb->value;
        }

        return array_values(array_diff($sizes, $have));
    }
}
