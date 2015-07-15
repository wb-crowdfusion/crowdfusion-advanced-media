var MediaLibraryTagWidget = function(node,tagPartial,domID,options) {
    //Only one instance of this class is supported, return if already instantiated
    if($('.media-library-widget').length > 0) return;

    //CREATE OUTER WIDGET CONTAINER AND DOMID ANCHOR POINT FOR PARENT CLASS
    var container = $('<div class="media-library-widget" style="display:none;"><div><div id="media-library-widget-container"></div></div></div>');
    $('#app-sub-menu').before(container);

    //remove the LI created by the xbuilder
    $(domID).remove();

    //INITIALIZE DEFAULT OPTIONS
    options = $.extend({
        ShowElementAndStatus : true,
        ShowThumbnailDragHandles : null,
        MarkdownTagImage : null
    }, options || {});

    options.AllowMultiple = true;
    options.AllowQuickAdd = true;
    options.ActivateButtonLabel = 'Media to Library';
    options.ShowOriginalSize = false;

    this.intervals = {};

	MediaLibraryTagWidget.superclass.constructor.call(this,node,tagPartial,'#media-library-widget-container',options);
};
extend(MediaLibraryTagWidget,MediaTagWidget);

//OVERRIDE FUNCTIONS FROM SUPER CLASS TO ADD MEDIA-SPECIFIC DOM
MediaLibraryTagWidget.prototype._handleInitialized = function() {

	var me = this;
    var sidebar = $('#app-sidebar');

	//EXECUTE DEFAULT BEHAVIOR
	MediaLibraryTagWidget.superclass._handleInitialized.call(this);

    // Set default quickadd element
    //if (this.Options.DefaultQuickAddElement != null)
        //this.DOM.searchResultsQuickAddTypeSelect.val(this.Options.DefaultQuickAddElement);

    this.DOM.container.addClass("media-library-tag-widget");

    this.DOM.appContent = $('#app-content');

    ////////////////////////////////////
    // REARRANGE UI FOR MEDIA LIBRARY //
    ////////////////////////////////////
    this.DOM.label.remove();

    this.DOM.widgetPanel = $('.media-library-widget');

    this.DOM.activatePanelLink = $('<div class="media-library-widget-activate-link"><a href="#" title="Show/Hide Media Library"><em>0</em>Media Library</a></div>');

    this.DOM.widgetPanel.before(this.DOM.activatePanelLink);

    this.DOM.activatePanelLink.find('a').click(function(event){
        event.preventDefault();
        var viewState = $.cookie('MediaLibraryViewState');
        if(viewState == 'closed' || viewState == null) {
            $.cookie('MediaLibraryViewState','open',{path:'/'});
            me._adjustHeight.apply(me,[sidebar]);
            $('#app-sidebar').css('overflow','hidden'); //hack
            me.DOM.widgetPanel.slideDown();
        }
        else {
            $.cookie('MediaLibraryViewState','closed',{path:'/'});
            me.DOM.widgetPanel.slideUp('def',function(){ //hack
                $('#app-sidebar').css('overflow','auto');
            });
        }
    });

    this.DOM.libraryItemCount = this.DOM.activatePanelLink.find('em');

    this.DOM.widgetPanel.append(this.DOM.chosenList);

    //MOVE SEARCH CONTAINER TO BODY, SO IT DOESN'T GET CLIPPED BY THE SIDE BAR (OVERFLOW HIDDEN)
    $('body').append(this.DOM.searchContainer);

    var viewState = $.cookie('MediaLibraryViewState');
    if(viewState == 'open') {
        $('#app-sidebar').css('overflow','hidden'); //hack
        this.DOM.widgetPanel.show();
    }

    sidebar.bind('RESIZE',function(){
        me._adjustHeight.apply(me,[sidebar]);
    });
    this._adjustHeight(sidebar);

    this._buildFilterDialog();

    //BIND TO MEDIA NODE CACHE, RENDER THE CHOSEN LIST IF A MEDIA ITEM IS REMOVED FROM CACHE
    //THIS HAPPENS WHEN A MEDIA NODE IS ALTERED OR HAS EXPIRED
    this.mediaCacheRefreshTimer = null;
    $(document).bind('NodeObjectCache.removeItem',function(event,nodeRef){
        var tags = me.Options.ShowChosenList ? me.taggableObject.getTags(me.Options.TagDirection,me.tagPartial) : new Array();
        $(tags).each(function(i,tag){
            if(tag.TagElement+':'+tag.TagSlug == nodeRef) {
                //bury repeated calls
                if(me.mediaCacheRefreshTimer != null)
                    clearTimeout(me.mediaCacheRefreshTimer);
                me.mediaCacheRefreshTimer = setTimeout(function(){
                    me._renderChosenList.apply(me);
                },500);
                return false;
            }
        });
    });
};

