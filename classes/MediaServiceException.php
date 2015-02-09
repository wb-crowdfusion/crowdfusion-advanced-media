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
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @version     $Id: $
 */

/**
 * Exception class for image filters.
 */
class MediaServiceException extends Exception
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
