<?php
/**
 * Filter for adding watermark photo credit.
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
 * Filter for adding watermark photo credit.
 */
class PhotoCreditFilter extends AbstractPhotoCreditFilter
{
    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /* (non-PHPdoc)
     * @see AbstractImageFilter::executeExecImagick()
     */
    protected function executeExecImagick()
    {
        // get the width of the original image
        $retval = 1;
        $output = array();
        exec("{$this->imageIdentifyExecPath} -format %w ".escapeshellarg($this->sourceFile)." 2>&1", $output, $retval);

        if ($retval > 0)
            throw new ImageFilterException("Unable to read source file.");

        $width = $output[0] - ($this->padding * 2);

        // Step 1. Generate the photo credit
        $op = '';

        // store original values
        $targetFile = $this->targetFile;

        $this->targetFile = FileSystemUtils::secureTmpname($this->workDir, 'credit', '.'.$this->outputType);

        $op .= " -background '{$this->backgroundColor}'";

        if($this->fontColor != null)
            $op .= " -fill '{$this->fontColor}'";

        if($this->fontFamily != null)
            $op .= " -font '{$this->fontFamily}'";

        if($this->fontStyle != null)
            $op .= " -style '{$this->fontStyle}'";

        if($this->fontWeight != null)
            $op .= " -weight '{$this->fontWeight}'";

        $op .= " -pointsize {$this->fontSize}";

        // Force height to fontSize because IM < version 6.5.2-4 will ignore -pointsize to make the text fill the maximum width specified
        // I think this will limit all credit to 1 line of text
        $op .= " -size {$width}x{$this->fontSize}";

        $op .= " -gravity {$this->anchor}";

        $op .= " label:\"".preg_replace('/"/','\"',$this->text)."\"";

        $op .= " -bordercolor '{$this->backgroundColor}'";

        $op .= " -border {$this->padding}x{$this->padding}";

        $credit = ImagickExecFilterHelper::executeFilter($this, $op, true);


        // Step 2. Apply the photo credit

        // restore original values
        $this->targetFile = $targetFile;

        $op = '';

        if($this->type == 'overlay')
        {
            $op .= " -gravity {$this->anchor}";

            $op .= " -draw 'image over 0,0 0,0 \"{$credit}\"'";
        }
        else if($this->type == 'add')
        {
            $op .= " -background '{$this->backgroundColor}'";

            $op .= " {$credit}";

            if (preg_match('/^North/i', $this->anchor))
                $op .= " +swap";

            if (preg_match('/^(North|South)$/i', $this->anchor))
                $op .= " -gravity Center";
            else if (preg_match('/East$/i', $this->anchor))
                $op .= " -gravity East";

            $op .= " -append";
        }

        return ImagickExecFilterHelper::executeFilter($this, $op);
    }

}
