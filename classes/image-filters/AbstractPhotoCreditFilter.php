<?php
/**
 * Base class for all photo-credit filters.
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
 * Base class for all photo-credit filters.
 */
abstract class AbstractPhotoCreditFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $type = null;

    protected $text = null;
    protected $padding = null;

    protected $backgroundColor = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Adds text to an image either as an overlay or by adding a text box to the bottom.
     *
     * Options:
     * type => maybe either 'add' - add a text box to bottom of image - or 'overlay' - overlay text on image
     * fontFamily => the typeface of the font to use - default is system dependent
     * fontSize => integer value of the font point size - default is 12
     * fontColor => the color of the text - default is black
     * fontWeight => the font weight - maybe be one of 'normal', 'bolder', 'bold' or 'lighter'
     * fontStyle => may be one of 'normal', 'italic' or 'oblique'
     * text => the text to apply to the image
     *
     * Options for type = 'add':
     * padding => padding for the text box
     * backgroundColor => the color to use as the background of the text box
     *
     * Options for type = 'overlay':
     * anchor => may be one of 'northwest', 'north', 'northeast', 'southwest', 'south' or 'southeast'
     * offsetX => the X offset from relative to the anchor position
     * offsetY => the Y offset from relative to the anchor position
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of options as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null)
    {
        $this->type = !empty($options['mode']) ? strtolower($options['mode']) : 'add';
        if(!($this->type == 'overlay' || $this->type == 'add'))
            throw new ImageFilterException("Type option must be 'add' or 'overlay'");

        $this->populateAnchorFields($options);
        $this->populateFontFields($options);

        $this->backgroundColor = ! empty($options['backgroundColor']) ? '#'.preg_replace('/[^a-f0-9]/i', '', $options['backgroundColor']) : "#ffffff";
        if (! empty($this->backgroundColor) && !preg_match('/^#[a-f0-9]{6}$/i', $this->backgroundColor))
            throw new ImageFilterException("Background Color must be a valid hex value ".$this->backgroundColor);

        if (!empty($options['padding']) && !is_numeric($options['padding']))
            throw new ImageFilterException("Text padding must be a valid integer value");
        $this->padding = !empty($options['padding']) ? intval($options['padding']) : 0;

        if(empty($options['text']))
            throw new ImageFilterException("Text option cannot be empty");

        $this->text = $options['text'];

        return parent::applyFilter($sourceFile, $options);
    }

}
