<?php
/**
 * Base class for all image filters.
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
 * Base class for all image filters.
 */
abstract class AbstractImageFilter
{
    //////////////////////////////////////////////////////////////////////////
    // fields

    protected $Request;

    protected $workDir = null;
    protected $imageConvertExecPath = 'convert';
    protected $imageIdentifyExecPath = 'identify';
    protected $imageCompositeExecPath = 'composite';
    protected $imageFilterProcessorType = 'exec-imagick';

    public $sourceFile = null;
    public $options = null;

    public $outputType = null;
    public $outputQuality = null;
    public $outputAlpha = null;

    public $interlace = null;

    public $targetFile = null;

    protected $anchor = null;
    protected $offsetX = null;
    protected $offsetY = null;

    protected $fontFamily = null;
    protected $fontSize = null;
    protected $fontColor = null;
    protected $fontWeight = null;
    protected $fontStyle = null;

    protected $rotate = null;

    //////////////////////////////////////////////////////////////////////////
    // auto-wired setters

    public function setRequest(Request $request)
    {
        $this->Request = $request;
    }

    /**
     * Auto-injected work dir path from pluginconfig.php
     *
     * @param string $vendorCacheDirectory
     */
    public function setVendorCacheDirectory($vendorCacheDirectory)
    {
        $this->workDir = $vendorCacheDirectory;
    }

    /**
     * Auto-injected path to image convert executable from pluginconfig.php
     *
     * @param string $imageConvertExecPath
     */
    public function setThumbnailsPathToImageMagickConvert($imageConvertExecPath)
    {
        $this->imageConvertExecPath = $imageConvertExecPath;
    }

    /**
     * Auto-injected path to image identify executable from pluginconfig.php
     *
     * @param string $imageIdentifyExecPath
     */
    public function setThumbnailsPathToImageMagickIdentify($imageIdentifyExecPath)
    {
        $this->imageIdentifyExecPath = $imageIdentifyExecPath;
    }

    /**
     * Auto-injected path to image composite executable from pluginconfig.php
     *
     * @param string $imageCompositeExecPath
     */
    public function setThumbnailsPathToImageMagickComposite($imageCompositeExecPath)
    {
        $this->imageCompositeExecPath = $imageCompositeExecPath;
    }

    /**
     * Auto-injected filter processor type from pluginconfig.php
     *
     * @param string $imageFilterProcessorType
     */
    public function setThumbnailsSoftwareMode($imageFilterProcessorType)
    {
        $this->imageFilterProcessorType = $imageFilterProcessorType;
    }

    /**
     * Auto-injected filter processor type from pluginconfig.php
     *
     * @param int $thumbnailsOutputQuality
     */
    public function setThumbnailsOutputQuality($thumbnailsOutputQuality)
    {
        $this->outputQuality = (int) $thumbnailsOutputQuality;
    }

    /**
     * Auto-injected filter processor type from pluginconfig.php
     *
     * @param string $thumbnailsInterlace
     */
    public function setThumbnailsInterlace($thumbnailsInterlace)
    {
        $this->interlace = $thumbnailsInterlace;
    }

    //////////////////////////////////////////////////////////////////////////
    // public methods

    /**
     * The worker method that performs the filter operation.
     *
     * Note the source file, options and input files are never modified by the
     * filter, it is up to the caller to delete the files if required.
     *
     * @param string $sourceFile The source file to perform the operation on
     * @param array $options Optional list of filter-specific options
     * @throws Exception if an error occurs.
     * @return string The full path of the output file.
     */
    public function applyFilter($sourceFile, $options=null)
    {
        $this->sourceFile = $sourceFile;
        $this->options = $options;

        if(is_array($options))
        {
            // default to jpg type if not set
            $this->outputType = !empty($options['outputType']) ? $options['outputType'] : 'jpg';
            // default to quality 90 if not set
            if (null === $this->outputQuality) {
                $this->outputQuality = !empty($options['outputQuality']) ? (int)$options['outputQuality'] : 90;
            }
            // only set alpha if actually specified
            if(array_key_exists('outputAlpha', $options))
                $this->outputAlpha = empty($options['outputAlpha']) ? false : true;
        }

        return $this->doApplyFilter();
    }

    //////////////////////////////////////////////////////////////////////////
    // worker methods

    /**
     * This is the method that should be called to do actual work.
     *
     * @throws ImageFilterException on filter error
     */
    protected final function doApplyFilter()
    {
        try {
            // create a unique output file name
            $this->targetFile = FileSystemUtils::secureTmpname($this->workDir, 'filter', '.'.$this->outputType);

            // now determine processor type and go do the work
            switch($this->imageFilterProcessorType)
            {
                // ** only supports 'exec_imagick' for now **
                case 'exec_imagick':
                default:
                    return $this->executeExecImagick();
            }
        }
        catch (Exception $e) {
            // clean up
            @unlink($this->targetFile);
            throw $e;
        }
    }

    //////////////////////////////////////////////////////////////////////////
    // processor-specific execute methods
    // ** only 'exec-imagick' supported for now **

    /**
     * Called when imageFilterProcessorType == 'exec-imagick'.
     *
     * Must be over-ridden by subclasses to perform operation.
     */
    protected abstract function executeExecImagick();


