<?php

class MediaEditCmsBuilder extends EditCmsBuilder
{
    /**
     * Used when the media library drag/drop functionality drops
     * an image into the epic editor (markdown).
     *
     * @var string
     */
    protected $dropImageToMarkdownTemplate;

    /**
     * @param string $value
     */
    public function setMediaLibraryDropImageToMarkdownTemplate($value)
    {
        $this->dropImageToMarkdownTemplate = $value;
    }

    protected function _buildWidgetOptions($schemafield,$attributes) {

        // Non-file related tag widget defaults to media-quick-add
        if (isset($attributes['class'])) {
            switch($attributes['class']) {
                case 'MediaGalleryTagWidget':
                case 'MediaTagWidget':
                case 'PrimaryMediaTagWidget':
                case 'MediaLibraryTagWidget':
                    if (empty($attributes['quick-add-action']))
                        $attributes['quick-add-action'] = 'media-quick-add';
                break;
            }
        }

        $opt = parent::_buildWidgetOptions($schemafield,$attributes);

        // Add/edit control action detection
        $opt[] = "			IsNewControlAction: {% if Data:CONTROL_ACTION_METHOD eq 'edit' %}false{% else %}true{% endif %}";

        // set remove and update nonces for non-fieldlike schemas, and always for media galleries
        if (!$schemafield->isFieldlike() || $attributes['class'] == 'MediaGalleryTagWidget') {
            $opt[] = "			RemoveTagNonce: '{% filter nonce?action=node-remove-tag %}'";
            $opt[] = "			UpdateTagsNonce: '{% filter nonce?action=node-update-tags %}'";
        }

        if($schemafield['Fieldlike'])
            $opt[] = "          IsFieldLike: ".$schemafield['Fieldlike'];

        if(!empty($attributes['default-quick-add-element']))
            $opt[] = "          DefaultQuickAddElement: '".($attributes['default-quick-add-element'])."'";

        //@deprecated
        if(!empty($attributes['default-quickadd-element']))
            $opt[] = "          DefaultQuickAddElement: '".($attributes['default-quickadd-element'])."'";

        if(!empty($attributes['file-mask']))
            $opt[] = "			FileMask: '".($attributes['file-mask'])."'";

        if (isset($attributes['class'])) {
            switch($attributes['class']) {
                case 'MediaGalleryTagWidget':
                case 'MediaTagWidget':
                case 'PrimaryMediaTagWidget':
                case 'MediaLibraryTagWidget':
                    $opt[] = "              QuickAddURL: '{% filter contexts-get-by-slug?Slug=api&Property=BaseURL %}/media/quick-add.json/'";
                break;
                case 'FileTagWidget':
                    $opt[] = "              QuickAddURL: '{% filter contexts-get-by-slug?Slug=api&Property=BaseURL %}/files/quick-add.json/'";
                break;
            }
        }

        if (isset($attributes['allow-quick-add'])) {
            if (StringUtils::strToBool($attributes['allow-quick-add']))
                $opt[] = "              AllowQuickAdd: true";
            else
                $opt[] = "              AllowQuickAdd: false";
        }

        if ($this->dropImageToMarkdownTemplate) {
            $opt[] = sprintf("              DropImageToMarkdownTemplate: '%s'", $this->dropImageToMarkdownTemplate);
        }

        return $opt;
    }

    protected $isMediaWidget = false;

    protected function tagwidget() {
        $attributes = array_merge(
            array(
                'id' => '',
                'width' => 'quarter',
                'class' => 'NodeTagWidget',
                'partial' => '',
                'edit_perms' => null,
                'view_perms' => null,
                'node_edit_perms' => null,
                'node_view_perms' => null,
                ),
                $this->_attributes());
        extract($attributes);

        $this->attributes = $attributes;

        if(empty($id))
            throw new Exception('Missing id attribute on tagwidget');

        if(substr($id,0,1) != '#')
            throw new Exception('The id attribute must be a valid role beginning with #');

        if(!$this->__hasPermission($view_perms) || !$this->__hasNodePermission($node_view_perms))
            return;

        $id = ltrim($id, '#');

        $schemafield = $this->schema->getTagDef($id);

        if(empty($partial))
            $partial = $schemafield->Partial->toString();

        $widgetOptions = $this->_buildWidgetOptions($schemafield,$attributes);

        $widgetOptions[] = "ReadOnly: " . ($this->__hasPermission($edit_perms) && $this->__hasNodePermission($node_edit_perms) ? "false" : "true");

        $widgetOptions = "{\n".implode(",\n", $widgetOptions)."\n}";

        $uid = $this->_generateUniqueID($id);

        $taggableRecord = 'taggableRecord';
        if (array_key_exists('uid', $this->attributes))
            $taggableRecord = 'uniqueTaggableRecord'.$this->attributes['uid'];

        $this->js[] = " new {$class}(
            document.{$taggableRecord},
            new TagPartial('{$partial}'),
            '#{$uid}',
            {$widgetOptions}
        );";

        $this->xhtml[] = "          <li class=\"input-{$width}-width field {$this->_fieldClasses($schemafield)}\">";
        $this->xhtml[] = "              <div id=\"{$uid}\"></div>";

