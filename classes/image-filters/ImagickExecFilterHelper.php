<?php
/**
 * Helper for exec-imagick filters.
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
 * Helper for exec-imagick filters.
 */
class ImagickExecFilterHelper
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    //////////////////////////////////////////////////////////////////////////
    // interface methods

    //////////////////////////////////////////////////////////////////////////
    // private/protected methods

    /**
     * Helper method to add common parameters and code.
     *
     * @param AbstractImageFilter $filter The filter to execute method on.
     * @param string $op The filter-specific command line options
     * @param $ignoreSourceFile If true source file is not added to exec cmdParams
     * @return string The filter's target file
     */
    public static function executeFilter(AbstractImageFilter $filter, $op, $ignoreSourceFile = false)
    {
        if($filter->outputAlpha != null)
        {
            if($filter->outputAlpha == true)
                $op .= " -alpha On";
            else
                $op .= " -alpha Off";
        }

        if (null !== $filter->interlace) {
            $op .= " -interlace {$filter->interlace}";
        }

        $op .= " -quality {$filter->outputQuality}";

        $inFile = escapeshellarg($filter->sourceFile);
        $outFile = escapeshellarg($filter->targetFile);

        if($ignoreSourceFile)
            $cmdParams = "{$op} {$outFile}";
        else
            $cmdParams = "{$inFile} {$op} {$outFile}";

        $filter->exec($cmdParams);

        return $filter->targetFile;
    }

}

