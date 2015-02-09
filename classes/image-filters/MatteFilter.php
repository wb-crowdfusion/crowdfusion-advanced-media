<?php
/**
 * Filter for adding matt/border to image.
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
 * Filter for adding matt/border to image.
 */
class MatteFilter extends AbstractMatteFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        $op = "-size {$this->width}x{$this->height}";

        if (! empty($this->image)) {
            if ($this->repeat)
                $op .= " tile:\"{$this->image}\"";
            else {
                $op .= " -gravity NorthWest";

                $op .= " xc:\"{$this->color}\"";
                $op .= " -draw 'image over 0,0 0,0 \"{$this->image}\"'";
            }
        }
        else {
            $op .= " xc:\"{$this->color}\"";
        }
        $op .= " -gravity {$this->anchor}";

        $op .= " -draw 'image srcover ";

        $this->offsetX = -1 * intval($this->offsetX);
        $this->offsetY = -1 * intval($this->offsetY);
        $op .= " {$this->offsetX},{$this->offsetY}";

        $op .= ' 0,0';

        $op .= " \"{$this->sourceFile}\"'";

        return ImagickExecFilterHelper::executeFilter($this, $op, true);
    }
}