        if(array_key_exists('class', $this->attributes) && $this->attributes['class'] == 'MediaLibraryTagWidget')
        {
            $this->isMediaWidget = true;

            $div = array_pop($this->xhtml); //save the widget div
            array_pop($this->xhtml); //remove li
            $this->xhtml[] = $div; //put widget div back

        } else {
            $this->isMediaWidget = false;
        }
    }

    protected function _tagwidget() {
        //don't close out the li
        if(!$this->isMediaWidget)
            return parent::_tagwidget();
    }

    protected function videoplayer() {
        $attributes = array_merge(
            array(
                'id' => '',
                'width' => 'quarter',
                'view_perms' => null,
                'node_view_perms' => null,
                ),
                $this->_attributes());
        extract($attributes);

        $this->attributes = $attributes;

        if(empty($id))
            throw new Exception('Missing id attribute on videoplayer');

        if(substr($id,0,1) != '#')
            throw new Exception('The id attribute must be a valid role beginning with #');

        if(!$this->__hasPermission($view_perms) || !$this->__hasNodePermission($node_view_perms))
            return;

        $id = ltrim($id, '#');

//        $schemafield = $this->schema->getMetaDef($id);

        $fullid = "#{$id}";

        $this->xhtml[] = "          <li class=\"input-{$width}-width field\">";
        $this->xhtml[] = "              <div style=\"height:325px;\">";
        $this->xhtml[] = "                  <object width='400' height='325' id='flvPlayer'>";
        $this->xhtml[] = "                      <param name='allowFullScreen' value='true'>";
        $this->xhtml[] = "                      <param name=\"allowScriptAccess\" value=\"always\">";
        $this->xhtml[] = "                      <param name='movie' value='{% asset version?src=/flash/OSplayer.swf %}?movie=%{$fullid}%&btncolor=0x333333&accentcolor=0x31b8e9&txtcolor=0xdddddd&volume=30&autoload=on&autoplay=off&vTitle=&showTitle=no'>";
        $this->xhtml[] = "                      <embed src='{% asset version?src=/flash/OSplayer.swf %}?movie=%{$fullid}%&btncolor=0x333333&accentcolor=0x31b8e9&txtcolor=0xdddddd&volume=30&autoload=on&autoplay=off&vTitle=&showTitle=no' width='400' height='325' allowFullScreen='true' type='application/x-shockwave-flash' allowScriptAccess='always'>";
        $this->xhtml[] = "                  </object>";
        $this->xhtml[] = "              </div>";

    }

    protected function _videoplayer() {
        $this->__closeLI();
    }

    /*
 <object width='400' height='325' id='flvPlayer'>
  <param name='allowFullScreen' value='true'>
   <param name="allowScriptAccess" value="always">
  <param name='movie' value='OSplayer.swf?movie=mario.flv&btncolor=0x333333&accentcolor=0x31b8e9&txtcolor=0xdddddd&volume=30&autoload=on&autoplay=off&vTitle=Super Mario Brothers Lego Edition&showTitle=yes'>
  <embed src='OSplayer.swf?movie=mario.flv&btncolor=0x333333&accentcolor=0x31b8e9&txtcolor=0xdddddd&volume=30&autoload=on&autoplay=off&vTitle=Super Mario Brothers Lego Edition&showTitle=yes' width='400' height='325' allowFullScreen='true' type='application/x-shockwave-flash' allowScriptAccess='always'>
 </object>
     */

    protected function audioplayer() {

        $attributes = array_merge(
            array(
                'id' => '',
                'width' => 'quarter',
                'view_perms' => null,
                'node_view_perms' => null,
                'player_mode' => 'quicktime'
                ),
                $this->_attributes());
        extract($attributes);

        $this->attributes = $attributes;

        if(empty($id))
            throw new Exception('Missing id attribute on audioplayer');

        if(substr($id,0,1) != '#')
            throw new Exception('The id attribute must be a valid role beginning with #');

        if(!$this->__hasPermission($view_perms) || !$this->__hasNodePermission($node_view_perms))
            return;

        $id = ltrim($id, '#');

        //$schemafield = $this->schema->getMetaDef($id);

        $fullid = "#{$id}";

        $this->xhtml[] = "          {% if Data:{$fullid} %}";
        $this->xhtml[] = "          <li class=\"input-{$width}-width field\">";
        $this->xhtml[] = "              <div style=\"height:17px;\">";
        if($player_mode == 'quicktime') {
            $this->xhtml[] = "                  <EMBED SRC=\"%{$fullid}.#url%\" QTSRC=\"%{$fullid}.#url%\" HEIGHT=16 WIDTH=100 TYPE=\"video/quicktime\" PLUGINSPAGE=\"http://www.apple.com/quicktime/download/\" AUTOPLAY=\"false\" CONTROLLER=\"true\" />";
        } else if($player_mode == 'flash') {
            $this->xhtml[] = "                  <object type=\"application/x-shockwave-flash\"";
            $this->xhtml[] = "                      data=\"{% asset version?src=/flash/musicplayer.swf %}?&song_url=%{$fullid}.#url%\"";
            $this->xhtml[] = "                      width=\"17\" height=\"17\">";
            $this->xhtml[] = "                      <param name=\"movie\"";
            $this->xhtml[] = "                          value=\"{% asset version?src=/flash/musicplayer.swf %}?&song_url=%{$fullid}.#url%\" />";
            $this->xhtml[] = "                      <span>NO FLASH</span>";
            $this->xhtml[] = "                  </object>";
        }
        $this->xhtml[] = "              </div>";
        $this->xhtml[] = "          {% endif %}";

    }

    protected function _audioplayer() {
        $this->__closeLI();
    }
}
