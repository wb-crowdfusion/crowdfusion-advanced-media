<?php
/**
 * Base class for all crop filters.
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
 * Base class for all crop filters.
 */
abstract class AbstractThumbnailFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $height = null;
    protected $width = null;
    protected $cropHeight = null;
    protected $cropWidth = null;
    protected $anchor = null;
    protected $offsetX = null;
    protected $offsetY = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Crops a file to a specified height and width.
     *
     * Options:
     * height => the height of the final cropped and resized file
     * width => the width of the final cropped and resized file
     * cropHeight => the height of the cropped original file
     * cropWidth => the width of the cropped original file
     * offsetX => the crop offset from the left of the source file (default is 0)
     * offsetY => the crop offset from the top of the source file (default is 0)
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of otions as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null, $inputFiles=null)
    {
        if (!empty($options['width']) && !is_numeric($options['width']))
            throw new ImageFilterException("Width parameter must be a valid integer value");
        $this->width = !empty($options['width']) ? intval($options['width']) : 0;

        if (!empty($options['height']) && !is_numeric($options['height']))
            throw new ImageFilterException("Height parameter must be a valid integer value");
        $this->height = !empty($options['height']) ? intval($options['height']) : 0;

        if (!empty($options['cropWidth']) && !is_numeric($options['cropWidth']))
            throw new ImageFilterException("Crop Width parameter must be a valid integer value");
        $this->cropWidth = !empty($options['cropWidth']) ? intval($options['cropWidth']) : 0;

        if (!empty($options['cropHeight']) && !is_numeric($options['cropHeight']))
            throw new ImageFilterException("Crop Height parameter must be a valid integer value");
        $this->cropHeight = !empty($options['cropHeight']) ? intval($options['cropHeight']) : 0;

        $options['anchor'] = 'NorthWest';
        $this->populateAnchorFields($options);

        return parent::applyFilter($sourceFile, $options, $inputFiles);
    }

}
