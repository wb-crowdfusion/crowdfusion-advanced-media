<?php
/**
 * MediaQuickAddHandler
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
 * @version     $Id: MediaQuickAddHandler.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * MediaQuickAddHandler
 *
 * @package     CrowdFusion
 */
class ImagesQuickAddHandler extends AbstractMediaQuickAddHandler {

    protected $triggered = false;


    protected $RequestContext;

    public function setRequestContext($RequestContext)
    {
        $this->RequestContext = $RequestContext;
    }

    protected $ImageService;

    public function setImageService(ImageService $ImageService)
    {
        $this->ImageService = $ImageService;
    }

    /** @var TransactionManager */
    protected $TransactionManager;
    public function setTransactionManager(TransactionManagerInterface $transactionManager)
    {
        $this->TransactionManager = $transactionManager;
    }

    /** @var GearmanService */
    protected $GearmanService;
    public function setGearmanService(GearmanService $GearmanService)
    {
        $this->GearmanService = $GearmanService;
    }

    /** @var Events $Events */
    protected $Events;
    public function setEvents(Events $Events)
    {
        $this->Events = $Events;
    }

    protected function getMediaService()
    {
        return $this->ImageService;
    }

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
        $this->triggered = false;
    }

    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "Dispatcher.postHandle" to compact response data so Flash doesn't puke */
    /** @see http://swfupload.org/forum/generaldiscussion/1717 */
    public function postHandleQuickAdd(Transport $transport)
    {
        if(!$this->triggered) return;

        $controls = $this->RequestContext->getControls();

        if((stripos($this->Request->getUserAgent(),'Flash') !== FALSE || stripos($this->Request->getServerAttribute('HTTP_X_REQUESTED_WITH'), 'XMLHttpRequest') !== FALSE) && $controls->getControl('action') == 'node-quick-add') {

            $arr = JSONUtils::decode($transport->Content,true);

            if(!isset($arr['Cheaters'])) return;

            $newarr = array();

            //COPY NON-TAG FIELDS
            foreach(array('Slug','Title','Status','Element','RecordLink') as $key) {
                $newarr[$key] = $arr[$key];
            }

            //COPY ORIGINAL FILE TAG DATA
            $newarr['#original'] = array(
                'url' => $arr['Cheaters']['#original']['TagLinkNode']['Metas']['url']['MetaValue'],
                'width' => $arr['Cheaters']['#original']['TagLinkNode']['Metas']['width']['MetaValue'],
                'height' => $arr['Cheaters']['#original']['TagLinkNode']['Metas']['height']['MetaValue']
            );

            //COPY THUMBNAIL FILE TAG DATA

            $newarr['#thumbnails'] = array();
            $thumbs = $arr['Cheaters']['#thumbnails'];
            if (isset($thumbs['TagDirection'])) { $thumbs = array($thumbs); }
            foreach($thumbs as $thumb) {
                $newarr['#thumbnails'][] = array(
                    'value' => $thumb['TagValue'],
                    'url' => $thumb['TagLinkNode']['Metas']['url']['MetaValue'],
                    'width' => $thumb['TagLinkNode']['Metas']['width']['MetaValue'],
                    'height' => $thumb['TagLinkNode']['Metas']['height']['MetaValue']
                );
            }

            //ADD FORMAT SO TAG WIDGET CLASS CAN INTERPRET
            $newarr['Format'] = 'media/compact';

            $transport->Content = JSONUtils::encode($newarr);
        }
    }

    public function processQuickAdd(NodeRef $nodeRef, Node &$newNode)
    {
        $this->triggered = true;
        $this->bindToShutdown();
        return parent::processQuickAdd($nodeRef, $newNode);
    }

    public function buildThumbnails(NodeRef $nodeRef, Node $node)
    {
        // commit so the node is ready for the worker
        $this->TransactionManager->commit()->begin();

        //-----------
        // Rebuild thumbnails asynchronously
        $workerParams = array(
            'nodeRef' => ''.$nodeRef,
            'forceRebuildExisting' => false
        );
        $this->GearmanService->doBackgroundJob('ImagesWorker','rebuildThumbnails',$workerParams,'high');
    }

}
