<?php
/**
 * Filter for rotating image files.
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
 * This filter handles rotating of images.
 */
class RotateFilter extends AbstractRotateFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        if($this->mode == 'distort')
        {
            if($this->scale > 0)
                $op = "-distort SRT \"{$this->scale},{$this->degrees}\"";
            else
                $op = "-distort SRT \"{$this->degrees}\"";
        }
        else
        {
            if($this->autoCrop)
            {
                // if degrees is a multiple of 90, just do regular rotate
                $x = $this->degrees % 90;
                if($x == 0)
                    $op = "-rotate \"{$this->degrees}\"";
                else
                {
                    // use 1.3 as default scale
                    $scale = $this->scale > 0 ? $this->scale : 1.3;
                    $op = "-distort SRT \"{$scale},{$this->degrees}\"";
                }
            }
            else
            {
               $op = "-background \"{$this->backgroundColor}\" -rotate \"{$this->degrees}\"";
            }
        }

        return ImagickExecFilterHelper::executeFilter($this, $op);
   }

}
