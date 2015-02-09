<?php

class JsonThumbnailsHandler
{
    protected $NodeService;
    public function setNodeService(NodeService $NodeService) {
        $this->NodeService = $NodeService;
    }

    public function addTag(NodeRef $imageNodeRef, NodeRef $thumbnailFileNodeRef, Tag $tag)
    {
        $image = $this->NodeService->getByNodeRef($imageNodeRef,new NodePartials('#thumbnails-json'));

        $json = $image->getMetaValue('#thumbnails-json');

        if($json == null) {
            $json = array();
        } else {
            $json = JSONUtils::decode($json);
        }

        $thumbnailFile = $this->NodeService->getByNodeRef($thumbnailFileNodeRef,new NodePartials('fields'));

        $thumb = new stdClass();

        $thumb->value = $tag->TagValue;
        $thumb->url = $thumbnailFile->jump('#url');
        $thumb->size = intval($thumbnailFile->jump('#size'));
        $thumb->height = intval($thumbnailFile->jump('#height'));
        $thumb->width = intval($thumbnailFile->jump('#width'));

        $json[] = $thumb;

        $this->NodeService->updateMeta($imageNodeRef,'#thumbnails-json',JSONUtils::encode($json));

    }

    public function removeTag(NodeRef $imageNodeRef, NodeRef $thumbnailFileNodeRef, Tag $tag)
    {
        $image = $this->NodeService->getByNodeRef($imageNodeRef,new NodePartials('#thumbnails-json'));

        $json = $image->getMetaValue('#thumbnails-json');

        if($json == null)
            return;

        $json = JSONUtils::decode($json);

        foreach($json as $i => $thumb) {
            if($thumb->value == $tag->TagValue) {
                array_splice($json,$i,1);
                break;
            }
        }

        $this->NodeService->updateMeta($imageNodeRef,'#thumbnails-json',JSONUtils::encode($json));
    }
}


