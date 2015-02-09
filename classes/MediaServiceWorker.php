<?php
/**
 * MediaServiceWorker class.
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2011 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @version     $Id: $
 */

/**
 * MediaServiceWorker.
 */
class MediaServiceWorker extends AbstractGearmanWorker
{
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // fields

    protected $MediaService;

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // auto-wired setters

    public function setMediaService(MediaService $mediaService)
    {
        $this->MediaService = $mediaService;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // worker methods

    /**
     * Executes the specified method on the MediaService.
     *
     * @throws MediaServiceException
     */
    public function executeServiceMethod()
    {
        $params = $this->getData();

        if(empty($params['_mediaServiceMethodName']))
            throw new MediaServiceException('No method name specified for MediaService');

        $methodName = $params['_mediaServiceMethodName'];

        if(!$this->MediaService->isMethodValid($methodName))
            throw new MediaServiceException("'{$methodName}' is not a valid MediaService method");

        // method is OK, so let's execute it...
        $this->MediaService->$methodName($params);
    }
}
