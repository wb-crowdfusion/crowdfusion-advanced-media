<?php
/**
 * FlashCookieHandler
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
 * @version     $Id: FlashCookieHandler.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * FlashCookieHandler
 *
 * @package     CrowdFusion
 */
class FlashCookieHandler {

    protected $Request;

    public function setRequest(Request $Request)
    {
        $this->Request = $Request;
    }

    /* Bound to "Dispatcher.preHandle" to copy cookies values submitted via NVP to the PHP cookies
       array.  This fixes Flash's inability to work with browser cookies. */
    public function processCookies() {

        $userAgent = $this->Request->getUserAgent();

        if(stripos($userAgent,'Flash') !== FALSE && $this->Request->getParameter('MEMBERREF_FLASH') != null) {

            $_COOKIE['memberRef'] = $this->Request->getParameter('MEMBERREF_FLASH');
        }
    }
}
