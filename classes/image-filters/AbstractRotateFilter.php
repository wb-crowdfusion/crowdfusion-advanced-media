<?php
/**
 * Base class for all rotate filters.
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
 * Base class for all rotate filters.
 */
abstract class AbstractRotateFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $degrees = null;
    protected $autoCrop = null;
    protected $backgroundColor = null;
    protected $mode = null;
    protected $scale = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Rotates an image by specified degrees.
     *
     * Options:
     * degrees => value between -180 and +180 (default is 90)
     * autoCrop => if true, image is auto-cropped to remove empty corners (only valid in 'rotate' mode - default scale = 1.3)
     * backgroundColor => color to fill empty corners with e.g. 'blue' or 'rgb(255,255,255)' or '#FFFFFF'(default)
     * mode => 'rotate'(default) or 'distort' - if 'distort' empty corners are blurred rather than filled with background color
     * scale => for distort mode scales image to reduce empty corners - useful values are between about 1.1 to 1.5
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of otions as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null)
    {
        if (!empty($options['angle']) && !is_numeric($options['angle']))
            throw new ImageFilterException("Degrees parameter must be a valid integer value");
        $this->degrees = sprintf("%+d", (!empty($options['angle']) ? intval($options['angle']) : 0));

        if($this->degrees < -180 || $this->degrees > 180)
            throw new ImageFilterException("Degrees parameter must be between -180 and +180");

        $this->autoCrop = StringUtils::strToBool($options['autoCrop']);

        $this->mode = !empty($options['mode']) ? $options['mode'] : 'rotate';

        $this->scale = !empty($options['scale']) ? $options['scale'] : '0';

        // default to white if no background color specified
        $this->backgroundColor = !empty($options['backgroundColor']) ? $options['backgroundColor'] : '#ffffff';

        return parent::applyFilter($sourceFile, $options);
    }
}
