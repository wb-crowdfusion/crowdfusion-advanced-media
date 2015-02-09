<?php

class FileService
{

    protected $mediaOrganizeByDate;
    protected $mediaAllowCustomSubdirectories;

    public function setMediaOrganizeByDate($mediaOrganizeByDate)
    {
        $this->mediaOrganizeByDate = $mediaOrganizeByDate;
    }

    public function setMediaAllowCustomSubdirectories($mediaAllowCustomSubdirectories)
    {
        $this->mediaAllowCustomSubdirectories = $mediaAllowCustomSubdirectories;
    }

    protected $mediaRestrictedExtensions;

    public function setMediaRestrictedExtensions($mediaRestrictedExtensions)
    {
        $this->mediaRestrictedExtensions = $mediaRestrictedExtensions;
    }

    protected $ElementService;

    public function setElementService(ElementService $ElementService)
    {
        $this->ElementService = $ElementService;
    }

    protected $StorageFacilityFactory;

    public function setStorageFacilityFactory(StorageFacilityFactory $StorageFacilityFactory)
    {
        $this->StorageFacilityFactory = $StorageFacilityFactory;
    }

    protected $NodeRefService;

    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }

    protected $NodeService;

    public function setNodeService(NodeServiceInterface $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    protected $NodeMapper;

    public function setNodeMapper(NodeMapper $NodeMapper)
    {
        $this->NodeMapper = $NodeMapper;
    }

    protected $DateFactory;

    public function setDateFactory(DateFactory $DateFactory)
    {
        $this->DateFactory = $DateFactory;
    }

    protected function deriveStorageFacility($element)
    {
        if(!($element instanceof Element))
            $element = $this->ElementService->getBySlug($element);

        $site = $element->getAnchoredSite();

        if($element->hasStorageFacilityInfo())
        {
            $sfInfo = $element->getStorageFacilityInfo('media');
        } else {
            $sfInfo = $site->getStorageFacilityInfo('media');
        }

        $sf = $this->StorageFacilityFactory->build($sfInfo);
        $sfParams = $this->StorageFacilityFactory->resolveParams($sfInfo);

        return array($sf, $sfParams);
    }


    public function createFileNode(Element $parentElement, $desiredFilename, $workingFilePath, StorageFacilityFile $preconfiguredFile = null)
    {
        if(empty($desiredFilename))
            $desiredFilename = $this->filenameFromBasename(basename($workingFilePath));

        $path = pathinfo($workingFilePath);
        $ext = (!empty($path['extension'])?strtolower($path['extension']):'');

        if(in_array(strtolower($ext), array_map("strtolower", $this->mediaRestrictedExtensions)))
            throw new Exception('Cannot add file with restricted extension ['.$ext.']');

        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        $element = $this->NodeRefService->oneFromAspect('@files')->getElement();

        $file = $preconfiguredFile !== null?$preconfiguredFile:new StorageFacilityFile();
        $file->setId($storageFacility->findUniqueFileID($sfParams,$desiredFilename));
        $file->setLocalPath($workingFilePath);

        $file = $storageFacility->putFile($sfParams,$file);

        list($width, $height) = ImageUtils::getImageDimensions($file->getLocalPath());

        $mimetype = FileSystemUtils::getMimetype($file->getExtension());

        //CREATE FILE NODE & SAVE
        $nodeRef = new NodeRef($element, SlugUtils::createSlug($file->getId()));
        $nodeRef =  $this->NodeService->generateUniqueNodeRef($nodeRef, null, true);

        $node = new Node($nodeRef);
        $this->NodeMapper->defaultsOnNode($node);

        $node->Title = $file->getId();
        $node->setMeta('#url',$file->getURL());
//        $node->setMeta('#path',$file->getLocalPath());
        $node->setMeta('#mimetype',$mimetype);
        $node->setMeta('#size',filesize($file->getLocalPath()));
        $node->setMeta('#width',$width);
        $node->setMeta('#height',$height);
        $node->setMeta('#parent-element',$parentElement->Slug);
        $this->NodeService->add($node);

        return $node;
    }


//    public function storeFileNode(Element $parentElement, $desiredFilename, $workingFilePath, Node &$node)
//    {
//        if(empty($desiredFilename))
//            $desiredFilename = $this->filenameFromBasename(basename($workingFilePath));
//
//        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);
//
////        $element = $this->NodeRefService->oneFromAspect('@files')->getElement();
//
//        $file = new StorageFacilityFile();
//        $file->setId($storageFacility->findUniqueFileID($sfParams,$desiredFilename));
//        $file->setLocalPath($workingFilePath);
//
//        $file = $storageFacility->putFile($sfParams,$file);
//
//        list($width, $height) = ImageUtils::getImageDimensions($file->getLocalPath());
//
//        $mimetype = FileSystemUtils::getMimetype($file->getExtension());
//
//        //CREATE FILE NODE & SAVE
////        $nodeRef = new NodeRef($element, SlugUtils::createSlug($file->getId()));
////        $nodeRef =  $this->NodeService->generateUniqueNodeRef($nodeRef, null, true);
//
////        $node = new Node($nodeRef);
////        $this->NodeMapper->defaultsOnNode($node);
//
//        $node->Title = $file->getId();
//        $node->setMeta('#url',$file->getURL());
//        $node->setMeta('#path',$file->getLocalPath());
//        $node->setMeta('#mimetype',$mimetype);
//        $node->setMeta('#size',filesize($file->getLocalPath()));
//        $node->setMeta('#width',$width);
//        $node->setMeta('#height',$height);
////        $this->NodeService->add($node);
//
////        return $node;
//    }


    public function retrieveFileFromNode(Element $parentElement, NodeRef $fileNodeRef)
    {

        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        $fileNode = $this->NodeService->getByNodeRef($fileNodeRef);

        //title of file node is the SFid
        $fileid = $fileNode->Title;

        if($storageFacility->fileExists($sfParams, $fileid))
            return $storageFacility->getFile($sfParams, $fileid);

        return null;
    }

    public function checkFileExistsFromNodeRef(Element $parentElement, NodeRef $fileNodeRef)
    {
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        $fileNode = $this->NodeService->getByNodeRef($fileNodeRef);

        //title of file node is the SFid
        $fileid = $fileNode->Title;

        return $storageFacility->fileExists($sfParams, $fileid);
    }

    public function checkFileExistsFromId(Element $parentElement, $fileId)
    {
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        return $storageFacility->fileExists($sfParams, $fileId);
    }

    public function deleteFile(Element $parentElement, $fileId)
    {
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);

        if($storageFacility->fileExists($sfParams, $fileId)) {
            $storageFacility->deleteFile($sfParams, $fileId);
        }

    }

    public function renameFile(Element $parentElement, $fileNodeRef, $newFileId)
    {
        list($storageFacility, $sfParams) = $this->deriveStorageFacility($parentElement);


        $fileNode = $this->NodeService->getByNodeRef($fileNodeRef);

        //title of file node is the SFid
        $fileId = $fileNode->Title;

        if($fileId == $newFileId)
            return true;

        if($storageFacility->fileExists($sfParams, $fileId)) {
            $newFile = new StorageFacilityFile($fileId);
            $storageFacility->renameFile($sfParams, $newFile, $newFileId);

            $fileNode->Title = $newFile->getId();
            $fileNode->setMeta('#url',$newFile->getURL());
            $this->NodeService->edit($fileNode);
            
            return true;
        } else {
            return false;
        }

    }



    protected function filenameFromBasename($basename)
    {
        $path = pathinfo($basename);
        $ext = (!empty($path['extension'])?strtolower($path['extension']):'');
        $path['filename'] = substr($path['filename'], 0, 128);

        $desiredFileWithoutExtension = SlugUtils::createSlug($path['filename'], $this->mediaAllowCustomSubdirectories);

        $desiredFilename = $desiredFileWithoutExtension.(!empty($ext)?'.'.$ext:'');

        //ENSURE FILENAME IS 128 OR LESS
        $len = strlen($desiredFilename) + ($this->mediaOrganizeByDate ? 11 : 0) + 1;
        if($len > 128) {
            $desiredFilename = substr($desiredFileWithoutExtension,0,128 - (strlen((!empty($ext)?'.'.$ext:'')) + ($this->mediaOrganizeByDate ? 11 : 0) + 1)).(!empty($ext)?'.'.$ext:'');
        }

        $dateStamp = '/';
        if($this->mediaOrganizeByDate)
        {
            $now = $this->DateFactory->newStorageDate();
            $dateStamp = $now->format('/Y/m/d/');
        }

        return $dateStamp.$desiredFilename;
    }
}