MediaLibraryTagWidget.prototype._adjustHeight = function(sidebar) {
    this.DOM.chosenList.height((sidebar.height()-106)+'px');
};

MediaLibraryTagWidget.prototype._handlePostInitialize = function() {

    var me = this;
    //CREATE DROPPABLES
    $('.wysiwyg').each(function(i,e){
        var editorId = $(e).find('> div > div').attr('id');
        var overlay = me._createDropOverlay.apply(me,['drop to insert image','release to insert image',editorId]);
        overlay.droppable({
            accept: '.media-draggable',
            hoverClass: 'hover',
            over: function(){
                overlay.text(overlay.data('HoverMessage'));
            },
            out: function(){
                overlay.text(overlay.data('ActiveMessage'));
            },
            activate: function(event, ui){
                var editor = $(e).find('span.mceEditor');
                if(editor.length > 0) {
                    me._activateDropOverlay.apply(me,[editor,overlay]);
                } else {
                    editor = $(e).find('textarea:visible');
                    if(editor.length > 0)
                        me._activateDropOverlay.apply(me,[editor,overlay]);
                }
            },
            deactivate: function(event, ui){
                me._deactivateDropOverlay.apply(me,[overlay]);
            },
            drop: function(event, ui){
                var url = ui.draggable.data('URL');
                var title = ui.draggable.data('Title');
                if(url != null) {
                    if($(e).find('span.mceEditor').length > 0) {
                        $(e).find('textarea').tinymce().execCommand('mceInsertContent',false,'<img alt="'+title+'" src="'+url+'"/>');
                    } else {
                        var textarea = $(e).find('textarea:visible');
                        if(textarea.length > 0) {
                            var cursorPos = textarea.get(0).selectionStart;
                            var val = textarea.val();
                            var start = val.substr(0,cursorPos);
                            var end = val.substr(cursorPos,val.length);
                            if(textarea.hasClass('markdown'))
                                textarea.val(start+'!['+title+']('+url+' "'+title+'")'+end);
                            else
                                textarea.val(start+'<img title="'+title+'" alt="'+title+'" src="'+url+'"/>'+end);
                            $(document).trigger('form_changed');
                        }
                    }
                }
            },
            tolerance: 'intersect'
        });
    });
    $('.media-tag-widget').not('.media-library-tag-widget').each(function(i,e){
        var overlay = me._createDropOverlay.apply(me,['drop to add tag','release to add tag',e.id]);
        overlay.droppable({
            accept: '.media-draggable',
            hoverClass: 'hover',
            over: function(){
                overlay.text(overlay.data('HoverMessage'));
            },
            out: function(){
                overlay.text(overlay.data('ActiveMessage'));
            },
            activate: function(event, ui){
                overlay.css({opacity:0.8}); //any less opacity and it's too hard to read the overlay text
                me._activateDropOverlay.apply(me,[$(e).find('.activate-link'),overlay]);
            },
            deactivate: function(event, ui){
                me._deactivateDropOverlay.apply(me,[overlay]);
            },
            drop: function(event, ui){
                var widget = e.getWidget();
                widget.chooseItem(ui.draggable.data('Node'));
            },
            tolerance: 'pointer'
        });
    });
    $('iframe[id^="epiceditor-"]').each(function(i,e) {
        var iframe = $(e);
        var overlay = me._createDropOverlay.apply(me, ['drop to add tag','release to add tag', e.id]);
        overlay.droppable({
            accept: '.media-draggable',
            hoverClass: 'hover',
            over: function(){
                overlay.text(overlay.data('HoverMessage'));
            },
            out: function(){
                overlay.text(overlay.data('ActiveMessage'));
            },
            activate: function(event, ui) {
                if (iframe.length > 0) {
                    me._activateDropOverlay.apply(me,[iframe, overlay]);
                }
            },
            deactivate: function(event, ui) {
                me._deactivateDropOverlay.apply(me, [overlay]);
            },
            drop: function(event, ui) {
                var url = ui.draggable.data('URL');
                var title = ui.draggable.data('Title');
                if (url != null) {
                    var value = me.Options.MarkdownTagImage
                      ? me.Options.MarkdownTagImage.replace(/{{title}}/g, title).replace(/{{src}}/g, url)
                      : '![' + title + '](' + url + ')';
                    var editor = iframe.contents().find('iframe#epiceditor-editor-frame').contents().find('body');

                    var doc = editor[0].ownerDocument;
                    var win = doc.defaultView || doc.parentWindow;
                    if (win.getSelection()) {
                      editor.focus();
                      var selObj = win.getSelection();
                      var selRange = selObj.getRangeAt(0);
                      selObj.deleteFromDocument();
                      selRange.insertNode(doc.createTextNode(value));
                      selObj.addRange(selRange);
                      selObj.collapseToEnd();
                      editor.focus();
                    } else if (doc.selection) {
                      editor.focus();
                      sel = doc.selection.createRange();
                      sel.text = value;
                      editor.focus();
                    } else if (editor.selectionStart || editor.selectionStart == '0') {
                      var startPos = this.selectionStart;
                      var endPos = this.selectionEnd;
                      var scrollTop = this.scrollTop;
                      editor.innerHTML = editor.innerHTML.substring(0, startPos) + value + editor.innerHTML.substring(endPos, editor.innerHTML.length);
                      editor.focus();
                      editor.selectionStart = startPos + myValue.length;
                      editor.selectionEnd = startPos + myValue.length;
                      editor.scrollTop = scrollTop;
                    }
                }
            },
            tolerance: 'pointer'
        });
    });

    this._updateCount.apply(this);
};

