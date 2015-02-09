<?php
/**
 * Image filter service.
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
 * Image filter service.
 */
class ImageFilterService
{
    ///////////////////////////////////////////////////////////////////////////////////////
    // fields

    protected $filters;

    ///////////////////////////////////////////////////////////////////////////////////////
    // setters

    /**
     * Sets the list of available filters defined in shared-context.xml.
     *
     * @param array $filters An array of available filters keyed by name
     */
    public function setFilters($filters)
    {
        $this->filters = $filters;
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    // public methods

    /**
     * Applies a set of filters to image file.
     *
     * @param string $filters array containing filter defs
     * @param string $sourceFile The full path of source image file to operate on
     * @throws ImageFilterException on filter error
     * @return string The full path to the generated image file
     */
    public function applyFilters($filters, $sourceFile)
    {
        try
        {
            $inFile = $sourceFile;
            $outFile = null;

            foreach ($filters as $filter) {
                $outFile = $this->applyFilter($filter, $inFile);

                if ($inFile != $sourceFile)
                    @unlink($inFile);

                $inFile = $outFile;
            }

            return $outFile;
        }
        catch (Exception $e)
        {
            if (!empty($outFile) && $outFile != $sourceFile)
                @unlink($outFile);

            throw $e;
        }
    }

    /**
     * Applies a filter to image file.
     *
     * @param string $filterInfo The details of the filter to apply
     * @param string $sourceFile The full path of source image file to operate on
     * @throws ImageFilterException on filter error
     * @return string The full path to the generated image file
     */
    public function applyFilter($filterInfo, $sourceFile)
    {
        try
        {
            // make sure we're configured correctly
            if(empty($this->filters) || !is_array($this->filters))
                throw new ImageFilterException('No filters are defined in this context');

            // ...and that specified filter actually exists
            if(!array_key_exists($filterInfo['type'], $this->filters))
                throw new ImageFilterException("No filter for '{$filterInfo['type']}' is defined");

            $filter = $this->filters[$filterInfo['type']];

            $outputFile = $filter->applyFilter($sourceFile, $filterInfo);

            return $outputFile;
        }
        catch(Exception $e)
        {
            throw $e;
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    // protected methods

    /**
     * Utility method to clean up files.
     *
     * @param string $sourceFile
     * @param array $inputFiles
     */
    protected function deleteFiles($sourceFile, $inputFiles)
    {
        @unlink($sourceFile);    // delete the source file
        if(!empty($inputFiles))
        {
            // delete input files
            foreach($inputFiles as $f)
                @unlink($f);
        }
    }
}
