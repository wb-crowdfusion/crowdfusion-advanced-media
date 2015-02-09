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
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @license     http://www.crowdfusion.com/licenses/enterprise CF Enterprise License
 * @version     $Id$
 */

/**
 * Base class for all crop filters.
 */
abstract class AbstractCropFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $height = null;
    protected $width = null;
    protected $anchor = null;
    protected $offsetX = null;
    protected $offsetY = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Crops a file to a specified height and width.
     *
     * Options:
     * height => the height of the cropped file
     * width => the width of the cropped file
     * anchor => may be one of 'northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south' or 'southeast'
     * offsetX => the X offset from relative to the anchor position (default is 0)
     * offsetY => the Y offset from relative to the anchor position (default is 0)
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of options as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null)
    {
        if (!empty($options['width']) && !is_numeric($options['width']))
            throw new ImageFilterException("Width parameter must be a valid integer value");
        $this->width = !empty($options['width']) ? intval($options['width']) : 0;

        if (!empty($options['height']) && !is_numeric($options['height']))
            throw new ImageFilterException("Height parameter must be a valid integer value");
        $this->height = !empty($options['height']) ? intval($options['height']) : 0;

        $this->populateAnchorFields($options);

        return parent::applyFilter($sourceFile, $options);
    }

}