MediaLibraryTagWidget.prototype._createDropOverlay = function(activeMessage,hoverMessage,overlayId) {

var overlay = $('<div class="drop-overlay" '+((!!overlayId) ? 'id="'+overlayId+'-overlay" ':'')+ 'style="display:none">'+activeMessage+'</div>');
    overlay.data('ActiveMessage',activeMessage);
    overlay.data('HoverMessage',hoverMessage);

    this.DOM.appContent.append(overlay);

    return overlay;
};

MediaLibraryTagWidget.prototype._activateDropOverlay = function(element,overlay) {
    var fontSize = Math.ceil(0.57 * element.height());
    if(fontSize > 30)
        fontSize = 30;

    overlay.css({
        top: (element.offset().top-this.DOM.appContent.offset().top+this.DOM.appContent.scrollTop()-1)+"px",
        left: (element.offset().left-this.DOM.appContent.offset().left-1)+"px",
        width: element.width()+"px",
        height: element.height()+"px",
        lineHeight: element.height()+"px",
        fontSize: fontSize+"px"
    }).text(overlay.data('ActiveMessage'));

    overlay.show();
};

MediaLibraryTagWidget.prototype._deactivateDropOverlay = function(overlay) {
    overlay.hide();
};

MediaLibraryTagWidget.prototype._handleTagsUpdated = function() {
    MediaLibraryTagWidget.superclass._handleTagsUpdated.call(this);
    this._updateCount.apply(this);
};

