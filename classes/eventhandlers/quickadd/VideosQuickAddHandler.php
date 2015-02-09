<?php

class VideosQuickAddHandler extends AbstractMediaQuickAddHandler
{

    protected $VideoService;

    public function setVideoService(VideoService $VideoService)
    {
        $this->VideoService = $VideoService;
    }

    protected function getMediaService()
    {
        return $this->VideoService;
    }
}