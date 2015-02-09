<?php

 /**
 * MediaFilterer
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

class MediaFilterer extends AbstractFilterer
{
    protected $RegulatedNodeService;
    public function setRegulatedNodeService(RegulatedNodeService $RegulatedNodeService)
    {
        $this->RegulatedNodeService = $RegulatedNodeService;
    }

    public function showThumbnails()
    {
        $json = $this->getParameter('value');
        if (empty($json))
            return '';

        $json = JSONUtils::decode($json);

        $thumbs = $this->getParameter('thumbnails');
        $tlist = array();
        if (!empty($thumbs))
            $tlist = explode(',',$thumbs);

        $xmod = StringUtils::strToBool($this->getParameter('xmod'));
        $markup = '';
        if ($xmod) {
            foreach ($json as $thumb) {
                if ((!empty($list) && in_array($thumb->value, $tlist)) || empty($tlist))
                    $markup .= '<image id="'.$thumb->url.'" width="full"/>';
            }
        }
        else {
            $markup .= '<ul class="thumbnail-list">';
            foreach ($json as $thumb) {
                if ((!empty($tlist) && in_array($thumb->value, $tlist)) || empty($tlist))
                    $markup .= '<li><p><img src="'.$thumb->url.'" alt="'.$this->getLocal('Title').'" /></p><p><strong>Size:</strong> '.$thumb->value.'</p></li>';
            }
            $markup .= '</ul>';
        }

        return $markup;
    }

    public function showOriginal()
    {
        $nodeRef = new NodeRef($this->getLocal('Element'),$this->getLocal('Slug'));
        $node = $this->RegulatedNodeService->getByNodeRef($nodeRef, new NodePartials('','#original.#url,#original.#width,#original.#height'));

        if ($node != null) {
            if (! $node->hasOutTags('#original'))
                return "<p>No original file information found.</p>";

            $html = '<p>'."\n".
                    '    <strong>Original File:</strong>'."\n".
                    '    <a id="upload-url-link" href="'.$node->jump('#original.#url').'" target="_blank">'.$node->jump('#original.#url').'</a>'."\n".
                    '</p>'."\n";

            $html .= '<p>'."\n".
                    '    <strong>Dimensions:</strong> <span id="dimensions-span">'.$node->jump('#original.#width').' x '.$node->jump('#original.#height').'</span>'."\n".
                    '</p>'."\n";
            
            return $html;
        }
        else {
            return '<p>No original file information found.</p>';
        }
    }
}