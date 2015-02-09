<?php
/**
 * MediaDeleteHandler
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
 * @version     $Id: MediaDeleteHandler.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * MediaDeleteHandler
 *
 * @package     CrowdFusion
 */
class MediaDeleteHandler {

    protected $NodeService;

    public function setNodeService(NodeService $NodeService)
    {
        $this->NodeService = $NodeService;
    }

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Node.@media.delete.pre" for deleting @file out tags. */
    public function deleteMedia(NodeRef $nodeRef)
    {
        // NOTE: outbound file tags must be fieldlike on the @media record
        $node = $this->NodeService->getByNodeRef($nodeRef,new NodePartials('', 'fields'));

        $outTags = $node->getOutTags();

        foreach($outTags as $tag) {

            if(! $tag->TagLinkNodeRef->getElement()->hasAspect('@files') )
                continue;

            //try to delete file node
            if($this->NodeService->refExists($tag->TagLinkNodeRef)) {
                $this->NodeService->delete($tag->TagLinkNodeRef);
            }
        }
    }

}
