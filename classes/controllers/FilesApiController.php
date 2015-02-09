<?php

class FilesApiController extends NodeApiController
{

    protected $vendorCacheDirectory;

    public function setVendorCacheDirectory($vendorCacheDirectory)
    {
        $this->vendorCacheDirectory = $vendorCacheDirectory;
    }

    protected $HttpRequest;

    public function setHttpRequest(HttpRequestInterface $HttpRequest)
    {
        $this->HttpRequest = $HttpRequest;
    }

    protected $FileService;

    public function setFileService(FileService $FileService)
    {
        $this->FileService = $FileService;
    }

    public function quickAdd()
    {
        try {

            $this->checkNonce();

            try {
                $mediaElementStr = (string)$this->Request->getRequiredParameter('ParentElement');
                $mediaElement = $this->ElementService->getBySlug($mediaElementStr);

                $workdir = $this->vendorCacheDirectory;

                $fileURL = (string)$this->Request->getParameter('FileURL');

                if($fileURL != null && trim($fileURL) !== '') {
                    //process file from URL
                    $data = $this->HttpRequest->fetchURL($fileURL);

                    if($data === FALSE)
                        throw new Exception("Could not get contents of file at the specified URL.  Please try uploading the file from a local file.");

                    $basename = basename($fileURL);

                    if(($qpos = strpos($basename,'?')) !== false)
                        $basename = substr($basename,0,$qpos);

                    $uploadTempPath = rtrim($workdir, '/').'/uploads/'.$basename;

                    FileSystemUtils::safeFilePutContents($uploadTempPath, $data);

                    $node = $this->FileService->createFileNode($mediaElement, null, $uploadTempPath);

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

                            $newPath = rtrim($workdir, '/').'/uploads/'.$upload->getName();

                            //MOVE OR COPY UPLOADED FILE TO WORKING PATH
                            if(!$upload->transferTo($newPath))
                                throw new Exception('Unable to transfer upload to: '.$newPath);

                            $node = $this->FileService->createFileNode($mediaElement, null, $newPath);

                            break; //only process 1 uploaded file (for now)
                        }
                        else {
                            throw new Exception("Unsuccessful upload: ".$upload->getHumanError());
                        }
                    }
                }

            }
            catch(StorageFacilityException $sfe) {
                throw new Exception("An error occurred storing the media file(s): ".$sfe->getMessage());
            }
            catch(ThumbnailsException $te) {
                throw new Exception("An error occurred generating the thumbnail(s): ".$te->getMessage());
            }
            catch(HttpRequestServerException $hrse) {
                throw new Exception("An error occurred while fetching the media file(s): ".$hrse->getCode());
            }
            catch(Exception $e) {
                throw new Exception("An error occurred while processing the media file(s): ".$e->getMessage());
            }

            // create node
            $this->getErrors()->throwOnError();

            $node = $this->RegulatedNodeService->getByNodeRef($node->getNodeRef(),new NodePartials());

            $this->bindToActionDatasource(array($node));
            return new View($this->successView());

        } catch(ValidationException $e) {
            $this->bindToActionDatasource(array());
            throw $e;
        } catch(Exception $e) {
            $this->bindToActionDatasource(array());
            $this->errors->addGlobalError($e->getCode(), $e->getMessage())->throwOnError();
        }
    }
}