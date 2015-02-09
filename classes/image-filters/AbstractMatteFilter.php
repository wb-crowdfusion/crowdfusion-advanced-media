<?php
/**
 * Base class for all matte filters.
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
 * Base class for all matte filters.
 */
abstract class AbstractMatteFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $image = null;
    protected $repeat = false;

    protected $color = null;

    protected $width = null;
    protected $height = null;

    protected $anchor = null;
    protected $offsetX = null;
    protected $offsetY = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Creates an underlay of color or an image to the source image.
     *
     * image => a base64 encoded data string to use as background matte
     * repeat => if the image should be repeated
     * color => a color to use if an image is not set
     * width => the width of the canvas to place the source image on
     * height => the height of the canvas to place the source image on
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
        if(! empty($options['image']) && $options['image'] != 'null') {
            $this->image = $this->prepareImageData($options['image']);
            $this->repeat = StringUtils::strToBool($options['repeat']);
        }

        $this->color = ! empty($options['color']) ? '#'.preg_replace('/[^a-f0-9]/i', '', $options['color']) : "#ffffff";
        if (! empty($this->color) && !preg_match('/^#[a-f0-9]{6}$/i', $this->color))
            throw new ImageFilterException("Color must be a valid hex value ".$this->color);

        if (!empty($options['width']) && !is_numeric($options['width']))
            throw new ImageFilterException("Canvas width must be a valid integer value");
        $this->width = !empty($options['width']) ? intval($options['width']) : 0;

        if (!empty($options['height']) && !is_numeric($options['height']))
            throw new ImageFilterException("Canvas height must be a valid integer value");
        $this->height = !empty($options['height']) ? intval($options['height']) : 0;

        $this->populateAnchorFields($options);

        return parent::applyFilter($sourceFile, $options);
    }
}
