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
class MediaBindHandler {

    protected $Request;

    public function setRequest(Request $Request)
    {
        $this->Request = $Request;
    }

    protected $NodeService;

    public function setNodeService(NodeServiceInterface $NodeService)
    {
        $this->NodeService = $NodeService;
    }


    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Node.@images.get" for loading file URLs when editing a Media record */
    public function loadMediaOriginals(NodeRef $nodeRef, NodePartials &$nodePartials = null)
    {
        return;

        if(!is_null($nodePartials))
        {
            $nodePartials->increaseOutPartials('#original.#url,#original.#width,#original.#height');
        }
    }

    /* Bound to "Node.@mixin-primary-image.get" for loading URLs when editing a record with media out tags */
    public function loadMediaTagsOriginalsCms($nothing, $nothing, Node $node)
    {
        return;

        if($node->getNodePartials()->getOutPartials() != "")
        {
            $tagDefs = $node->getNodeRef()->getElement()->Schema->getTagDefs();
            foreach($tagDefs as $k => $tagDef) {
                if($tagDef->Partial->TagAspect == 'media') {
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#url,#'.$tagDef->Partial->TagRole.'.#original.#height,#'.$tagDef->Partial->TagRole.'.#original.#width');
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

    public function processNonFieldLike(NodeRef &$nodeRef, Node &$node, $nothing)
    {
        $tagDefs = $node->getNodeRef()->getElement()->Schema->getTagDefs();
        foreach ($tagDefs as $k => $tagDef) {
            if (!$tagDef->isFieldlike()) {
                $params = $this->Request->getParameters();

                $direction = ucfirst($tagDef->Direction);

                $tagsArray = array();
                $hashed = '#'.ltrim($tagDef->Id, '#');
                if(array_key_exists($direction.'Tags', $params) && is_array($params[$direction.'Tags'])
                   && array_key_exists($hashed, $params[$direction.'Tags']) && is_array($params[$direction.'Tags'][$hashed]) )
                {

                    $tags = $params[$direction.'Tags'][$hashed];

                    foreach((array)$tags as $key => $tag) {
                        $tagsArray[] = new Tag($tag);
                    }
                }

                if($direction == 'In')
                    foreach ($tagsArray as $tag) {
                        $this->NodeService->addInTag($node->getNodeRef(), $tag);
                    }
                else
                    foreach ($tagsArray as $tag) {
                        $this->NodeService->addOutTag($node->getNodeRef(), $tag);
                    }
            }
        }
    }

    public function loadNonFieldLike($nothing, $nothing, Node &$node)
    {
        $tagDefs = $node->getNodeRef()->getElement()->Schema->getTagDefs();
        foreach ($tagDefs as $k => $tagDef) {
            if (!$tagDef->isFieldlike()) {
                $params = $this->Request->getParameters();

                $direction = ucfirst($tagDef->Direction);

                $tagsArray = array();
                $hashed = '#'.ltrim($tagDef->Id, '#');
                if(array_key_exists($direction.'Tags', $params) && is_array($params[$direction.'Tags'])
                   && array_key_exists($hashed, $params[$direction.'Tags']) && is_array($params[$direction.'Tags'][$hashed]) )
                {

                    $tags = $params[$direction.'Tags'][$hashed];

                    foreach((array)$tags as $key => $tag) {
                        $tagsArray[] = new Tag($tag);
                    }
                }

                if($direction == 'In')
                    foreach ($tagsArray as $tag) {
                        $node->addInTag($tag);
                    }
                else
                    foreach ($tagsArray as $tag) {
                        $node->addOutTag($tag);
                    }
            }
        }
    }
}
