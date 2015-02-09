<?php
/**
 * Base class for all resize filters.
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
 * Base class for all resize filters.
 */
abstract class AbstractResizeFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $scalePercent = null;
    protected $height = null;
    protected $width = null;
    protected $constrainProportions = null;
    protected $algorithm = null;
    protected $unsharp = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Resizes an image to a specified height and width.
     *
     * Options:
     * scalePercent => scale the image by specified percentage - height and width are ignored
     * height => the height of the resized file
     * width => the width of the resized file
     * constrainProportions => if true retains image aspect ration only valid if height AND width is specified
     * algorithm => may be one of 'point','box','triangle','hermite','gaussian','quadratic','cubic','catrom' or 'mitchell'
     * unsharp => unsharp mask to sharpen image after scaling in format 'RADIUSxSIGMA' useful examples are 0x1 or 0x2
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of otions as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null)
    {
        if (!empty($options['scalePercent']) && !is_numeric($options['scalePercent']))
            throw new ImageFilterException("ScalePercent parameter must be a valid integer value");
        $this->scalePercent = !empty($options['scalePercent']) ? intval($options['scalePercent']) : 0;

        $this->height = (!empty($options['height']) && strcmp($options['height'], 'auto') != 0) ? intval($options['height']) : 0;
        if (!empty($this->height) && !is_numeric($this->height))
            throw new ImageFilterException("Height parameter must be a valid integer value");

        $this->width = (!empty($options['width']) && strcmp($options['width'], 'auto') != 0) ? intval($options['width']) : 0;
        if (!empty($this->width) && !is_numeric($this->width))
            throw new ImageFilterException("Width parameter must be a valid integer value");

        // we must have one height or width parameter or scalePercent
        if($this->height == 0 && $this->width == 0 && $this->scalePercent == 0)
            throw new ImageFilterException("Either scaleHeight or either (or both) height and width must be specified");

        $this->algorithm = !empty($options['algorithm']) ? $options['algorithm'] : null;

        if(!empty($this->algorithm))
        {
            $this->algorithm = trim(strtolower($this->algorithm));
            $aa = array('point','box','triangle','hermite','gaussian','quadratic','cubic','catrom','mitchell');
            if(!in_array($this->algorithm, $aa))
                throw new ImageFilterException("Algorithm must be one of 'point','box','triangle','hermite','gaussian','quadratic','cubic','catrom' or 'mitchell'");
        }

        $this->unsharp = !empty($options['unsharp']) ? $options['unsharp'] : null;

        return parent::applyFilter($sourceFile, $options);
    }

}
