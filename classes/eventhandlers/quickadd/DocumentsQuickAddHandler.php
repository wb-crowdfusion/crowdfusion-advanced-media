<?php

class DocumentsQuickAddHandler extends AbstractMediaQuickAddHandler
{

    protected $DocumentService;

    public function setDocumentService(DocumentService $DocumentService)
    {
        $this->DocumentService = $DocumentService;
    }

    protected function getMediaService()
    {
        return $this->DocumentService;
    }
}