<?php
/**
 * Exception class for image filters.
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2011 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @license     http://www.crowdfusion.com/licenses/enterprise CF Enterprise License
 * @version     $Id$
 */

/**
 * Exception class for image filters.
 */
class ImageFilterException extends Exception
{
    public $additionalInfo = null;

    public function __construct($message, $additionalInfo = null)
    {
        parent::__construct($message);

        if(is_array($additionalInfo))
            $this->additionalInfo = $additionalInfo;
        else if(!empty($additionalInfo))
            $this->additionalInfo = array($additionalInfo);
        else
            $this->additionalInfo = array();
    }

    public function getAdditionalInfo()
    {
        return $this->additionalInfo;
    }
}
