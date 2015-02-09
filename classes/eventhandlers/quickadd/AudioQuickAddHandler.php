<?php

class AudioQuickAddHandler extends AbstractMediaQuickAddHandler
{

    protected $AudioService;

    public function setAudioService(AudioService $AudioService)
    {
        $this->AudioService = $AudioService;
    }

    protected function getMediaService()
    {
        return $this->AudioService;
    }
}