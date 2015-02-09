<?php
/**
 * Base class for all sharpen filters.
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
 * Base class for all sharpen filters.
 */
abstract class AbstractSharpenFilter extends AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $radius = null;
    protected $sigma = null;

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    /**
     * Applies an unsharp mask to sharpen an image.
     *
     * Options:
     * radius => the radius value of the unsharp mask - typically 0
     * sigma => the sigma value of the unsharp mask - useful values are 1 -10
     *
     * @param $sourceFile The source file to operate on
     * @param $options An array of otions as described above
     *
     * @see AbstractImageFilter::applyFilter()
     */
    public function applyFilter($sourceFile, $options=null, $inputFiles=null)
    {
        if(!isset($options['radius']))
            throw new ImageFilterException("Radius is a required value");

        if(!is_int($options['radius']))
            throw new ImageFilterException("Radius parameter must be a valid integer value");

        $this->radius = $options['radius'];

        if(!isset($options['sigma']))
            throw new ImageFilterException("Sigma is a required value");

        if(!is_int($options['sigma']))
            throw new ImageFilterException("Sigma parameter must be a valid integer value");

        $this->sigma = $options['sigma'];

        return parent::applyFilter($sourceFile, $options, $inputFiles);
    }

}
