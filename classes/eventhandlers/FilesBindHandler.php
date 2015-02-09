<?php

class FilesBindHandler
{
    
    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Node.@file.get" for loading file URL and size */
    public function loadFile(NodeRef $nodeRef, NodePartials &$nodePartials = null)
    {
        if(!is_null($nodePartials))
        {
            $nodePartials->increaseMetaPartials('#url,#width,#height');
        }
    }
}