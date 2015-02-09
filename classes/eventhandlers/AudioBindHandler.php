<?php
/**
 * MediaBindHandler
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2010 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted under the terms of the BSD License.
 *
 * @package     CrowdFusion
 * @copyright   2009-2010 Crowd Fusion Inc.
 * @license     http://www.opensource.org/licenses/bsd-license.php BSD License
 * @version     $Id: MediaBindHandler.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * MediaBindHandler
 *
 * @package     CrowdFusion
 */
class AudioBindHandler {


    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Node.@images.get" for loading file URLs when editing a Media record */
    public function loadAudioOriginal(NodeRef $nodeRef, NodePartials &$nodePartials = null)
    {
        if(!is_null($nodePartials))
        {
            $nodePartials->increaseOutPartials('#original.#url');
        }
    }

    /* Bound to "Node.@mixin-primary-image.get" for loading URLs when editing a record with media out tags */
    public function loadAudioTags(NodeRef $nodeRef, NodePartials &$nodePartials = null)
    {
        if(!is_null($nodePartials))
        {
            if($nodePartials->getOutPartials() != "")
            {
                $tagDefs = $nodeRef->getElement()->Schema->getTagDefs();
                foreach($tagDefs as $k => $tagDef) {
                    if($tagDef->Partial->TagAspect == 'audio') {
                        $nodePartials->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#url');
                    }
                }
            }
        }
    }

    /* Bound to "Node.@mixin-primary-image.get" for loading URLs when editing a record with media out tags */
    public function loadAudioTagsCms($nothing, $nothing, Node $node)
    {
        if($node->getNodePartials()->getOutPartials() != "")
        {
            $tagDefs = $node->getNodeRef()->getElement()->Schema->getTagDefs();
            foreach($tagDefs as $k => $tagDef) {
                if($tagDef->Partial->TagAspect == 'audio') {
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#url');
                }
            }
        }
    }

    /* Bound to "Node.@media.outtags.#original.bind" and "Node.@media.outtags.#thumbnails.bind" so the NodeBinder
       doesn't remove the TagLinkNodes during a validation exception */
    public function bindTags()
    {
        //do nothing
    }
}
