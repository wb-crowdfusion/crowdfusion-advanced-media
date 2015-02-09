<?php
/**
 * Filter for cropping image files.
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
 * This filter handles cropping of images.
 */
class CropFilter extends AbstractCropFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        $op = '';

        if (!empty($this->anchor))
            $op .= "-gravity {$this->anchor} ";

        $op .= "-crop {$this->width}x{$this->height}{$this->offsetX}{$this->offsetY}";

        return ImagickExecFilterHelper::executeFilter($this, $op);
    }

}
