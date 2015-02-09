<?php

abstract class AbstractMediaQuickAddHandler
{
    protected $Request;
    protected $NodeRefService;
    protected $HttpRequest;

    protected $vendorCacheDirectory;

    public function setHttpRequest(HttpRequest $HttpRequest)
    {
        $this->HttpRequest = $HttpRequest;
    }

    public function setRequest($Request)
    {
        $this->Request = $Request;
    }

    public function setVendorCacheDirectory($vendorCacheDirectory)
    {
        $this->vendorCacheDirectory = $vendorCacheDirectory;
    }

    public function setNodeRefService(NodeRefService $NodeRefService)
    {
        $this->NodeRefService = $NodeRefService;
    }

    protected abstract function getMediaService();

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Node.@media.edit.pre" and "Node.@media.add.pre" for processing file (and URL) uploads
       when quick adding Media records. */
    public function processQuickAdd(NodeRef $nodeRef, Node &$newNode)
    {
        try {
            $workdir = $this->vendorCacheDirectory;

            $fileURL = (string)$this->Request->getParameter('FileURL');
            if (empty($fileURL))
                    $fileURL = (string)$this->Request->getParameter('Url');
            $dataURL = (string)$this->Request->getParameter('DataURL');

            if($fileURL != null && trim($fileURL) !== '') {
                //process file from URL
//                $data = $this->HttpRequest->fetchURL($fileURL);
//
//                if($data === FALSE)
//                    throw new Exception("Could not get contents of image file at the specified URL.  Please try uploading the image from a local file.");
//
//                $basename = basename($fileURL);
//
//                if(($qpos = strpos($basename,'?')) !== false)
//                    $basename = substr($basename,0,$qpos);
//
//                $uploadTempPath = rtrim($workdir, '/').'/uploads/'.$basename;
//
//                FileSystemUtils::safeFilePutContents($uploadTempPath, $data);

                $this->getMediaService()->storeMediaFromURL($fileURL,$newNode);

            } else if($dataURL != null && trim($dataURL) !== '') {

                if(preg_match("/^data:(.*?);base64,(.*)$/",$dataURL,$m)) {

                    $mimeType = $m[1];
                    $data = $m[2];

                    if(empty($data))
                        throw new Exception("Could not parse data from base64 encoded DataURL");

                    $mimeParts = explode('/',$mimeType);

                    $fname = mt_rand().'.'.$mimeParts[1];

                    $newPath = rtrim($workdir, '/').'/uploads/'.$fname;

                    FileSystemUtils::safeFilePutContents($newPath,base64_decode($data));

                    $this->getMediaService()->storeMedia($newPath,$newNode);

                } else {
                    throw new Exception("Invalid base64 encoded DataURL format");
                }

            } else {

                foreach($this->Request->getUploadedFiles() as $name => $upload) {

                    if(!$upload->isEmpty()) {

                        $dotPos = strrpos($upload->getName(), '.');
                        if($dotPos === FALSE)
                            throw new Exception("Uploaded file name missing extension!");

                        //$uploadBaseName = SlugUtils::createSlug($newNode->Title);
                        //$uploadExtension = strtolower(substr($upload->getName(), $dotPos+1));
                        //$uploadName = $uploadBaseName.'.'.$uploadExtension;
                        $uploadTempPath = $upload->getTemporaryName();

                        $newPath = rtrim($workdir, '/').'/uploads/'.preg_replace('/[\x80-\xFF]/', '', $upload->getName());

                        //MOVE OR COPY UPLOADED FILE TO WORKING PATH
                        if(!$upload->transferTo($newPath))
                            throw new Exception('Unable to transfer upload to: '.$newPath);

                        $this->getMediaService()->storeMedia($newPath,$newNode);

                        break; //only process 1 uploaded file (for now)
                    }
                    else {
                        throw new Exception("Unsuccessful upload: ".$upload->getHumanError());
                    }
                }
            }

        }
        catch(StorageFacilityException $sfe) {
            throw new Exception("An error occurred storing the file(s): ".$sfe->getMessage());
        }
        catch(ThumbnailsException $te) {
            throw new Exception("An error occurred generating the thumbnail(s): ".$te->getMessage());
        }
        catch(Exception $e) {
            throw new Exception("An error occurred while processing the file(s): ".$e->getMessage());
        }
    }

}