MediaLibraryTagWidget.prototype._updateCount = function() {

    this.DOM.libraryItemCount.text(this.DOM.chosenList.find('li').length);
};

MediaLibraryTagWidget.prototype._postRenderChosen = function(li,index) {
	var me = this;

    var callback = function(json) {
        var tag = li[0].getTag();

        $('a.remove',li).nextAll().remove();

        var origWidth = json.width;
        var origHeight = json.height;

        var orig = $('<img class="media-draggable original-draggable" title="Original'+(origWidth != null ? ' '+origWidth+'x'+origHeight : '')+' - Drag Me" />');

        if (! json.thumbnailUrl)
            orig.addClass('thumbnail-placeholder');
        else
            orig.attr('src', json.thumbnailUrl);

        //FIX FOR MISSING DATA FROM INITIAL PAGE LOAD
        if(tag.TagLinkNode.Element == null)
            tag.TagLinkNode.Element = { Slug : tag.TagElement };

        orig.data('URL',json.url);
        orig.data('Title',tag.TagLinkNode.Title);
        orig.data('Node',tag.TagLinkNode);
        orig.data('JSON',json);

        orig.draggable({
            revert: false,
            helper: 'clone',
            appendTo: 'body',
            zIndex: 20000,
            opacity: 0.75,
            refreshPositions: true,
            start : function(){
                $('.ui-droppable').show();
            },
            stop : function(){
                $('.ui-droppable').hide();
            }
        });

        if (!!json && !!json.thumbnails) {
            orig.dblclick(function(event){
                event.preventDefault();

                new ImageFilterTool({
                    nodeRef : json.element+':'+json.slug,
                    gallery : (me.taggableObject.Slug != '') ? me.taggableObject.NodeRef+'#'+me.tagPartial.TagRole : null
                });
            });
        }

        li.append(orig);

        var label = $('<label title="Double Click to Edit Title">'+tag.TagLinkTitle+'</label>');

        label.dblclick(function(event){
            event.preventDefault();
            me._editTitle.apply(me,[event,li]);
        });

        li.append(label);

        var thumbHandles = $('<div class="thumbnails"></div>');

        if (!!json && !!json.thumbnails) {
            $.each(json.thumbnails,function(i,thumb){
                var a = me._buildThumbnailHandle.apply(me,[thumb,orig]);
                thumbHandles.append(a);
            });
        }
        if (!!json && !!json.thumbnailsPending) {
            $.each(json.thumbnailsPending,function(i,thumb) {
                var a = me._buildThumbnailHandle.apply(me,[{value : thumb, width : null, height : null, url : null},orig,true]);
                thumbHandles.append(a);
            });
            if (json.thumbnailsPending.length > 0) {
                var pollCallback = function() {
                    me.intervals[tag.TagElement + ':' + tag.TagSlug].attempt++;

                    // Clear the item so that the poll will be accurate
                    NodeObjectCache.remove(tag.TagElement + ':' + tag.TagSlug,true);
                    MediaService.get(tag.TagElement + ':' + tag.TagSlug,{
                        retrieveThumbnails : true,
                        success : function(njson) {
                            li.data('*', njson);

                            $.each(njson.thumbnails,function(i,thumb) {
                                $.each(thumbHandles.find('a'),function(j,handle) {
                                    handle = $(handle);
                                    if (handle.hasClass('disabled') && thumb.value == handle.text()) {
                                        var nhandle = me._buildThumbnailHandle.apply(me,[thumb,orig]);
                                        handle.replaceWith(nhandle);
                                    }
                                });
                            });

                            if (njson.thumbnailsPending.length == 0 || me.intervals[tag.TagElement + ':' + tag.TagSlug].attempt >= Math.ceil(json.thumbnailsPending.length * 1.5)) {
                                clearInterval(me.intervals[tag.TagElement + ':' + tag.TagSlug].id);
                                me.intervals[tag.TagElement + ':' + tag.TagSlug] = null;
                            }
                        }
                    });
                };
                if (me.intervals[tag.TagElement + ':' + tag.TagSlug])
                    clearInterval(me.intervals[tag.TagElement + ':' + tag.TagSlug].id);
                me.intervals[tag.TagElement + ':' + tag.TagSlug] = {};
                me.intervals[tag.TagElement + ':' + tag.TagSlug].attempt = 0;
                me.intervals[tag.TagElement + ':' + tag.TagSlug].id = setInterval(function(){
                    pollCallback();
                },15000);
            }
        }

        var filterConfig = this._getFilterConfig();
        if(filterConfig.length > 0) {

            var title = "Add Image Transformation";
            var button = "Add";

            if(filterConfig.length == 1) {
                title = filterConfig[0].Button;
                button = filterConfig[0].Button;
            }

            var addFilter = $('<a href="#" class="add-filter" title="'+title+'">'+button+'</a>');

            addFilter.click(function(event){
                event.preventDefault();
                me._showFilterDialog.apply(me,[tag,li]);
            });

            thumbHandles.append(addFilter);
        }

        li.append(thumbHandles);

        li.append($('<div class="element">'+(me.Options.ShowElementAndStatus?SystemService.getElementBySlug(tag.TagElement).Name+' / '+json.status:'')+'</div>'));

    };

	MediaLibraryTagWidget.superclass._postRenderChosen.call(this,li,callback);
};

