<?php

class FilesDeleteHandler
{

    protected $NodeService;

    public function setNodeService(NodeService $NodeService)
    {
        $this->NodeService = $NodeService;
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

    protected $Events;

    public function setEvents(Events $Events)
    {
        $this->Events = $Events;
    }

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /**
     *
     */
    protected $shutdownBound = false;
    
    /**
     *
     */
    protected function bindToShutdown()
    {
        if (!$this->shutdownBound) {
            $this->shutdownBound = true;
            $this->Events->bindEvent('shutdown', $this, 'handleShutdown');
        }
    }

    /**
     *
     */
    public function handleShutdown()
    {
        $this->currentlyDeleting = false;
    }

    /* Bound to "Node.@files.delete.pre" for deleting files from the storage facility. */
    public function deleteFile(NodeRef $nodeRef)
    {

        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('all','',''));

        if(($elementStr = $node->getMetaValue('#parent-element')) != '')
        {

            $element = $this->ElementService->getBySlug($elementStr);

        } else {

            $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('','','all'));

            $intags = $node->getInTags();

            $element = null;

            //GET THE ELEMENT FOR THE PARENT RECORD (SHOULD BE @media)
            foreach($intags as $intag) {
                if($intag->TagLinkNodeRef->getElement()->hasAspect('@media')) {
                    $element = $intag->TagLinkNodeRef->getElement();
                }
            }
        }


        if($element != null) {
            //title of file node is the SFid
            $fileid = $node->Title;

            $this->FileService->deleteFile($element, $fileid);
        }

    }

    protected $currentlyDeleting = array();

    public function deleteOrphanedFile(NodeRef &$originNodeRef, NodeRef &$inboundNodeRef)
    {

        if($inboundNodeRef->getElement()->hasAspect('@media'))
        {

            if(in_array("".$originNodeRef, $this->currentlyDeleting))
                return;

            $this->currentlyDeleting[] = "".$originNodeRef;
            $this->bindToShutdown();

            $this->NodeService->delete($originNodeRef);
        }
    }

}
