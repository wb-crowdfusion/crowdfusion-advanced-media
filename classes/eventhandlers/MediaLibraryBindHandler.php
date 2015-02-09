<?php
/**
 * MediaLibraryBindHandler
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
 * MediaLibraryBindHandler
 *
 * @package     CrowdFusion
 */
class MediaLibraryBindHandler {


    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    public function loadMediaTagsCms($nothing, $nothing, Node $node)
    {
        return;
        if($node->getNodePartials()->getOutPartials() != "")
        {
            $tagDefs = $node->getNodeRef()->getElement()->Schema->getTagDefs();
            foreach($tagDefs as $k => $tagDef) {
                if($tagDef->Partial->TagAspect == 'media') {
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#thumbnails.#url');
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#thumbnails.#width');
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#thumbnails.#height');
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#url');
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#width');
                    $node->getNodePartials()->increaseOutPartials('#'.$tagDef->Partial->TagRole.'.#original.#height');
                }
            }
        }
    }

}