MediaLibraryTagWidget.prototype._buildThumbnailHandle = function(tag,orig,disabled) {

    if(this.Options.ShowThumbnailDragHandles != null) {
        var found = false;
        $.each(this.Options.ShowThumbnailDragHandles,function(i,e){
            if(e == tag.value)
                found = true;
        });
        if(!found)
            return null;
    }

    var width = tag.width;
    var height = tag.height;

    var title = "Thumbnail";
    if (!!width && !!height)
        title += ' '+width+'x'+height;
    var a = $('<a href="#" class="media-draggable thumbnail-draggable thumbnail-handle" title="'+title+' - Drag Me">'+tag.value+'</a>');
    if (!!disabled)
        a.addClass('disabled');

    var url = tag.url || '';

    a.data('URL',url);
    a.data('Title',orig.data('Title'));
    a.data('Node', orig.data('Node'));

    a.click(function(event){
        event.preventDefault();
    });

    if (!disabled)
        a.draggable({
            revert: false,
            helper: function(){
                var img = $('<img src="'+a.data('URL')+'"/>');
                $('body').append(img);
                return img;
            },
            zIndex: 20000,
            opacity: 0.75,
            refreshPositions: true,
            start : function(){
                $('.ui-droppable').show();
            },
            stop : function(){
                $('.ui-droppable').hide();
            }
        });

    return a;
};

MediaLibraryTagWidget.prototype._showFilterDialog = function(tag) {

    //save tag for later use in dialog
    this.DOM.filterDialog.data('tag',tag);

    //pre-select filter if there is only one available
    var config = this._getFilterConfig();
    if(config.length == 1)
        this._chooseFilter(config[0].Slug);


    this.DOM.filterDialog.dialog('open');
};

MediaLibraryTagWidget.registerFilter = function(config) {

    config = $.extend({
        Name : null,
        Title : 'Add New Image',
        Slug : null,
        Preview : function(){},
        Source : 'original',
        AllowPreview : false,
        AllowSourceChange : false,
        Inputs : []
	}, config || {});

    if(config.Name == null || config.Slug == null)
        throw Error("Invalid filter configuration!");

    MediaLibraryTagWidget._filterConfig.push(config);
};

MediaLibraryTagWidget.prototype._getChosenFilterConfig = function() {

    var config = this._getFilterConfig();

    if(config.length == 1)
        return config[0];

    var selectedSlug = this.DOM.filterDialogSelectInput.val();

    if(selectedSlug != '')
        return this._getFilterConfig(selectedSlug);

    return null;
};

