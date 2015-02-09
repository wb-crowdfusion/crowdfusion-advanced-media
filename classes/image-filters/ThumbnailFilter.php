<?php
/**
 * Filter for creating image thumbnail files.
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

class ThumbnailFilter extends AbstractThumbnailFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        $op = '';

        $op .= "-gravity {$this->anchor} ";

        $op .= "-crop {$this->cropWidth}x{$this->cropHeight}{$this->offsetX}{$this->offsetY}! ";

        $op .= "-background white -flatten ";

        $op .= "-resize {$this->width}x{$this->height}";

        return ImagickExecFilterHelper::executeFilter($this, $op);
    }

}
