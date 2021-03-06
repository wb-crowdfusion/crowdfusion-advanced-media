<?php

class DocumentService extends AbstractMediaService {

    protected function getMediaAspect()
    {
        return '@documents';
    }

    protected function getDefaultExtension()
    {
        return 'doc';
    }

    protected function processSpecificMedia($mediaNode, $originalFilePath, $desiredFilename, $desiredFileWithoutExtension, StorageFacilityFile $preconfiguredFile = null)
    {
        $nodeRef = $mediaNode->getNodeRef();
        $mediaElement = $nodeRef->getElement();

        //STORE ORIGINAL FILE IN SF & CREATE NODE
        $originalFileNode = $this->FileService->createFileNode($mediaElement, $desiredFilename, $originalFilePath, $preconfiguredFile);

        //REMOVE LOCAL ORIGINAL WORKING FILE
        @unlink($originalFilePath);

        //PROCESS TAGS
        if($originalFileNode != null) {

            //REPLACE ORIGINAL FILE TAG
            $tag = new Tag($originalFileNode->getElement()->getSlug(),$originalFileNode->Slug,'#original');
            $tag->TagLinkNode = $originalFileNode;
            $mediaNode->replaceOutTag($tag);

        }

    }

}