MediaLibraryTagWidget.prototype._getFilterConfig = function(slug) {

    var config = MediaLibraryTagWidget._filterConfig;

    if(typeof slug != 'undefined') {
        for(var i=0;i<config.length;i++) {
            if(config[i].Slug == slug)
                return config[i];
        }
        return null;
    }

    return config;
};

MediaLibraryTagWidget.prototype._buildFilterDialog = function() {
    var me = this;
    var config = this._getFilterConfig();

    this.DOM.filterDialog = $('<div id="media-filter-dialog"></div>');

    this.DOM.filterDialogLeftPanel = $('<div class="left"></div>');
    this.DOM.filterDialogRightPanel = $('<div class="right"></div>');

    this.DOM.filterDialog.append(this.DOM.filterDialogLeftPanel).append(this.DOM.filterDialogRightPanel).append($('<div id="rosco1" style="clear:both"></div>'));

    this.DOM.filterDialogSourceImage = $('<div id="filter-source-image"><img/></div>');
    this.DOM.filterDialogSourceSelectPanel = $('<div><label>Source:</label><span>Original</span> </div>');
    this.DOM.filterDialogChangeSourceButton = $('<a href="#">[change]</a>');
    this.DOM.filterDialogChangeSourceButton.click(function(event){
        event.preventDefault();
        alert('Not implemented!');
    });
    this.DOM.filterDialogSourceSelectPanel.append(this.DOM.filterDialogChangeSourceButton);
    this.DOM.filterDialogLeftPanel.append(this.DOM.filterDialogSourceSelectPanel);
    this.DOM.filterDialogLeftPanel.append(this.DOM.filterDialogSourceImage);
    this.DOM.filterDialogLeftPanel.append($('<div><input id="filter-preview" type="checkbox" disabled="true"/> <label for="filter-preview">Preview</label></div>'));
    $('#filter-preview',this.DOM.filterDialogLeftPanel).change(function(event){
        if(event.target.checked)
            me._showFilterPreview();
        else
            me._clearFilterPreview();
    });
    this.DOM.filterDialogLeftPanel.append($('<div><input id="filter-show-border" type="checkbox"/> <label for="filter-show-border">Show Image Border</label></div>'));
    $('#filter-show-border',this.DOM.filterDialogLeftPanel).change(function(event){
        if(event.target.checked)
            me.DOM.filterDialogSourceImage.addClass('border');
        else
            me.DOM.filterDialogSourceImage.removeClass('border');
    });
    this.DOM.filterDialogLeftPanel.append($('<div><em>*Image preview is approximate and may differ from the final rendered image.</em></div>'));

    if(config.length > 1) {
        var filterSelectPanel = $('<div id="filter-select"><label for="image-filter">Choose Filter:</label></div>');
        this.DOM.filterDialogRightPanel.append(filterSelectPanel);
        this.DOM.filterDialogSelectInput = $('<select id="image-filter"></select>');
        this.DOM.filterDialogSelectInput.append($('<option value="">[Select a Filter]</option>'));
        $.each(config,function(i,e){
            this.DOM.filterDialogSelectInput.append($('<option value="'+e.Slug+'">'+e.Name+'</option>'));
        });
        filterSelectPanel.append(this.DOM.filterDialogSelectInput);
    }

    this.DOM.filterDialogOptions = $('<div id="filter-options"></div>');

    this.DOM.filterDialogRightPanel.append(this.DOM.filterDialogOptions);


    $('#app-main').after(this.DOM.filterDialog);

    this.DOM.filterDialog.dialog({
        autoOpen : false,
        draggable : false,
        height : 'auto',
        width : '810px',
        modal : true,
        position : 'top',
        resizable : false,
        zIndex : 100001,
        closeText : '&times;',
        title: config.length == 1 ? config[0].Title : 'Add New Image',
        buttons : {
            "Save & Close" : function(event) {
                var config = me._getChosenFilterConfig.apply(me);

                var errors = false;
                $.each(config.Inputs,function(i,e){
                    var input = $('#filter-input-'+e.Slug);
                    var val = input.val();
                    if(e.Required && val.length == 0) {
                        alert('Please enter a value for '+e.Label+'.');
                        errors = true;
                        input.focus();
                        return false;
                    } else if(e.Min && val.length < e.Min) {
                        alert('Please enter at least '+e.Min+' characters for '+e.Label+'.');
                        errors = true;
                        input.focus();
                        return false;
                    }
                });

                if(errors)
                    return;

                $(event.target).text('Please Wait...').attr('disabled','true');

                var mediaTag = me.DOM.filterDialog.data('tag');
                var node = new NodeObject({
                    Element: {
                        Slug : mediaTag.TagElement
                    },
                    Slug: mediaTag.TagSlug
                });

                var filterTag = new Tag({
                    TagElement: 'file',
                    TagSlug: config.Slug,
                    TagRole: '#thumbnails',
                    TagValue: '',
                    TagValueDisplay: ''
                });

                me.DefaultService.addTag(node,filterTag,{
                    nonce : me.Options.AddTagNonce,
                    success : function(resp){
                        var tag = resp.Tag;
                        tag.TagLinkNode = new NodeObject(tag.TagLinkNode);

                        if(mediaTag.TagLinkNode && mediaTag.TagLinkNode.Cheaters && mediaTag.TagLinkNode.Cheaters['#'+tag.TagRole]) {
                            mediaTag.TagLinkNode.Cheaters['#'+tag.TagRole].push(tag);
                            me.taggableObject.replaceTag(me.Options.TagDirection,Tag.toPartial(mediaTag),mediaTag);
                        }

                        me.DOM.filterDialog.dialog('close');
                    },
                    error : function(err){
                        alert('There was a problem applying the media filter.');
                    },
                    params : function(params){
                        params['FilterSlug'] = config.Slug;
                        params['FileURL'] = $('img',me.DOM.filterDialogSourceImage).attr('src');

                        $.each(config.Inputs,function(i,e){
                            params['FilterInput['+e.Slug+']'] = $('#filter-input-'+e.Slug).val();
                        });
                    }
                });

            }
        },
        open: function() {
            $('.ui-dialog-buttonpane > button').text('Save & Close').attr('disabled','');
        }
    });
};