    //////////////////////////////////////////////////////////////////////////
    // helper methods

    /**
     * Populates the anchor, offsetX and offsetY fields from options.
     *
     * @param $options The options array from client
     * @throws ImageFilterException If invalid field values
     */
    protected function populateAnchorFields($options)
    {
        $this->anchor = !empty($options['anchor']) ? $options['anchor'] : 'Center';
        $anchors = array('northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south', 'southeast');
        if(!in_array(strtolower($this->anchor), $anchors))
            throw new ImageFilterException("Anchor must be one of 'NorthWest', 'North', 'NorthEast', 'West', 'Center', 'East', 'SouthWest', 'South' or 'SouthEast'");

        // Offsets need to be signed since it's usually used as part of -geometry
        if (!empty($options['offsetX']) && !is_numeric($options['offsetX']))
            throw new ImageFilterException("OffsetX size must be an integer value");
        $this->offsetX = sprintf("%+d", (!empty($options['offsetX']) ? intval($options['offsetX']) : 0));

        if(!empty($options['offsetY']) && !is_numeric($options['offsetY']))
            throw new ImageFilterException("OffsetY size must be an integer value");
        $this->offsetY = sprintf("%+d", (!empty($options['offsetY']) ? intval($options['offsetY']) : 0));
    }

    /**
     * Populates the font fields (fontFamily, fontColor, fontSize, fontWeight and fontStyle) from options.
     *
     * @param $options The options array from client
     * @throws ImageFilterException If invalid field values
     */
    protected function populateFontFields($options)
    {
        $this->fontFamily = !empty($options['fontFamily']) ? $options['fontFamily'] : null;

        // Colors must be hex
        $this->fontColor = ! empty($options['fontColor']) ? '#'.preg_replace('/[^a-f0-9]/i', '', $options['fontColor']) : "#ffffff";
        if (! empty($this->fontColor) && !preg_match('/^#[a-f0-9]{6}$/i', $this->fontColor))
            throw new ImageFilterException("Font Color must be a valid hex value ");

        if (!empty($options['fontSize']) && !is_numeric($options['fontSize']))
            throw new ImageFilterException("Font size must be a valid integer value");
        $this->fontSize = !empty($options['fontSize']) ? intval($options['fontSize']) : 0;

        $this->fontWeight = !empty($options['fontWeight']) ? ucfirst($options['fontWeight']) : null;
        $weights = array('normal', 'bolder', 'bold', 'lighter');
        if($this->fontWeight != null && !in_array(strtolower($this->fontWeight), $weights))
            throw new ImageFilterException("Font weight must be one of 'normal', 'bolder', 'bold' or 'lighter'");

        $this->fontStyle = !empty($options['fontStyle']) ? strtolower($options['fontStyle']) : null;
        $styles = array('normal', 'italic', 'oblique');
        if($this->fontStyle != null && !in_array($this->fontStyle, $styles))
            throw new ImageFilterException("Font style must be one of 'normal', 'italic' or 'oblique'");

    }

    /**
     * Populates the rotate field (the angle) from options.
     *
     * @param $options The options array from client
     * @throws ImageFilterException If invalid field values
     */
    protected function populateRotateField($options)
    {
        if (!empty($options['rotate']) && !is_numeric($options['rotate']))
            throw new ImageFilterException("Rotate option must be a valid integer value");
        $this->rotate = !empty($options['rotate']) ? intval($options['rotate']) : 0;

        if($this->rotate != null && ($this->rotate < -180 || $this->rotate > 180))
            throw new ImageFilterException("Rotate option must be between -180 and +180");
    }

    /**
     * Checks and prepares the image for use.
     *
     * @param  $data  base64 encoded data string
     * @return string file path on disk
     * @throws ImageFilterException
     */
    protected function prepareImageData($data) {
        if (is_array($data)) {
            $uploadedFiles = $this->Request->getUploadedFiles();
            $sourceFileName = $data['filename'];
            $filename = null;

            foreach($uploadedFiles as $uploadFile)
            {
                if($uploadFile->getName() == $sourceFileName)
                {
                    $filename = $uploadFile->getTemporaryName();
                    break;
                }
            }

            if(empty($filename))
                throw new ImageFilterException("File '{$filename}' was not uploaded");

            $file = file_get_contents($filename);
            unlink($filename);
        }
        else if (preg_match('/^data:/',$data)) {
            $data = substr($data, strpos($data, ",")+1);

            if (!$file = base64_decode($data,true))
                throw new ImageFilterException('Data string is not a valid base64 encoded file.');
        }
        else
            throw new ImageFilterException('No file was provided.');

        // create a unique output file name
        $sourceFile = FileSystemUtils::secureTmpname($this->workDir, 'base64fetch');
        file_put_contents($sourceFile, $file);

        return $sourceFile;
    }

    /**
     * Helper method for filters that use exec().
     *
     * @param string $cmdParams The command line parameters
     * @return array The output from exec()
     * @throws ImageFilterException exec() returns > 0
     */
    public function exec($cmdParams)
    {
        $cmd = "{$this->imageConvertExecPath} {$cmdParams} 2>&1";

        $retval = 1;
        $output = array();

        exec($cmd, $output, $retval);

        if($retval > 0)
            throw new ImageFilterException("Image filter process failed", $output);

        return $output;
    }

}
