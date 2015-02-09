<?php
/**
 * Filter for adding watermark text or images.
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
 * Filter for adding watermark text or images.
 */
class WatermarkFilter extends AbstractWatermarkFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        // Step 1. Generate the watermark
        $op = '';

        // store original values
        $fileType = $this->outputType;
        $targetFile = $this->targetFile;

        $this->outputAlpha = true;

        if($this->type == 'text')
        {
            $this->outputType = 'png';
            $this->targetFile = FileSystemUtils::secureTmpname($this->workDir, 'watermark', '.'.$this->outputType);

            $op .= " -background transparent";

            $op .= " -fill '{$this->fontColor}'";

            if (!empty($this->fontFamily))
                $op .= " -font '{$this->fontFamily}'";

            if (!empty($this->fontStyle))
                $op .= " -style '{$this->fontStyle}'";

            if (!empty($this->fontWeight))
                $op .= " -weight '{$this->fontWeight}'";

            $op .= " -size {$this->width}x{$this->height}";

            if (!empty($this->fontSize))
                $op .= " -pointsize {$this->fontSize}";

            $op .= " caption:\"".preg_replace('/"/','\"',$this->text)."\"";

            $watermark = ImagickExecFilterHelper::executeFilter($this, $op, true);

        }
        else if($this->type == 'image')
            $watermark = $this->image;

        // Step 2. Apply the watermark

        // restore original values
        $this->outputType = $fileType;
        $this->targetFile = $targetFile;

        /** This only works with IM > 6.5.3-4 **/
        /*$op = "\"{$watermark}\"";

        $op .= " -compose dissolve";

        $op .= " -define compose:args={$this->opacity}";

        $op .= " -gravity {$this->anchor}";

        $op .= " -geometry {$this->offsetX}{$this->offsetY}";

        $op .= " -composite";

        $image = ImagickExecFilterHelper::executeFilter($this, $op);*/

        $inFile = escapeshellarg($this->sourceFile);
        $outFile = escapeshellarg($this->targetFile);

        $op = " -dissolve {$this->opacity}";

        $op .= " -gravity {$this->anchor}";

        $op .= " -geometry {$this->offsetX}{$this->offsetY}";

        $op .= " \"{$watermark}\"";

        $op .= " {$inFile}";

        if($this->outputAlpha != null)
        {
            if($this->outputAlpha == true)
                $op .= " -alpha On";
            else
                $op .= " -alpha Off";
        }

        $op .= " -quality {$this->outputQuality}";

        $cmdParams = "{$op} {$outFile}";

        $cmd = "{$this->imageCompositeExecPath} {$cmdParams} 2>&1";

        $retval = 1;
        $output = array();

        exec($cmd, $output, $retval);

        if($retval > 0)
            throw new ImageFilterException("Image filter process failed", $output);

        @unlink($watermark);

        return $this->targetFile;
    }

}