MediaLibraryTagWidget.prototype._resizeFilterImage = function(img, imgWidth, imgHeight) {

    var maxDim = imgHeight > imgWidth ? imgHeight : imgWidth;
    if(maxDim < 375) {
        return;
    }

    var ratio;
    if(maxDim == imgHeight) {
        ratio = 500.0/imgHeight;
        var newWidth = ratio*imgWidth;

        if(newWidth <= 375) {
            img.attr('height','500');
            return;
        }
    }

    ratio = 375.0/imgWidth;
    var newHeight = ratio*imgHeight;
    img.attr('height',Math.floor(newHeight));
};

MediaLibraryTagWidget.prototype._chooseFilter = function(slug) {

    var me = this;
    var config = this._getFilterConfig(slug);

    if(config == null) return;

    var tag = this.DOM.filterDialog.data('tag');

    ////////////////////////////////

    //**update source image
    //TODO: update source to filter config default
    //TODO: implement source change widget
    if(false && config.AllowSourceChange)
        this.DOM.filterDialogChangeSourceButton.show();
    else
        this.DOM.filterDialogChangeSourceButton.hide();

    //TODO: support other images besides original
    this.DOM.filterDialogSourceImage.empty();
    var img = $('<img/>').attr('src',tag.TagLinkNode.getScalar("#original.#url",true));
    this.DOM.filterDialogSourceImage.append(img);
    var imgHeight = tag.TagLinkNode.getScalar("#original.#height",true);
    var imgWidth = tag.TagLinkNode.getScalar("#original.#width",true);
    this._resizeFilterImage(img,imgWidth,imgHeight);


    //**enable/disable preview checkbox
    $('#filter-preview',this.DOM.filterDialogLeftPanel).attr('disabled',config.AllowPreview ? '' : 'true');


    //**render options
    var fieldset = $('<fieldset><legend>Options</legend></fieldset>');
    var ul = $('<ul></ul>');
    fieldset.append(ul);
    $.each(config.Inputs,function(i,e){
        //TODO: handle all types
        if(e.Type == 'text') {

            var input = $('<input id="filter-input-'+e.Slug+'" type="text" maxlength="'+e.Max+'" name="filter-option-'+e.Slug+'" value="'+e.Default+'"/>');

            input.change(function(){
                if($('#filter-preview:checked',me.DOM.filterDialogLeftPanel).length == 0) return;
                var config = me._getChosenFilterConfig.apply(me);
                config.Preview.apply(me);
            });

            ul.append($('<li><label for="filter-input-'+e.Slug+'">'+e.Label+':</label></li>').append(input));
        }
    });
    this.DOM.filterDialogOptions.empty().append(fieldset);

    //**render initial preview (if checked)
    if(typeof config.Preview == 'function' && $('#filter-preview:checked',this.DOM.filterDialogLeftPanel).length > 0) {
        config.Preview.apply(this);
    }
};

