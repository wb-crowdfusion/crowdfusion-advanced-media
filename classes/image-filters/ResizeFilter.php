<?php
/**
 * Filter for resizing image files.
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
 * This filter handles resizing of images.
 */
class ResizeFilter extends AbstractResizeFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        $op = '-resize ';

        if(!empty($this->algorithm))
            $op .= " -filter {$this->algorithm} ";

        if($this->scalePercent > 0)
            $op .= "\"{$this->scalePercent}%\"";
        else if($this->height > 0 && $this->width > 0)
        {
            $op .= "{$this->width}x{$this->height}";
            if(!$this->constrainProportions)
                $op .='!';
        }
        else if($this->width > 0)
            $op .= "{$this->width}";
        else
            $op .= "x{$this->height}";

        if(!empty($this->unsharp))
            $op .= " -unsharp {$this->unsharp}";

        return ImagickExecFilterHelper::executeFilter($this, $op);
   }

}
