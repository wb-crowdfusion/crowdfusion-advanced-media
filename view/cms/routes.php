<?php
/**
 * routes
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
 * @version     $Id: routes.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * routes
 *
 * @package     CrowdFusion
 */
$routes = array (
    // custom files list screen
    '/(?P<Aspect>files)/?' => array (
            'view' => 'files/list.cft',
    ),

    // custom media list screen
    '/(?P<Aspect>media|images|audio|videos|documents)/?' => array (
            'view' => 'media/list.cft',
    ),

    // media api test home page
    '/media-api-test/?' => array (
            'view' => 'media-api-test/home.cft',
    ),

    // media api test image display page
    '/media-api-test/display-image/(?P<Slug>[^/]+)/?' => array(
    		'view' => 'media-api-test/display-image.cft',
    ),

    // media api test run-test page
    '/media-api-test/run-test/?' => array (
            'view' => 'media-api-test/run-test.cft',
    ),

);