MediaLibraryTagWidget.prototype._showFilterPreview = function() {
    var config = this._getChosenFilterConfig();
    config.Preview.apply(this);
};

MediaLibraryTagWidget.prototype._clearFilterPreview = function() {
    var img = $('img',this.DOM.filterDialogSourceImage);
    img.nextAll().remove();
    return img;
};

MediaLibraryTagWidget.prototype._editTitle = function(event,li) {

	var me = this;

	event.preventDefault();

	var label = $(event.target);
	var originalText = label.text();
	var input = $('<input type="text" value="'+originalText+'"/>');
	label.after(input);
	label.hide();
	input.select();

	input.keypress(function(event){
		if(event.keyCode == 13)
			input.blur();
	});

	input.blur(function(){
		var newText = $.trim(input.val());

		label.text(newText.length == 0 ? originalText : newText);
		label.show();
		input.remove();

		if(newText != originalText) {
			var loading = $('<div class="ajax-loader"></div>');
			li.append(loading);
			var tag = li[0].getTag();
			NodeService.edit(tag.TagLinkNode,{
                nonce : me.Options.EditNonce,
				success : function(){
					tag.TagLinkTitle = newText;
                    tag.TagLinkNode.Title = newText;
                    var partial = tag.toPartial();
					me.taggableObject.replaceTag(me.Options.TagDirection,partial,tag);
					loading.remove();
				},
				error : function(){
					label.text(originalText).effect("highlight",{
                        color: "#b00"
                    },2000);
					loading.remove();
				},
                params : function(params){
                    params['Title'] = newText;
                }
            });
		}
	});
};

MediaLibraryTagWidget.prototype._removeFromLibrary = function() {
	var selected = $('li.selected',this.DOM.chosenList);

	if(selected.length > 1) {
		if(!confirm("Remove selected media from library?"))
			return;
	}

	var me = this;

	$.each(selected,function(i,li){

		var tag = li.getTag();

		var suppress = i+1<selected.length; //WE ONLY WANT TO FIRE TAG EVENTS ON VERY LAST REMOVE

		me.taggableObject.removeTags(me.Options.TagDirection,tag.toPartial(),suppress);
	});
};

MediaLibraryTagWidget.prototype._buildUploadOptions = function() {
    var me = this;
    return $.extend(MediaLibraryTagWidget.superclass._buildUploadOptions.apply(this),
        {
            'OnCompleteAll' : function() {
                me.closeWidget();
            }
        } || {});
};

MediaLibraryTagWidget.prototype._positionSearchContainer = function() {
    try {

        //THE SEARCH CONTAINER IS A CHILD OF THE BODY ELEMENT
        var left = this.DOM.activateButton.position().left;
        var top = this.DOM.activateButton.offset().top;

        this.DOM.searchContainer.css({top:(top-3)+"px",left:(left+7)+"px"});

    }catch(e){}
};

MediaLibraryTagWidget._filterConfig = [];
