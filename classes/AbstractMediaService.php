<?php

abstract class AbstractMediaService
{

    protected $mediaOrganizeByDate;
    protected $mediaAllowCustomSubdirectories;
    protected $vendorCacheDirectory;
    protected $mediaRestrictedExtensions;

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
        $this->vendorCacheDirectory = $vendorCacheDirectory;
    }

    public function setMediaRestrictedExtensions($mediaRestrictedExtensions)
    {
        $this->mediaRestrictedExtensions = $mediaRestrictedExtensions;
    }

    protected $FileService;

    public function setFileService(FileService $FileService)
    {
        $this->FileService = $FileService;
    }

    protected $NodeService;

    public function setNodeService(NodeServiceInterface $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    protected $DateFactory;

    public function setDateFactory(DateFactory $DateFactory)
    {
        $this->DateFactory = $DateFactory;
    }

    protected $HttpRequest;

    public function setHttpRequest(HttpRequestInterface $HttpRequest)
    {
        $this->HttpRequest = $HttpRequest;
    }

    protected $NodeRefService;

    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }


    protected abstract function getMediaAspect();
    protected abstract function getDefaultExtension();

    protected abstract function processSpecificMedia($mediaNode, $originalFilePath, $desiredFilename, $desiredFileWithoutExtension);

    protected function getDateStamp($node){
        if (isset($node->ActiveDate)){
             $date = $node->ActiveDate;
         }
         else{
             $date =$this->DateFactory->newStorageDate();
         }
         return $date->format('/Y/m/d/');
    }

    public function storeMedia($originalFilePath, Node $mediaNode, $desiredFilename = null, StorageFacilityFile $preconfiguredFile = null)
    {

        //CREATE DATE STAMP DIRECTORY PREFIX
        $dateStamp = '/';
        if($this->mediaOrganizeByDate)
        {
            $dateStamp = $this->getDateStamp($mediaNode);
        }

        if(is_null($desiredFilename))
        {
            $uploadName = basename($originalFilePath);
            $path = pathinfo($uploadName);
            $ext = ((!empty($path['extension']))?strtolower($path['extension']):$this->getDefaultExtension());
            $path['filename'] = substr($path['filename'], 0, 128);

            $mediaNode->Title = str_replace('.'.$ext, '', $mediaNode->Title);

            $desiredFileWithoutExtension = SlugUtils::createSlug($mediaNode->Title, $this->mediaAllowCustomSubdirectories);

            $desiredFilename = $desiredFileWithoutExtension.'.'.$ext;

            //ENSURE FILENAME IS 128 OR LESS
            $len = strlen($desiredFilename) + ($this->mediaOrganizeByDate ? 11 : 0) + 1;
            if($len > 128) {
                $desiredFilename = substr($desiredFileWithoutExtension,0,128 - (strlen('.'.$ext) + ($this->mediaOrganizeByDate ? 11 : 0) + 1)).'.'.$ext;
            }

        } else {

            $path = pathinfo($desiredFilename);
            if (!empty($path['extension'])) {
                $ext = strtolower($path['extension']);
                $desiredFileWithoutExtension = substr($desiredFilename, 0, strripos($desiredFilename, '.' . $ext));
            } else {
                $ext = $this->getDefaultExtension();
                $desiredFileWithoutExtension = $desiredFilename;
                $desiredFilename .= '.' . $ext;
            }
        }

        if(empty($path['extension']))
        {
            $oldOriginalFilePath = $originalFilePath;
            $originalFilePath = dirname($originalFilePath).'/'.$desiredFileWithoutExtension.'.'.$ext;
            if(!@rename($oldOriginalFilePath, $originalFilePath))
                throw new Exception('Cannot rename file ['.$oldOriginalFilePath.'] to ['.$originalFilePath.']');
        }

        if(in_array(strtolower($ext), array_map("strtolower", $this->mediaRestrictedExtensions)))
            throw new Exception('Cannot add media with restricted extension ['.$ext.']');

        $desiredFilename = $dateStamp.$desiredFilename;
        $desiredFileWithoutExtension = $dateStamp.$desiredFileWithoutExtension;


        $this->processSpecificMedia($mediaNode, $originalFilePath, $desiredFilename, $desiredFileWithoutExtension, $preconfiguredFile);



        return $mediaNode;
    }

    public function storeMediaFromURL($url, Node $media, $desiredFilename = null)
    {
        $workdir = $this->vendorCacheDirectory;

        try{
            $data = $this->HttpRequest->fetchURL($url);
        }catch(Exception $e){
            $data = FALSE;
        }

        if($data === FALSE)
            throw new Exception("Could not get contents of file at the specified URL.  Please try uploading from a local file.");

        if(is_null($desiredFilename)){
            $ext = pathinfo(parse_url($url,PHP_URL_PATH),PATHINFO_EXTENSION);
            $ext = ((!empty($ext) && strlen($ext) <= 4)?$ext:$this->getDefaultExtension());
            $uploadTempPath = trim($workdir.'/uploads/'.mt_rand().'.'.$ext );
        }else
            $uploadTempPath = trim($workdir.'/uploads/'.$desiredFilename);

        FileSystemUtils::safeFilePutContents($uploadTempPath, $data);

        $media = $this->storeMedia($uploadTempPath, $media, $desiredFilename);

        return $media;
    }


    public function replaceMediaFromURL($url, $title = null, $nodeRefString = null)
    {
        if(is_null($nodeRefString)) {
            $mediaNodeRef = $this->NodeRefService->generateNodeRef($this->NodeRefService->oneFromAspect($this->getMediaAspect()), $title);
            $media = $mediaNodeRef->generateNode();
        } else {
            $mediaNodeRef = $this->NodeRefService->generateNodeRef($this->NodeRefService->parseFromString($nodeRefString), $title);
            $media = $mediaNodeRef->generateNode();
        }

        if (!$this->NodeService->refExists($media->getNodeRef())) {

            $media->ActiveDate = $this->DateFactory->newLocalDate();
            $media->Title = $title;
            $media->Status = 'draft';

            $this->storeMediaFromURL($url, $media);

            $this->NodeService->add($media);

        } else {
            $media = $this->NodeService->getByNodeRef($media->getNodeRef(), new NodePartials('','#original.#url',''),false);
        }

        return $media;
    }

}