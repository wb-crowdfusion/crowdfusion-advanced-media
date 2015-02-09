<?php
/**
 * MediaAssetHandler
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2010 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted under the terms of the BSD License.
 *
 * @package     CrowdFusion
 * @copyright   2009-2010 Crowd Fusion Inc.
 * @license     http://www.opensource.org/licenses/bsd-license.php BSD License
 * @version     $Id: MediaAssetHandler.php 2012 2010-02-17 13:34:44Z ryans $
 */

/**
 * MediaAssetHandler
 *
 * @package     CrowdFusion
 */
class MediaAssetHandler {


    /////////////////////
    // HANDLER ACTIONS //
    /////////////////////

    /* Bound to "cms-head" to include the JavaScript files and CSS needed to enable the client-side
       Media functionality */
    public function generateAsset(Transport $output)
    {
        $output->String .= <<<EOD
            {% asset js?src=/js/services/AsyncQueue.js&pack=true %}
            {% asset js?src=/js/services/MediaService.js&pack=true %}
            {% asset js?src=/js/services/NodeObjectCache.js&pack=true %}

            <script type="text/javascript">
                NodeObjectCache.init({
                    worker : '{% asset version?src=/js/services/worker.js %}'
                });
            </script>

            {% asset js?src=/js/jquery.fileupload.js&pack=true %}
            {% asset js?src=/js/jquery.fileupload-ui.js&pack=true %}
            {% asset js?src=/js/HTML5Uploader.js&pack=true %}

            {% asset js?src=/js/jpicker-1.1.5.js&pack=true %}

            {% asset js?src=/js/widgets/MediaTagWidget.js&pack=true %}
            {% asset js?src=/js/widgets/PrimaryMediaTagWidget.js&pack=true %}
            {% asset js?src=/js/widgets/MediaAddWidget.js&pack=true %}
            {% asset js?src=/js/widgets/FileTagWidget.js&pack=true %}
            {% asset js?src=/js/widgets/MediaLibraryTagWidget.js&pack=true %}
            {% asset js?src=/js/widgets/MediaGalleryTagWidget.js&pack=true %}

            {% asset js?src=/js/imagefilters/ImageFilterTool.js %}

            {% asset js?src=/js/imagefilters/AbstractImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/ResizeImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/CropImageFilter.js&pack=true %}
            <!-- {% asset js?src=/js/imagefilters/VisualCropImageFilter.js&pack=true %} -->
            {% asset js?src=/js/imagefilters/RotateImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/MatteImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/WatermarkImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/PhotoCreditImageFilter.js&pack=true %}
            {% asset js?src=/js/imagefilters/ThumbnailImageFilter.js&pack=true %}

            {% asset css?src=/css/jquery.fileupload-ui.css&min=true %}

            {% asset css?src=/css/jPicker-1.1.5.css&min=true %}

            {% asset css?src=/css/media-add-widget.css&min=true %}
            {% asset css?src=/css/media-library-widget.css&min=true %}
            {% asset css?src=/css/media-gallery-widget.css&min=true %}
            {% asset css?src=/css/thumbnail-list.css&min=true %}
            {% asset css?src=/css/media-ie.css&min=true&iecond=IE %}
            {% asset css?src=/css/media-ie7.css&min=true&iecond=IE 7 %}

            {% asset css?src=/css/media-tools.css&min=true %}

            <style type="text/css">
                /* jquery fileupload style overrides */

                form.file_upload, form.file_upload_small, form.file_upload_large {
                    padding: 3px 6px;
                }

                /*
                form.file_upload, form.file_upload_small, form.file_upload_large {
                    position: relative;
                    overflow: hidden;
                    direction: ltr;
                    cursor: pointer;
                    text-align: center;
                    font-size: 9px;
                    font-weight: bold;
                    text-decoration: underline;
                    color: #008799;
                    -moz-border-radius: 0;
                    -webkit-border-radius: 0;
                    border-radius: 0;
                    padding: 4px 0 0 0;
                    background: none;
                    border: 0;
                    margin: 3px 0 0 0px;
                    line-height: 12px;
                }

                form.file_upload:hover, form.file_upload_small:hover, form.file_upload_large:hover {
                	color: #d77400;
                }
                */

            </style>
EOD;
    }

}
