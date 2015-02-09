<?php
 /**
 * MediaService
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

class MediaService
{
    ////////////////////////////////////////////////////////////////////////////
    // fields

    protected $errors;

    protected $mediaOrganizeByDate;
    protected $mediaAllowCustomSubdirectories;
    protected $vendorCacheDirectory;
    protected $mediaRestrictedExtensions;
    protected $imagesThumbnailCmsSize;

    protected $workDir;

    ////////////////////////////////////////////////////////////////////////////
    // auto-wired setters

    /** @var ImageService */
    protected $ImageService;
    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    /** @var ImageFilterService */
    protected $imageFilterService;
    public function setImageFilterService(ImageFilterService $imageFilterService)
    {
        $this->imageFilterService = $imageFilterService;
    }

    /** @var FileService */
    protected $FileService;
    public function setFileService(FileService $FileService)
    {
        $this->FileService = $FileService;
    }

    /** @var NodeServiceInterface */
    protected $NodeService;
    public function setNodeService(NodeServiceInterface $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    /** @var RegulatedNodeService */
    protected $RegulatedNodeService;
    public function setRegulatedNodeService(RegulatedNodeService $RegulatedNodeService)
    {
        $this->RegulatedNodeService = $RegulatedNodeService;
    }

    /** @var ElementService */
    protected $ElementService;
    public function setElementService(ElementService $ElementService)
    {
        $this->ElementService = $ElementService;
    }

    /** @var DateFactory */
    protected $DateFactory;
    public function setDateFactory(DateFactory $DateFactory)
    {
        $this->DateFactory = $DateFactory;
    }

    /** @var NodeRefService */
    protected $NodeRefService;
    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }

    /** @var NodeBinder */
    protected $NodeBinder;
    public function setNodeBinder(NodeBinder $NodeBinder)
    {
        $this->NodeBinder = $NodeBinder;
    }

    /** @var NodeMapper */
    protected $NodeMapper;
    public function setNodeMapper(NodeMapper $NodeMapper)
    {
        $this->NodeMapper = $NodeMapper;
    }

    /** @var StorageFacilityFactory */
    protected $StorageFacilityFactory;
    public function setStorageFacilityFactory(StorageFacilityFactory $StorageFacilityFactory)
    {
        $this->StorageFacilityFactory = $StorageFacilityFactory;
    }

    /** @var HttpRequest */
    protected $HttpRequest;
    public function setHttpRequest(HttpRequest $HttpRequest)
    {
        $this->HttpRequest = $HttpRequest;
    }

    /** @var Request */
    protected $Request;
    public function setRequest(Request $Request)
    {
        $this->Request = $Request;
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

    /** @var Errors */
    public function setErrors(Errors $errors)
    {
        $this->errors = $errors;
    }

    public function setMediaOrganizeByDate($mediaOrganizeByDate)
    {
        $this->mediaOrganizeByDate = $mediaOrganizeByDate;
    }

    public function setMediaAllowCustomSubdirectories($mediaAllowCustomSubdirectories)
    {
        $this->mediaAllowCustomSubdirectories = $mediaAllowCustomSubdirectories;
    }

    public function setVendorCacheDirectory($vendorCacheDirectory)
    {
        $this->workDir = $vendorCacheDirectory;
    }

    public function setMediaRestrictedExtensions($mediaRestrictedExtensions)
    {
        $this->mediaRestrictedExtensions = $mediaRestrictedExtensions;
    }

    public function setImagesThumbnailCmsSize($imagesThumbnailCmsSize)
    {
        $this->imagesThumbnailCmsSize = $imagesThumbnailCmsSize;
    }

    ////////////////////////////////////////////////////////////////////////////
    // public methods

    /**
     * Applies filters to original and/or thumbnail files.
     *
     * @param array $params
     */
    public function applyFilters($params)
    {
        // fetch node with #thumbnails out tags
        $node = $this->getNode($params, '#original,#thumbnails'); // will spit error if not found

        if(empty($params['ApplyTo']))
            throw new MediaServiceException('ApplyTo is a required parameter');

        $applyTo = explode(',', $params['ApplyTo']);

        $parentElement = $node->getNodeRef()->getElement();

        // check the file node for specified original or thumbnail tags
        $tags = $node->getOutTags();
        foreach($tags as $tag)
        {
            $role = $tag->getTagRole();
            if(($role == 'original' && in_array('original', $applyTo)
                 || ($role == 'thumbnails' && in_array($tag->getTagValue(), $applyTo))))
            {
                $fileNode = $tag->getTagLinkNode();
                // get the source file (will spit if cant do)
                list($sourceFile, $sourceFileName) = $this->getSourceFileFromNode($fileNode);
                try
                {
                    // apply any required filters
                    $sourceFile = $this->_applyFilters($params, $sourceFile);
                    // now replace the file
                    $this->replaceNodeFile($fileNode, $parentElement, $sourceFile, $sourceFileName);
                    // clean up
                    @unlink($sourceFile);
                }
                catch(Exception $e)
                {
                    // clean up
                    @unlink($sourceFile);
                    throw $e;
                }
            }
        }
    }


    /**
     * Removes an entire media node including all original and thumbnail files.
     *
     * @param array $params
     */
    public function removeMedia($params)
    {
        // get the node ref
        $nodeRef = $this->getNodeRef($params);

        // no need to delete tagged file nodes here (e.g. #original/#thumbnails)
        // since event handlers will clean those up automatically

        // ***
		// TODO:
		// There is a problem if two nodes share one thumbnail file because
		// if one media node is deleted, the other loses it's shared thumbnail
		// ***

        // and delete the media node
        $this->RegulatedNodeService->delete($nodeRef);

    }

    /**
     * Removes a thumbnail from a media node.
     *
     * @param NodeRef $nodeRef
     * @param $thumbnailValue
     */
    public function removeThumbnail(NodeRef $nodeRef, $thumbnailValue)
    {
        $thumbnailPartial = "#thumbnails=".$thumbnailValue;
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('',$thumbnailPartial));

        $thumbs = $node->getOutTags("#thumbnails");

        foreach($thumbs as $tag) {
            /** @var Tag $tag */
            if($tag->TagValue == $thumbnailValue) {
                $this->NodeService->delete($tag->TagLinkNodeRef);
                $this->NodeService->removeOutTag($nodeRef,$tag);
                return;
            }
        }
    }

    /**
     * Adds a new thumbnail for the media node.
     *
     * srcFile can be:
     * - array of filters to apply to the original image
     * - a url
     * - a base64 encoded data string of the image to use
     *
     * @throws MediaServiceException
     * @param NodeRef $nodeRef
     * @param $thumbnailValue
     * @param $srcFile
     * @param $extension
     */
    public function addThumbnail(NodeRef $nodeRef,$thumbnailValue,$srcFile,$extension)
    {
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('','#thumbnails'));

        $thumbs = $node->getOutTags("#thumbnails");

        foreach($thumbs as $tag) {
            if ($tag->TagValue == $thumbnailValue)
                throw new MediaServiceException('Thumbnail size '.$thumbnailValue.' already exists');
        }

        $fileNode = $this->_createFileNode($node,$thumbnailValue,$srcFile,$extension);

        // build the new out tag
        $tag = new Tag($fileNode->getNodeRef(), '', '#thumbnails', $thumbnailValue, $thumbnailValue);
        // and add tag
        $this->RegulatedNodeService->addOutTag($node->getNodeRef(), $tag);
    }

    /**
     * Replaces an existing thumbnail on a media node.
     *
     * srcFile can be:
     * - array of filters to apply to the original image
     * - a url
     * - a base64 encoded data string of the image to use
     *
     * @throws MediaServiceException
     * @param $nodeRef
     * @param $thumbnailValue
     * @param $srcFile
     * @param $extension
     */
    public function replaceThumbnail($nodeRef,$thumbnailValue,$srcFile,$extension)
    {
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('','#thumbnails'));

        $thumbs = $node->getOutTags("#thumbnails");

        $thumbFound = false;
        foreach($thumbs as $tag) {
            if ($tag->TagValue == $thumbnailValue) {
                $thumbFound = true;

                $fileNode = $this->_createFileNode($node,$thumbnailValue,$srcFile,$extension);

                // Delete the existing file node (and thus its tag)
                if($this->NodeService->refExists($tag->TagLinkNodeRef)) {
                    $this->NodeService->delete($tag->TagLinkNodeRef);
                }

                // build the new out tag
                $tag = new Tag($fileNode->getNodeRef(), '', '#thumbnails', $thumbnailValue, $thumbnailValue);
                // and add tag
                $this->RegulatedNodeService->addOutTag($node->getNodeRef(), $tag);

                break;
            }
        }
        if (! $thumbFound)
            throw new MediaServiceException('Thumbnail size '.$thumbnailValue.' does not exist');
    }

    /**
     * Utility method that adds a new thumbnail to a media node.
     *
     * srcFile can be:
     * - array of filters to apply to the original image
     * - a url
     * - a base64 encoded data string of the image to use
     *
     * @throws Exception|MediaServiceException
     * @param $node
     * @param $thumbnailValue
     * @param $srcFile
     * @param $extension
     */
    public function _createFileNode(Node $node,$thumbnailValue,$srcFile,$extension)
    {
        $fileNode = null;

        try {
            // Filters (browsers which do not support FileReader based uploads)
            if (!is_array($srcFile) && $json = json_decode($srcFile,true)) {
                list($sourceFile, $sourceFileName) = $this->getSourceFile(array('SourceNodeRef' => $node->getNodeRef()));
                $sourceFile = $this->_applyFilters($json, $sourceFile);
            }
            // Filters (everyone else)
            elseif (is_array($srcFile)) {
                list($sourceFile, $sourceFileName) = $this->getSourceFile(array('SourceNodeRef' => $node->getNodeRef()));
                $sourceFile = $this->_applyFilters($srcFile, $sourceFile);
            }
            // Data string
            elseif (preg_match('/^data:/', $srcFile)) {
                if (empty($extension))
                    throw new MediaServiceException('The file extension is required for this thumbnail');

                list($sourceFile, $sourceFileName) = $this->getSourceFile(array(
                    'DataString' => $srcFile,
                    'DataFileName' => $node->getSlug().'-'.$thumbnailValue.'.'.$extension
                ));
            }
            // Url
            elseif (preg_match('/^http/', $srcFile)) {
                list($sourceFile, $sourceFileName) = $this->getSourceFile(array('Url' => $srcFile));
            }
            else {
                throw new MediaServiceException('Source data is not valid');
            }

            // add the new file node
            $parentElement = $node->getNodeRef()->getElement();
            $fileNode = $this->addFileNode($parentElement, $sourceFile, $sourceFileName);

            // we're done so delete source file
            @unlink($sourceFile);

            return $fileNode;
        }
        catch(Exception $e)
        {
            // clean up
            if(!empty($fileNode) && $this->NodeService->refExists($fileNode->getNodeRef())) {
                $this->NodeService->delete($fileNode->getNodeRef());
            }
            @unlink($sourceFile);
            throw $e;
        }
    }

    /**
     * Replaces the file associated with the original tag.
     *
     * @param array $params
     */
    public function replaceOriginal($params)
    {
        try
        {
            // fetch node with #original out tag
            $node = $this->getNode($params, '#original'); // will spit error if not found

            // get the source file (will spit if cant do)
            list($sourceFile, $sourceFileName) = $this->getSourceFile($params);

            // apply any required filters
            $sourceFile = $this->_applyFilters($params, $sourceFile);

            // get the file node for original
            $tag = $node->getOutTag('#original');
            if(!$tag)
                throw new MediaServiceException("Node '{$node->getNodeRef()->getRefUrl()}' has no #original tag");

            $fileNode = $tag->getTagLinkNode();

            $parentElement = $node->getNodeRef()->getElement();

            // now replace the file & update file node metas
            $this->replaceNodeFile($fileNode, $parentElement, $sourceFile, $sourceFileName);

            // update node
            $this->RegulatedNodeService->edit($node);

            // we're done so delete source file
            @unlink($sourceFile);
        }
        catch(Exception $e)
        {
            // clean up
            @unlink($sourceFile);
            throw $e;
        }
    }

    /**
     * Add a node with fields specified in params.
     */
    public function addOriginal($params)
    {
        try
        {
            // fetch node with #original out tag
            $node = $this->getNode($params); // will spit error if not found

            // get the source file (will spit if cant do)
            list($sourceFile, $sourceFileName) = $this->getSourceFile($params);

            // apply any required filters
            if(!isset($params['File'] ) && !isset($params['Url']))
                $sourceFile = $this->_applyFilters($params, $sourceFile);

            // add the new file node
            $parentElement = $node->getNodeRef()->getElement();
            $fileNode = $this->addFileNode($parentElement, $sourceFile, $sourceFileName);
            // build the new out tag
            $tag = new Tag($fileNode->getNodeRef(), '', '#original');
            // and add tag
            $this->RegulatedNodeService->addOutTag($node->getNodeRef(), $tag);

            // we're done so delete source file
            @unlink($sourceFile);
        }
        catch(Exception $e)
        {
            // clean up
            @unlink($sourceFile);
            throw $e;
        }
    }

    /**
     * Updates a node with fields specified in params.
     *
     * @param array $params The user-supplied parameters/fields
     * @throws MediaServiceException
     * @throws ValidationException
     */
    public function edit($params)
    {
        $node = $this->getNode($params); // will spit error if not found

        // set any persistent fields
        $this->NodeBinder->bindPersistentFields($node, $this->getErrors(), $params, $params);
        $this->NodeBinder->fireEditBindEvents($node, $this->getErrors(), $params, $params);
        // throw any validation errors
        $this->getErrors()->throwOnError();

        $nodePartials = new NodePartials();

        // add any meta fields
        foreach($params as $name => $value)
        {
            if(substr($name, 0, 1) == '#')
            {
                $node->setMeta($name, $value);
                $nodePartials->increaseMetaPartials($name);
            }
        }
        // add any out tags
        $outTagParam = !empty($params['AddOutTags']) ? $params['AddOutTags'] : null;
        if($outTagParam)
        {
            $outTags = $this->buildTags($outTagParam);
            $node->addOutTags($outTags);
            foreach($outTags as $tag)
            {
                $role = $tag->getTagRole();
                $val = $tag->getTagValue();
                $nodePartials->increaseOutPartials($role.'='.$val);
            }
        }
        // add any in tags
        $inTagParam = !empty($params['AddInTags']) ? $params['AddInTags'] : null;
        if($inTagParam)
        {
            $inTags = $this->buildTags($inTagParam);
            $node->addInTags($inTags);
            foreach($inTags as $tag)
            {
                $role = $tag->getTagRole();
                $val = $tag->getTagValue();
                $nodePartials->increaseInPartials($role.'='.$val);
            }
        }
        // set node partials to specify exactly what's added/updated
        $node->setNodePartials($nodePartials);
        // do the update
        $this->RegulatedNodeService->edit($node);
    }

    /**
     * Clones a media node including cloning any file out tags.
     */
    public function cloneMedia($params)
    {
        // get node with all tags
        $node = $this->getNode($params, 'all'); // will spit error if not found
        $nodeRef = $node->getNodeRef();
        // create a new node
        $newSlug = !empty($params['NewSlug']) ? $params['NewSlug'] : null;
        if($newSlug != null)
        {
            $newNodeRef = new NodeRef($nodeRef->getElement(), $newSlug);
            // if specifc slug required, make sure it does'nt already exist
            if($this->NodeService->refExists($newNodeRef))
            {
                // if specified - delete existing
                if(!empty($params['DeleteExisting']))
                    $this->RegulatedNodeService->delete($newNodeRef);
                else
                    throw new MediaServiceException("Media node with ref '{$newNodeRef->getRefURL()}' already exists");
            }
        }
        else
        {
            $newNodeRef = $this->NodeService->generateUniqueNodeRef($node->getNodeRef(), $node->Title);
        }
        $newNode = new Node($newNodeRef);
        $newNode->setNodePartials(new NodePartials('all', 'all', 'all'));
        // set the new title
        $newNode->Title = !empty($params['NewTitle']) ? $params['NewTitle'] : $node->Title;
        // copy other permanent fields
        $newNode->ActiveDate = $node->ActiveDate;
        $newNode->Status = $node->Status;
        // clone all the file out tags
        $outTags = $node->getOutTags();
        $newOutTags = array();
        foreach($outTags as $tag)
        {
            if($tag->getTagElement() == 'file')
            {
                $tnode = $this->RegulatedNodeService->getByNodeRef($tag->getTagLinkNode()->getNodeRef(), new NodePartials('#parent-element'));
                $fileNode = $this->cloneFileNode($tnode);
                $newTag = new Tag($fileNode->getNodeRef(), '', $tag->getTagRole(), $tag->getTagValue(), $tag->getTagValueDisplay());
                $newOutTags[] = $newTag;
            }
            else
                $newOutTags[] = $tag;
        }
        $newNode->setOutTags($newOutTags);
        // copy all in tags
        $newNode->setInTags($node->getInTags());
        // ...and metas
        $newNode->setMetas($node->getMetas());
        // and add the new node
        $this->RegulatedNodeService->add($newNode);
    }

    /**
     * QuickAdds a media node.
     *
     * @param $params
     * @return Node $node The new media node
     */
    public function quickAdd($params)
    {
        $title = $params['Title'];
        $slug = SlugUtils::createSlug($title);

        $nodeRef = new NodeRef(
            $this->ElementService->getBySlug($params['ElementSlug']),
            $slug
        );
        $nodeRef = $this->NodeService->generateUniqueNodeRef($nodeRef, $title);

        $params['Slug'] = $nodeRef->getSlug();
        $rawParams = $this->Request->getRawParameters();

        // Clean the param keys removing uid
        foreach ($params as $key => $value) {
            if (preg_match('/^#/',$key)) {
                $nkey = preg_replace('/-uid\d+$/','',$key);
                if (strcmp($nkey,$key) == 0)
                    continue;
                $params[$nkey] = $params[$key];
                $rawParams[$nkey] = $rawParams[$key];
                unset($params[$key]);
                unset($rawParams[$key]);
            }
        }
        foreach (array('In','Out') as $dir) {
            // Clean the _partials
            if (!empty($params[$dir.'Tags_partials'])) {
                $newPartials = array();
                $partials = StringUtils::smartSplit($params[$dir.'Tags_partials'], ',', '"', '\\"');
                foreach ($partials as $p) {
                    $newPartials[] = preg_replace('/-uid\d+$/','',$p);
                }
                $params[$dir.'Tags_partials'] = implode(',',$newPartials);
                $rawParams[$dir.'Tags_partials'] = implode(',',$newPartials);
            }
            // Clean the tags
            if (isset($params[$dir.'Tags']) && is_array($params[$dir.'Tags'])) {
                foreach ($params[$dir.'Tags'] as $key => $value) {
                    $nkey = preg_replace('/-uid\d+$/','',$key);
                    if (strcmp($nkey,$key) == 0)
                        continue;
                    $params[$dir.'Tags'][$nkey] = $params[$dir.'Tags'][$key];
                    $rawParams[$dir.'Tags'][$nkey] = $rawParams[$dir.'Tags'][$key];
                    unset($params[$dir.'Tags'][$key]);
                    unset($rawParams[$dir.'Tags'][$key]);
                }
            }
        }

        // create node
        $node = new Node($nodeRef);
        $this->NodeMapper->defaultsOnNode($node);

        //bind posted params to form backing object
        $this->NodeBinder->bindPersistentFields($node, $this->getErrors(), $params, $rawParams);
        $this->NodeBinder->fireAddBindEvents($node, $this->getErrors(), $params, $rawParams);

        $this->getErrors()->throwOnError();

        $this->RegulatedNodeService->add($node);

        return $this->RegulatedNodeService->getByNodeRef($node->getNodeRef(),new NodePartials('all','#original.fields'));
    }

    /**
     * Handles uploads of media filled archives.  Two stage process:
     * 1. Extract the archive and create temporary-zipped-media nodes to be further populated.
     * 2. Convert the temporary-zipped-media nodes into actual media nodes with additional information provided by the user.
     *
     * @param $params
     * @return array Array of created nodes
     */
    public function uploadArchive($params)
    {
        if (! empty($params['Store']))
            return $this->_storeTemporary($params);
        else
            return $this->_extractArchive($params);
    }

    /**
     * Extracts files from the archive and stores the media as temporary-zipped-media nodes.
     *
     * @throws Exception
     * @param $params
     * @return array Array of created nodes
     */
    protected function _extractArchive($params)
    {
        $nodes = array();

        $workdir = FileSystemUtils::createWorkingDirectory();

        try
        {
            list($sourceFile, $sourceFileName) = $this->getSourceFile($params);

            $zip = zip_open($sourceFile);
            if (is_resource($zip)) {
                while ($zip_entry = zip_read($zip)) {

                    $entryFileName = basename(zip_entry_name($zip_entry));
                    $entryFile = rtrim($workdir,'/').'/'.$entryFileName;

                    if (preg_match('/^\./', $entryFileName))
                        continue;

                    $path = pathinfo($entryFile);
                    if (empty($path['extension']))
                        continue;

                    try
                    {
                        // Create the file
                        if (zip_entry_open($zip, $zip_entry ,'r')) {
                            if ($fd = @fopen($entryFile, 'w+')) {
                                fwrite($fd, zip_entry_read($zip_entry, zip_entry_filesize($zip_entry)));
                                fclose($fd);

                                $nodeRef = new NodeRef(
                                    $this->NodeRefService->oneFromAspect('@temporary-zipped-media')->getElement(),
                                    SlugUtils::createSlug($entryFileName)
                                );
                                $nodeRef = $this->NodeService->generateUniqueNodeRef($nodeRef, null, true);


                                // create node
                                $node = new Node($nodeRef);
                                $this->NodeMapper->defaultsOnNode($node);

                                if ($node != null) {
                                    $node->Title = $entryFileName;
                                    $node->Slug = SlugUtils::createSlug($entryFileName);

                                    $this->getErrors()->throwOnError();

                                    $this->RegulatedNodeService->quickAdd($node);

                                    $node = $this->RegulatedNodeService->getByNodeRef($node->getNodeRef(), new NodePartials());

                                    // add the original media
                                    $file_params = $params;
                                    $file_params['File'] = $entryFileName;
                                    $file_params['NodeSlug'] = $node->Slug;
                                    $file_params['ElementSlug'] = 'temporary-zipped-media';
                                    $file_params['_uploadedFiles']['file'] = new UploadedFile($entryFileName, $entryFile, zip_entry_filesize($zip_entry), FileSystemUtils::getMimetype($path['extension']), 0);
                                    $this->addOriginal($file_params);

                                    $this->_buildCmsThumbnail($node);

                                    $node = $this->RegulatedNodeService->getByNodeRef($node->getNodeRef(), new NodePartials('all','#original.fields'));
                                    $nodes[] = $node;

                                    @unlink($entryFile);
                                }
                            }
                            zip_entry_close($zip_entry);
                        }
                    }
                    catch(Exception $e)
                    {
                        @unlink($entryFile);
                        throw $e;
                    }
                }
                zip_close($zip);
            }
            else {
                throw new Exception($this->_zipFileErrMsg($zip));
            }
        }
        catch(Exception $e)
        {
            // clean up
            //@unlink($sourceFile);
            throw $e;
        }

        return $nodes;
    }

    /**
     * Store the temporary-zipped-media nodes as proper media nodes.
     *
     * @throws MediaServiceException
     * @param $params
     * @return
     */
    protected function _storeTemporary($params)
    {
        if(empty($params['NodeRef']))
            throw new MediaServiceException('NodeRef must be specified');

        list($element,$slug) = explode(':',$params['NodeRef']);
        $tmpParams = array(
            'ElementSlug' => $element,
            'NodeSlug' => $slug
        );

        // get node with all tags
        $node = $this->getNode($tmpParams, 'all'); // will spit error if not found
        $nodeTitle = $node->Title;
        $nodeSlug = $node->Slug;

        // if a custom title is specified, override existing title & slug
        if(!empty($params['Title']) && $params['Title'] !== $node->Title) {
            $nodeTitle = $params['Title'];
            $nodeSlug = SlugUtils::createSlug($nodeTitle);
        }

        $nodeRef = new NodeRef(
            $this->ElementService->getBySlug($params['ElementSlug']),
            $nodeSlug
        );
        $nodeRef = $this->NodeService->generateUniqueNodeRef($nodeRef, $nodeTitle);

        $params['Slug'] = $nodeRef->getSlug();
        $rawParams = $this->Request->getRawParameters();

        // Clean the param keys removing uid
        foreach ($params as $key => $value) {
            if (preg_match('/^#/',$key)) {
                $nkey = preg_replace('/-uid\d+$/','',$key);
                if (strcmp($nkey,$key) == 0)
                    continue;
                $params[$nkey] = $params[$key];
                $rawParams[$nkey] = $rawParams[$key];
                unset($params[$key]);
                unset($rawParams[$key]);
            }
        }
        foreach (array('In','Out') as $dir) {
            // Clean the _partials
            if (!empty($params[$dir.'Tags_partials'])) {
                $newPartials = array();
                $partials = StringUtils::smartSplit($params[$dir.'Tags_partials'], ',', '"', '\\"');
                foreach ($partials as $p) {
                    $newPartials[] = preg_replace('/-uid\d+$/','',$p);
                }
                $params[$dir.'Tags_partials'] = implode(',',$newPartials);
                $rawParams[$dir.'Tags_partials'] = implode(',',$newPartials);
            }
            // Clean the tags
            if (isset($params[$dir.'Tags']) && is_array($params[$dir.'Tags'])) {
                foreach ($params[$dir.'Tags'] as $key => $value) {
                    $nkey = preg_replace('/-uid\d+$/','',$key);
                    if (strcmp($nkey,$key) == 0)
                        continue;
                    $params[$dir.'Tags'][$nkey] = $params[$dir.'Tags'][$key];
                    $rawParams[$dir.'Tags'][$nkey] = $rawParams[$dir.'Tags'][$key];
                    unset($params[$dir.'Tags'][$key]);
                    unset($rawParams[$dir.'Tags'][$key]);
                }
            }
        }

        // create node
        $newNode = new Node($nodeRef);
        $this->NodeMapper->defaultsOnNode($newNode);

        //bind posted params to form backing object
        $this->NodeBinder->bindPersistentFields($newNode, $this->getErrors(), $params, $rawParams);
        $this->NodeBinder->fireAddBindEvents($newNode, $this->getErrors(), $params, $rawParams);

        $this->getErrors()->throwOnError();

        $newNode->Title = $nodeTitle;
        // copy other permanent fields
        $newNode->ActiveDate = $node->ActiveDate;
        $newNode->Status = $node->Status;
        // clone all the file out tags
        $outTags = $node->getOutTags();
        $newOutTags = array();
        foreach($outTags as $tag)
        {
            if($tag->getTagElement() == 'file')
            {
                $tnode = $this->RegulatedNodeService->getByNodeRef($tag->getTagLinkNode()->getNodeRef(), new NodePartials('#parent-element'));
                $fileNode = $this->cloneFileNode($tnode,$newNode->getElement());
                $newTag = new Tag($fileNode->getNodeRef(), '', $tag->getTagRole(), $tag->getTagValue(), $tag->getTagValueDisplay());
                $newOutTags[] = $newTag;
            }
            else
                $newOutTags[] = $tag;
        }
        $newNode->addOutTags($newOutTags);
        // copy all in tags
        $newNode->addInTags($node->getInTags());

        // and add the new node
        $newNode = $this->RegulatedNodeService->add($newNode);
        // then remove the temporary node
        $this->RegulatedNodeService->delete($node->getNodeRef());

        // commit so the node is ready for the worker
        $this->TransactionManager->commit()->begin();

        //-----------
        // Rebuild thumbnails asynchronously
        $workerParams = array(
            'nodeRef' => ''.$newNode->getNodeRef(),
            'forceRebuildExisting' => false
        );
        $this->GearmanService->doBackgroundJob('ImagesWorker','rebuildThumbnails',$workerParams,'high');

        return $this->RegulatedNodeService->getByNodeRef($newNode->getNodeRef(), new NodePartials('all','#original.#url,#original.#width,#original.#height,#original.#size,#thumbnails=150.#url,#thumbnails=150.#size,#thumbnails=150.#height,#thumbnails=150.#width'));
    }

    /**
     * Return true if $name is a valid method that can be called by both ApiController and gearman Workers.
     *
     * @param string $name The name of the method to check
     * @return boolean True if OK
     */
    public function isMethodValid($name)
    {
        $validMethods = array(
            'edit',
            'addOriginal',
            'replaceOriginal',
            'replaceThumbnail',
            'addThumbnail',
            'removeThumbnail',
            'removeMedia',
            'applyFilters',
            'cloneMedia'
        );

        return in_array($name, $validMethods);
    }

    ////////////////////////////////////////////////////////////////////////////
    // private methods

    /**
     * Builds a set of Tags based on specified string.
     *
     * Format:
     * $tagParam = "element:slug1,#role1,value1,display-value1;element:slug2,#role2,value2,display-value2"
     *
     * @param string $tagParam
     * @throws MediaServiceException
     * @return array Array of parsed tags
     */
    protected function buildTags($tagParam)
    {
        if(empty($tagParam))
            return null;    // nothing to do

        $tags = array();

        // individual defs are seperated by ';'
        $tagDefs = explode(';', $tagParam);
        // iterate through
        foreach($tagDefs as $tagDef)
        {
            $aTagDef = explode(',', $tagDef);

            if(count($aTagDef) < 2)
                throw new MediaServiceException("Invalid Tag parameter: '{$tagDef}'");

            $nodeRef = $this->getNodeRef($aTagDef[0]);
            $role = $aTagDef[1];

            $tagValue = null;
            $tagDisplayValue = null;

            if(count($aTagDef) > 2)
                $tagValue = $aTagDef[2];

            if(count($aTagDef) > 3)
                $tagDisplayValue = $aTagDef[3];

            $tags[] = new Tag($nodeRef, '', $role, $tagValue, $tagDisplayValue);
        }
        return $tags;
    }

    /**
     * Applies one or more ImageFilters if filterInfo specified in $params.
     *
     * @param array $params The array of user params
     * @param string $sourceFile The full path of source file to apply filters to
     * @return string The full path of the resultant file
     */
    protected function _applyFilters($filters, $sourceFile)
    {
        $filters = $this->_sanitizeFilterProperties($filters);

        return $this->imageFilterService->applyFilters($filters, $sourceFile);
    }

    /**
     * Generates an array of input files from uploaded files, urls or node refs.
     *
     * @param array $filterInfo A valid filterInfo array
     * @param array $uploadedFiles A list of uploade files
     * @return array An array of files or null if none found
     */
    protected function fetchFilterInputFiles(&$filterInfo, $uploadedFiles)
    {
        $inputFiles = array();
        $indexedName = '_image-';
        $imageIndex = 0;
        $fIndex = 0;
        foreach($filterInfo as $fo)
        {
            $options = !empty($fo['options']) ? $fo['options'] : array();
            foreach($options as $opName => $value)
            {
                if($opName == 'image')
                {
                    $imageName = $value;
                    if(substr($imageName, 0, 7) == 'http://'
                    || substr($imageName, 0, 8) == 'https://'
                    || substr($imageName, 0, 6) == 'ftp://')
                    {
                        // fetch from url
                        $ops = array('Url' => $imageName);
                        list($inFile, $inFileName) = $this->getSourceFile($ops);
                        // change value in filterInfo
                        $iname = $indexedName.$imageIndex++;
                        $filterInfo[$fIndex]['options']['image'] = $iname;
                        $inputFiles[$iname] = $inFile;
                    }
                    else if(substr($imageName, 0, 7) == 'node://')
                    {
                       // fetch from another node
                        $ops = array('SourceNodeRef' => substr($imageName, 7));
                        list($inFile, $inFileName) = $this->getSourceFile($ops);
                        // change value in filterInfo
                        $iname = $indexedName.$imageIndex++;
                        $filterInfo[$fIndex]['options']['image'] = $iname;
                        $inputFiles[$iname] = $inFile;
                    }
                    else
                    {
                        // assume uploaded
                        foreach($uploadedFiles as $uploadFile)
                        {
                            $name = $uploadFile->getName();
                            if($name == $imageName)
                            {
                                $inputFiles[$name] = $uploadFile->getTemporaryName();
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            ++$fIndex;
        }
        return count($inputFiles) > 0 ? $inputFiles : null;
    }

    /**
     * Replaces the file associated with the file node then updates the node.
     *
     * @param Node $fileNode
     * @param Element $parentElement
     * @param string $newFile Full path to the new file
     * @param string $newFileName the new desired filename
     * @return Node
     */
    protected function replaceNodeFile(Node $fileNode, Element $parentElement, $newFile, $newFileName)
    {
        // get storage facility
        $fileElement = $fileNode->getNodeRef()->getElement();
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($fileElement);

        $oldId = $fileNode->Title;

        // add the new file
        $newId = $storageFacility->findUniqueFileID($sfParams, $this->buildFilename($newFileName));
        $file = new StorageFacilityFile($newId, $newFile);
        $file = $storageFacility->putFile($sfParams, $file);

        // set the new id as title
        $fileNode->Title = $file->getID();

        // get metrics
        list($width, $height) = ImageUtils::getImageDimensions($newFile);
        // and mime-type
        $mimetype = FileSystemUtils::getMimetype($file->getExtension());

        // update the meta fields
        $fileNode->setMeta('#url',$file->getURL());
        $fileNode->setMeta('#mimetype',$mimetype);
        $fileNode->setMeta('#size',filesize($newFile));
        $fileNode->setMeta('#width',$width);
        $fileNode->setMeta('#height',$height);
        $fileNode->setMeta('#parent-element', $parentElement->Slug);
        // do the update
        $this->RegulatedNodeService->edit($fileNode);

        // if different ID, we need to remove old file,
        // but first make sure new record is committed
        if($oldId != $newId)
        {
            // force commit changes
            $this->TransactionManager->commit()->begin();
            // delete existing file
            $storageFacility->deleteFile($sfParams, $oldId);
        }

        return $fileNode;
    }

    /**
     * Clones a file node with a copy of the file.
     *
     * @param Node $fileNode The node/file to clone
     * @param Node $parentElement If file is to be cloned for a different parent element, pass it in
     * @throws Exception
     * @return Node The cloned node
     */
    protected function cloneFileNode($fileNode,$parentElement = null)
    {
        // get the actual file
        list($sourceFile, $sourceFilename) = $this->getSourceFileFromNode($fileNode);

        try
        {
            if (!$parentElement)
                $parentElement = $fileNode->getMetaValue('#parent-element');
            return $this->addFileNode($parentElement, $sourceFile, $sourceFilename);
        }
        catch(Exception $e)
        {
            // clean up
            @unlink($sourceFile);
            throw $e;
        }
    }

    /**
     * Add a new file node and adds the associated file.
     *
     * @param Element|string $parentElement
     * @param string $newFile Full path to the new file
     * @param string $newFileName the new disired filename
     * @return Node
     */
    public function addFileNode($parentElement, $newFile, $newFileName)
    {
        // get the file element
        $element = $this->ElementService->oneFromAspect('@files');
        // get storage facility
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        // add the new file
        $newId = $storageFacility->findUniqueFileID($sfParams, $this->buildFilename($newFileName));
        $file = new StorageFacilityFile($newId, $newFile);
        $file = $storageFacility->putFile($sfParams, $file);

        //create the node
        $nodeRef = new NodeRef($element);
        $slug = SlugUtils::createSlug($newId);
        $nodeRef = $this->NodeService->generateUniqueNodeRef($nodeRef, $slug);
        $fileNode = new Node($nodeRef);

        // set the new id as title
        $fileNode->Title = $newId;
        // set permenant fields
        $fileNode->ActiveDate = $this->DateFactory->newStorageDate();
        $fileNode->Status = 'draft';

        // get metrics
        list($width, $height) = ImageUtils::getImageDimensions($newFile);
        // and mime-type
        $mimetype = FileSystemUtils::getMimetype($file->getExtension());

        // add the meta fields
        $fileNode->setMeta('#url',$file->getURL());
        $fileNode->setMeta('#mimetype',$mimetype);
        $fileNode->setMeta('#size',filesize($newFile));
        $fileNode->setMeta('#width',$width);
        $fileNode->setMeta('#height',$height);
        $fileNode->setMeta('#parent-element', $parentElement instanceof Element ? $parentElement->Slug : $parentElement);
        // do the add
        $this->RegulatedNodeService->add($fileNode);  //add the node

        return $fileNode;
    }
    /**
     * Creates a filename from title, prefixed with date if required.
     *
     * @param string The title to use e.g. IMG-1234.jpg
     * @return string The filename
     */
    protected function buildFilename($title)
    {
        $ext = pathinfo($title, PATHINFO_EXTENSION);
        $filename = str_replace('.'.$ext, '', $title);

        $datePrefix = '/';
        if($this->mediaOrganizeByDate)
        {
            $now = $this->DateFactory->newStorageDate();
            $datePrefix = $now->format('/Y/m/d/');
        }

        return $datePrefix.SlugUtils::createSlug($filename).'.'.strtolower($ext);
    }

    /**
     * Get storage facility from Element.
     *
     * @param Element $element
     * @return [storageFacility], [sfParams]
     */
    protected function deriveStorageFacility($element)
    {
        if(!($element instanceof Element))
            $element = $this->ElementService->getBySlug($element);

        $site = $element->getAnchoredSite();

        if($element->hasStorageFacilityInfo())
        {
            $sfInfo = $element->getStorageFacilityInfo('media');
        }
        else
        {
            $sfInfo = $site->getStorageFacilityInfo('media');
        }

        $sf = $this->StorageFacilityFactory->build($sfInfo);
        $sfParams = $this->StorageFacilityFactory->resolveParams($sfInfo);

        return array($sf, $sfParams);
    }

    /**
     * Fetches a node using ElementSlug and NodeSlug in params.
     *
     * @param array $params
     * @param string $outTags Optional list of OutTags
     * @param boolean $spitIfNotFound If true (default) throw error if not found
     * @throws MediaServiceException
     * @return Node
     */
    protected function getNode($params, $outTags = null, $spitIfNotFound = true)
    {
        // build the NodeRef
        $nodeRef = $this->getNodeRef($params);
        return $this->getNodeByRef($nodeRef, $outTags, $spitIfNotFound);
    }

    /**
     * Get Node using specified NodeRef.
     *
     * @param NodeRef $nodeRef
     * @param string $outTags Optional list of OutTags
     * @param boolean $spitIfNotFound If true (default) throw error if not found
     * @throws MediaServiceException
     * @return Node
     */
    protected function getNodeByRef(NodeRef $nodeRef, $outTags = null, $spitIfNotFound = true)
    {
        // speficy out tags if needed
        $nodePartials = null;
        if(!empty($outTags))
        {
            $nodePartials = new NodePartials(null, $outTags);
        }
        // get the node
        $node = $this->RegulatedNodeService->getByNodeRef($nodeRef, $nodePartials);
        // check exists
        if(!$node && $spitIfNotFound)
            throw new MediaServiceException("Node '{$nodeRef->getRefUrl()}' was not found");

        return $node;
    }

    /**
     * Gets the local file from either File, Url, SourceRefNode or DataString params.
     *
     * @param array $params The user supplied parameters
     * @throws MediaServiceException if unable to fetch file
     * @return array [sourceFile], [sourceFileName]
     */
    public function getSourceFile($params)
    {
        $sourceFile = null;
        $sourceFileName = null;

        // get the actual file - check in order - uploaded file, url then node
        if(!empty($params['File']))
        {
            $sourceFileName = $params['File'];
            $uploadedFiles = $params['_uploadedFiles'];

            foreach($uploadedFiles as $uploadFile)
            {
                if($uploadFile->getName() == $sourceFileName)
                {
                    $sourceFile = $uploadFile->getTemporaryName();
                    break;
                }
            }

            if(empty($sourceFile))
                throw new MediaServiceException("File '{$sourceFileName}' was not uploaded");
        }
        else if(!empty($params['Url']))
        {
            // go fetch file from url
            $url = $params['Url'];
            $data = $this->HttpRequest->fetchURL($url);
            // create a unique output file name
            $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'urlfetch');
            file_put_contents($sourceFile, $data);
            $parts = parse_url($url);
            $sourceFileName = basename($parts['path']);
        }
        else if(!empty($params['SourceNodeRef']))
        {
            // go fetch file from another node's #original
            $node = $this->getNode($this->getNodeRef($params['SourceNodeRef']), '#original');

            $tag = $node->getOutTag('#original');
            if(!$tag)
                throw new MediaServiceException("Node '{$params['SourceNodeRef']}' has no #original tag");

            $fileNode = $tag->getTagLinkNode();

            $element = $node->getNodeRef()->getElement();
            list($storageFacility, $sfParams) = $this->deriveStorageFacility($element);

            $file = $storageFacility->getFile($sfParams, $fileNode->Title, true);
            $contents = $file->getContents();

            // create a unique output file name
            $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'sffetch');
            file_put_contents($sourceFile, $contents);

            $sourceFileName = basename($fileNode->Title);
        }
        else if(!empty($params['DataString']))
        {
            $data = $params['DataString'];
            if (preg_match('/^data:/',$params['DataString']))
                $data = substr($data, strpos($data, ",")+1);

            if (!$file = base64_decode($data,true))
                throw new MediaServiceException('Data string is not a valid base64 encoded file.');

            // create a unique output file name
            $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'base64fetch');
            file_put_contents($sourceFile, $file);

            $sourceFileName = $params['DataFileName'];
        }
        else
            throw new MediaServiceException("No source file specified");

        return array($sourceFile, $sourceFileName);
    }

    /**
     * Gets the local file from supplied file node.
     *
     * @return array [sourceFile], [sourceFileName]
     */
    protected function getSourceFileFromNode($fileNode)
    {
        $element = $fileNode->getNodeRef()->getElement();
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($element);

        $file = $storageFacility->getFile($sfParams, $fileNode->Title, true);
        $contents = $file->getContents();

        // create a unique output file name
        $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'sffetch');
        file_put_contents($sourceFile, $contents);

        $sourceFileName = basename($fileNode->Title);

        return array($sourceFile, $sourceFileName);
    }

    /**
     * Creates a NodeRef from ElementSlug & NodeSlug in $params.
     *
     * @param array $params User defined request parameters (or noderef - 'element:slug')
     * @throws MediaServiceException If invalid Slugs or Element
     * @return NodeRef
     */
    protected function getNodeRef($params)
    {
        if(is_array($params))
        {
            if(empty($params['ElementSlug']))
                throw new MediaServiceException('ElementSlug must be specified');

            if(empty($params['NodeSlug']))
                throw new MediaServiceException('NodeSlug must be specified');

            $elementSlug = $params['ElementSlug'];
            $nodeSlug = $params['NodeSlug'];
        }
        else
        {
            $ar = explode(':', $params);

            if(count($ar) < 2)
                throw new MediaServiceException("Invalid node ref: {$params}");

            $elementSlug = $ar[0];
            $nodeSlug = $ar[1];
        }

        $element = $this->ElementService->getBySlug($elementSlug);

        if($element == null)
            throw new MediaServiceException("Invalid Element");

        $noderef = new NodeRef($element,$nodeSlug);

        return $noderef;
    }

    /**
     * Returns $this->errors.
     */
    protected function getErrors()
    {
        return $this->errors;
    }

    /**
     * Return a user message for errors resulting from failed zip extraction.
     *
     * @param $errno
     * @return string
     */
    protected function _zipFileErrMsg($errno) {
        // using constant name as a string to make this function PHP4 compatible
        $zipFileFunctionsErrors = array(
            'ZIPARCHIVE::ER_MULTIDISK' => 'Multi-disk zip archives not supported.',
            'ZIPARCHIVE::ER_RENAME' => 'Renaming temporary file failed.',
            'ZIPARCHIVE::ER_CLOSE' => 'Closing zip archive failed',
            'ZIPARCHIVE::ER_SEEK' => 'Seek error',
            'ZIPARCHIVE::ER_READ' => 'Read error',
            'ZIPARCHIVE::ER_WRITE' => 'Write error',
            'ZIPARCHIVE::ER_CRC' => 'CRC error',
            'ZIPARCHIVE::ER_ZIPCLOSED' => 'Containing zip archive was closed',
            'ZIPARCHIVE::ER_NOENT' => 'No such file.',
            'ZIPARCHIVE::ER_EXISTS' => 'File already exists',
            'ZIPARCHIVE::ER_OPEN' => 'Can\'t open file',
            'ZIPARCHIVE::ER_TMPOPEN' => 'Failure to create temporary file.',
            'ZIPARCHIVE::ER_ZLIB' => 'Zlib error',
            'ZIPARCHIVE::ER_MEMORY' => 'Memory allocation failure',
            'ZIPARCHIVE::ER_CHANGED' => 'Entry has been changed',
            'ZIPARCHIVE::ER_COMPNOTSUPP' => 'Compression method not supported.',
            'ZIPARCHIVE::ER_EOF' => 'Premature EOF',
            'ZIPARCHIVE::ER_INVAL' => 'Invalid argument',
            'ZIPARCHIVE::ER_NOZIP' => 'Not a zip archive',
            'ZIPARCHIVE::ER_INTERNAL' => 'Internal error',
            'ZIPARCHIVE::ER_INCONS' => 'Zip archive inconsistent',
            'ZIPARCHIVE::ER_REMOVE' => 'Can\'t remove file',
            'ZIPARCHIVE::ER_DELETED' => 'Entry has been deleted',
        );

        foreach ($zipFileFunctionsErrors as $constName => $errorMessage) {
            if (defined($constName) and constant($constName) === $errno) {
              return 'Zip File Function error: '.$errorMessage;
            }
        }
        return 'Zip File Function error: unknown';
    }

    /**
     * Remap filter properties into the proper format.
     *
     * @param array $filters
     * @return array
     */
    protected function _sanitizeFilterProperties($filters) {
        static $anchorPoints;

        if (empty($anchorPoints)) {
            $anchorPoints = array(
                '0,0' => 'NorthWest',
                '0,50' => 'West',
                '0,100' => 'SouthWest',
                '50,0' => 'North',
                '50,50' => 'Center',
                '50,100' => 'South',
                '100,0' => 'NorthEast',
                '100,50' => 'East',
                '100,100' => 'SouthEast'
            );
        }

        foreach ($filters as &$filter) {
            foreach ($filter as $k => $v) {
                switch($k) {
                    case 'anchor':
                        $filter['anchor'] = $anchorPoints[implode(',',$v)];
                    break;
                    case 'xOffset':
                        if (! empty($v) && $v != 'null')
                            $filter['offsetX'] = $v;
                        unset($filter[$k]);
                    break;
                    case 'yOffset':
                        if (! empty($v) && $v != 'null')
                        $filter['offsetY'] = $v;
                        unset($filter[$k]);
                    break;
                }
            }
        }

        return $filters;
    }

    protected function _buildCmsThumbnail($node) {
        $node = $this->RegulatedNodeService->getByNodeRef($node->getNodeRef(), new NodePartials('','#original.fields'));

        //-----------
        // Build CMS thumbnail separately so that it's ready when this action completes.
        $file = $this->FileService->retrieveFileFromNode($node->getElement(), $node->getOutTag('#original')->TagLinkNodeRef);
        $cmsThumb = $this->ImageService->createAndStoreThumbnail($node->getElement(), $this->imagesThumbnailCmsSize, $file->getLocalPath(), $this->ImageService->filenameForNode($node));

        $tag = new Tag($cmsThumb->getElement()->getSlug(),
        $cmsThumb->Slug,
        '#thumbnails',
        $this->imagesThumbnailCmsSize,
        $this->imagesThumbnailCmsSize);

        $node->replaceOutTags('#thumbnails',array($tag));

        $this->RegulatedNodeService->edit($node);
    }
}