<?php
/**
 * Base class for all watermark filters.
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
 * Base class for all watermark filters.
 */
abstract class AbstractWatermarkFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $type = null;

    protected $text = null;
    protected $width = null;
    protected $height = null;

    protected $opacity = null;

    protected $image = null;
    protected $scaleX = null;
    protected $scaleY = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Overlays either a text string or an image file to the source image.
     *
     * Options:
     * type => maybe either 'text' or 'image' - if 'image' a valid image input file must be specified
     * anchor => may be one of 'northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south' or 'southeast'
     * offsetX => the X offset from relative to the anchor position (default is 0)
     * offsetY => the Y offset from relative to the anchor position (default is 0)
     * opacity => the opacity of the watermark
     *
     * Options for type = 'text':
     * fontFamily => the typeface of the font to use - default is system dependant
     * fontSize => integer value of the font point size - default is 12
     * fontColor => the color of the text - default is black
     * fontWeight => the font weight - maybe be one of 'normal', 'bolder', 'bold' or 'lighter'
     * fontStyle => may be one of 'normal', 'italic' or 'oblique'
     * rotate => an integer value between -180 and +180 to rotate the text
     * text => the text to apply to the image
     *
     * Options for type = 'image':
     * image => the key to a corresponding image file path in the inputFiles array
     * scaleX => the width of the overlaid image
     * scaleY => the height of the overlaid image
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of options as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null)
    {
        $this->type = !empty($options['mode']) ? strtolower($options['mode']) : 'text';

        if($this->type == 'text')
        {
            if(empty($options['text']))
                throw new ImageFilterException("Text option cannot be empty");

            $this->text = $options['text'];

            $this->width = intval($options['width']);
            $this->height = intval($options['height']);

            $this->populateFontFields($options);
            $this->populateRotateField($options);

        }
        else if($this->type == 'image')
        {
            if(! empty($options['image']) && $options['image'] != 'null')
                $this->image = $this->prepareImageData($options['image']);

            $this->scaleX = isset($options['scaleX']) ? $options['scaleX'] : null;
            if($this->scaleX != null && !is_int($this->scaleX))
                throw new ImageFilterException("ScaleX option must be a valid integer value");

            $this->scaleY = isset($options['scaleY']) ? $options['scaleY'] : null;
            if($this->scaleY != null && !is_int($this->scaleY))
                throw new ImageFilterException("ScaleY option must be a valid integer value");

            // if only one scale option specified - set both to same value
            if($this->scaleX != null && $this->scaleY == null)
                $this->scaleY = $this->scaleX;
            else if($this->scaleY != null && $this->scaleX == null)
                $this->scaleX = $this->scaleY;
        }
        else
        {
            throw new ImageFilterException("Type option must be 'text' or 'image'");
        }

        if (!empty($options['opacity']) && !is_numeric($options['opacity']))
            throw new ImageFilterException("Opacity must be a valid integer value");
        $this->opacity = !empty($options['opacity']) ? intval($options['opacity']) : 0;

        if($this->opacity < 0 || $this->opacity > 100)
            throw new ImageFilterException("Opacity must be between 0 and 100");

        $this->populateAnchorFields($options);

        return parent::applyFilter($sourceFile, $options);
    }

}
