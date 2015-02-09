var MediaGalleryTagWidget = function(node,tagPartial,domID,options) {
    this.domID = domID.replace('#','');
    this.tagDelta = [];
    this.initialized = false;
    this.isLiveUpdating = false;

    options = $.extend({
        ShowThumbnailsInSearchResults : true,
        ShowOriginalSizeInSearchResults : true,
        AllowReorderChosenList : true,
        AllowQuickAdd : false,
        QuickAddURL : "/api/media/quick-add.json/",
        ArchiveAddURL : "/api/media/upload-archive.json/",
        UploadDialogTitle : "Upload Files...",
        ConfirmDialogTitle : "Confirm Upload: ",
        WarnOnClearChosenList : true,
        WarnOnRemove : true,
        QuickAddNonce : null,
        QuickAddElement : null,
        DefaultQuickAddElement : null,
        ElementExtensionMap : {
            'jpg' : 'image',
            'jpeg': 'image',
            'gif' : 'image',
            'png' : 'image',
            'bmp' : 'image',
            'tiff': 'image',
            'cr2' : 'image',
            'psd' : 'image',
            'tif' : 'image',
            'aif' : 'audio',
            'aifc': 'audio',
            'aiff': 'audio',
            'au'  : 'audio',
            'm3u' : 'audio',
            'mid' : 'audio',
            'mp3' : 'audio',
            'ra'  : 'audio',
            'ram' : 'audio',
            'rmi' : 'audio',
            'snd' : 'audio',
            'wav' : 'audio',
            'asf' : 'video',
            'asr' : 'video',
            'asx' : 'video',
            'avi' : 'video',
            'lsf' : 'video',
            'lsx' : 'video',
            'mov' : 'video',
            'movie' : 'video',
            'mpa' : 'video',
            'mpe' : 'video',
            'mpeg' : 'video',
            'mpg' : 'video',
            'mpv2' : 'video',
            'qt' : 'video',
            'mp4' : 'video',
            '*'    : 'document'
        },
        VisualMode : 'grid',
        DisplayMetas : 'type,filesize,dimensions',
        ThumbSizes : '50,100,150',
        ZoomLevel : 150,
        RowHandler : null,
        ForceElementSelection : true,
        DefaultElement : 'image',
        IsFieldLike : true,
        IsNewControlAction : true
    }, options || {});

    this.DOM = {
        thumbnailControl : null
    };

    this.grid = {
        zoomLevel : null,
        cellWidth : 0,
        cellHeight : 0,
        width : 0,
        height : 0,
        itemsPerRow : 0
    };

    this.gallery = {
        number : 0,
        size : 0
    };

    // Set starting zoomLevel
    var me = this;
    var thumbSizes = options.ThumbSizes.split(',');
    $.each(thumbSizes, function(i,l) {
        if (options.ZoomLevel == parseInt(l)) {
            me.grid.zoomLevel = i;
            me.grid.size = parseInt(l);
        }
    });
    if (me.grid.zoomLevel == null) {
        me.grid.zoomLevel = thumbSizes.length - 1;
        me.grid.size = thumbSizes[thumbSizes.length - 1];
    }

    MediaGalleryTagWidget.superclass.constructor.call(this,node,tagPartial,domID,options);

    // Exclude partials from non-fieldlike tags to prevent them from being over-ridden
    if (!me.Options.IsFieldLike) {
        if (me.Options.TagDirection == 'out')
            me.taggableObject.decreaseOutPartials(tagPartial.TagRole);
        else
            me.taggableObject.decreaseInPartials(tagPartial.TagRole);
    }

};
extend(MediaGalleryTagWidget,NodeTagWidget);

/** Overrides from AbstractTagWidget **/

MediaGalleryTagWidget.prototype.activateReordering = function(event) {
    event.preventDefault();

    this.closeWidget();

    //CONFIGURE AND ENABLE SORTING
    this.DOM.chosenList.addClass('sortable');
    this.DOM.chosenList.find('li a.remove').css({visibility : 'hidden'});
    this.DOM.chosenList.sortable({
            revert: false,
            scroll: true,
            helper: 'clone',
            appendTo: '#app-content',
            containment: 'parent'
        }).sortable('enable');

    //UPDATE UI COMPONENTS
    this.DOM.clearChosenListButton.hide();
    this.DOM.reorderChosenListButton.hide();
    this.DOM.activateButton.hide();

    this.DOM.reorderChosenListFinishButton.show();
    this.DOM.sortControl.css({display : 'inline'});

    this._reorderingActivated();
};

MediaGalleryTagWidget.prototype.deactivateReordering = function(event) {
    event.preventDefault();
    var me = this;

    //COMMIT CHANGES TO taggableObject
    var newtags = new Array();
    this.DOM.chosenList.children("li").each(function(i,li){
        var vals = li.getValues();
        $(vals).each(function(j,val){
            var tag = new Tag(li.getTag());
            tag.TagValue = val.value;
            tag.TagValueDisplay = val.display;
            tag.TagSortOrder = i+1;
            newtags.push(tag);
        });
    });
    this.taggableObject.updateTags(this.Options.TagDirection,this.tagPartial,newtags,true);
    this._asyncUpdate('reorder',newtags,{
        nonce : me.Options.UpdateTagsNonce,
        tagRole : this.tagPartial.TagRole,
        error : function(){
            alert('Unable to update tags');
        }
    });

    //CLEAN UP SORTABLE LIST
    this.DOM.chosenList.removeClass('sortable');
    this.DOM.chosenList.children().sortable('destroy');
    this.DOM.chosenList.find('li a.remove').css({visibility : ''});

    //UPDATE UI COMPONENTS
    this.DOM.clearChosenListButton.show();
    this.DOM.reorderChosenListButton.show();
    this.DOM.activateButton.show();

    this.DOM.reorderChosenListFinishButton.hide();
    this.DOM.sortControl.hide();

    this._reorderingDeactivated();
};

MediaGalleryTagWidget.prototype.clearChosenItems = function(event) {
    var me = this;

    if(event)
        event.preventDefault();

    if (this._isLiveUpdateable())
        this.isLiveUpdating = true;

    this.taggableObject.removeTags(this.Options.TagDirection,this.tagPartial,true);

    if (this._isLiveUpdateable())
        this.isLiveUpdating = false;

    this._asyncUpdate('clear',[], {
        nonce : me.Options.UpdateTagsNonce,
        tagRole : this.tagPartial.TagRole,
        error : function(){
            alert('Unable to clear tags');
        }
    });
    this._renderChosenList();

    this._chosenItemsCleared();
};

MediaGalleryTagWidget.prototype.enterSearchKeyword = function(keyword) {
    var me = this;

    if(keyword == AbstractTagWidget.CONSTANTS.START_TYPING)
        keyword = '';

    this.SearchOffset = 1;

    this.DOM.searchResultsTotalLabel.text('Searching. Please Wait...').addClass('loading');

    var params = $.extend({
        //"Elements.in" --> comes from AbstractCmsBuilder::_buildWidgetOptions()
        "Title.like": keyword,
        'OutTags.select': '#original.#width,#original.#height,#original.#url',
        'MaxRows': this.Options.SearchLimit,
        'Page': this.SearchOffset++
    },this.Options.SearchParameters || {});

    var successCallback = function(json,xhr) {
        me._renderSearchResults.apply(me,[json,false]);

        //RESET SCROLL PANE TO THE TOP, BROWSER WILL REMEMBER THE SCROLL POSITION BETWEEN LOADS WHICH
        //CAUSES THE AJAX SCROLL-AHEAD TO KEEP LOADING UP TO THE LAST SCROLL POSITION
        //FURTHER NOTE: jQuery scrollTo PLUGIN USES A TIMEOUT WHICH DOESN'T WORK HERE, NEEDS TO BE SEQUENTIAL
        me.DOM.searchResultsScrollPane[0].scrollTop = 0;
    };

    MediaService.findAll({
        success : successCallback,
        error: function(){
            me.closeWidget.apply(me);
        },
        params: params
    });
};

MediaGalleryTagWidget.prototype.scroll = function(event) {
    //SEARCH RESULTS FULLY LOADED, NO NEED TO CONTINUE
    if(this.TotalRecords == this.DOM.searchResultsList.children().length)
        return;

    var pane = $(event.target);
    var ratio = (pane[0].scrollTop + pane.height()) / this.DOM.searchResultsList.height();

    if(ratio >= (this.Options.ScrollThreshold/100.0)) { //WE HAVE HIT THE 80% MARK ON THE SCROLL PANE; LOAD MORE SEARCH RESULTS

        if(this.Locks.scroll) {
            event.preventDefault();
            return;
        }

        this.Locks.scroll = true;

        var me = this;

        var keyword = this.DOM.searchInput.val();
        if(keyword == AbstractTagWidget.CONSTANTS.START_TYPING)
            keyword = '';

        var params = $.extend({
            //"Elements.in" --> comes from AbstractCmsBuilder::_buildWidgetOptions()
            "Title.like": keyword,
            'OutTags.select': '#original.#width,#original.#height,#original.#url',
            'MaxRows': this.Options.SearchLimit,
            'Page': this.SearchOffset++
        },this.Options.SearchParameters || {});

        var successCallback = function(json,xhr) {
            me._renderSearchResults.apply(me,[json,true]);
            me.Locks.scroll = false;
        };

        MediaService.findAll({
            success : successCallback,
            error : function(){
                me.closeWidget.apply(me);
            },
            params : params
        });
    }
};

MediaGalleryTagWidget.prototype.chooseItem = function(node,choiceli) {
    if (this._isLiveUpdateable())
        this.isLiveUpdating = true;

	//EXECUTE DEFAULT BEHAVIOR
	MediaGalleryTagWidget.superclass.chooseItem.call(this,node,choiceli);

    if (this._isLiveUpdateable())
        this.isLiveUpdating = false;
};

MediaGalleryTagWidget.prototype._handleInitialized = function() {

	var me = this;

    this.DOM.sortControl = $('<div class="sortby"><label>Sort by:</label></div>').css({display: 'none'});
    this.DOM.sortButtons = $('<div class="buttons"><div><a title="title">Title</a></div><div><a title="activeDate">Active Date</a></div></div>');

    this.DOM.thumbnailControl = $('<div class="control"><label>Thumbnail size:</label></div>').css({display : 'none'});
    this.DOM.thumbnailButtons = $('<div class="buttons"><div><a>S</a></div><div><a>M</a></div><div><a>L</a></div></div>');
    this.DOM.ajaxLoader = $('<div class="ajax-loader"></div>');
    this.DOM.status = $('<div class="status"><label>Gallery Size:</label><span class="gallery-size">0</span> image(s) @ <span class="gallery-filesize">0KB</span></div>');

	//EXECUTE DEFAULT BEHAVIOR
	MediaGalleryTagWidget.superclass._handleInitialized.call(this);

    this._suppressFormChangedEvent();

    // Don't need undo for this tagwidget
    this.DOM.undoRemoveButton.hide();

    this.DOM.container.addClass("media-gallery-tag-widget");

    this.DOM.chosenList.addClass('grid');
    this.DOM.label.after(this.DOM.ajaxLoader).after(this.DOM.thumbnailControl.append(this.DOM.thumbnailButtons)).after(this.DOM.sortControl.append(this.DOM.sortButtons));

    if (this.taggableObject.Slug != '')
        this.DOM.label.before('<p style="padding-left:0;margin-bottom: 0.5em;"><strong>Note:</strong> All changes made to the following tags take effect immediately.</p>').before(this.DOM.status);
    else
        this.DOM.label.before(this.DOM.status);

    // Initialize list dimensions
    this.DOM.chosenList.css({ width: (parseInt(this.DOM.container.css('width'))-5)+'px' });

    $('a', this.DOM.thumbnailButtons).each(function(i,b){
        $(b).click(function() {
            me._setZoomLevel(i);
        });
    });

    $('a', this.DOM.sortButtons).each(function(i,b){
        $(b).click(function() {
            me._sortList($(b).attr('title'));
        });
    });

    //REMOVE DEFAULT QUICK-ADD COMPONENTS
    this.DOM.searchResultsTotalLabel.nextAll().remove();

    if(this.Options.AllowQuickAdd)
        this.uploader = new HTML5Uploader(this,this.DOM.searchContainer,this.DOM.searchResultsToolbar,this._buildUploadOptions());

    $('.thumbnail-wrapper').live("mouseover mouseout", function(event) {
        if ( event.type == "mouseover" ) {
            $('a.remove',this).show();
        } else {
            $('a.remove',this).hide();
        }
    });

    if (me.Options.VisualMode == 'single')
        this.DOM.chosenList.addClass('single');
};

MediaGalleryTagWidget.prototype._renderChosenList = function() {

    var me = this;

    //GET ALL THE OUT TAGS FROM THE RECORD OBJECT THAT APPLY TO THIS WIDGET
    if (this.Options.ShowChosenList)
    {
        if (!me.initialized && !me.Options.IsFieldLike && !me.Options.IsNewControlAction) {
            me._fetchOutTags();
        }
        else {
            var outTags = this.taggableObject.getTags(this.Options.TagDirection,this.tagPartial);
            me._renderList(outTags);
            me.gallery.number = $('li.item', me.DOM.chosenList).length;
            $('.gallery-size',me.DOM.status).text(me.gallery.number);
            if (!me.initialized)
                me.initialized = true;
        }
    }
    else
        me.DOM.chosenList.empty();
};

MediaGalleryTagWidget.prototype._renderList = function(outTags) {
    var me = this;

    if (outTags.length == 0)
        me.DOM.chosenList.empty();

    //IT'S POSSIBLE THAT THERE COULD BE SEQUENTIAL TAGS REPRESENTING A MUTLI-VALUED TAG
    //LOOP OBJECT RESETS WHEN SLUG CHANGES
    var previousSlug = null;
    var previousLI = null;

    $(outTags).each(function(i,tag){

        if(tag.TagSlug == previousSlug) {

            //APPEND THE VALUE TO THE ARRAY RETURNED BY THE getValues() FUNCTION
            var vals = previousLI[0].getValues();
            vals.push({value:tag.TagValue,display:tag.TagValueDisplay});
            previousLI[0].getValues = function() {
                return vals;
            };

            //ASSUME THE span.value CONTAINS A [, ]-SEPARATED LIST OF STRINGS ENCLOSED BY PARENS
            var val = $('span.value',previousLI);
            val.text(val.text().substr(0,val.text().length-1)+', '+tag.TagValueDisplay+')');

        } else {
            var tagID = SlugUtils.createSlug(tag.TagElement+'_'+tag.TagSlug);

            // Only render if element doesn't already exist
            if ($('#'+me.domID+'-'+tagID).length > 0)
                return;

            // If it's not already in there, add it to the delta
            if ($.inArray(tagID, me.tagDelta) < 0)
                me.tagDelta.push(tagID);

            var li = $('<li class="item" id="'+me.domID+'-'+tagID+'"></li>');

            li.append('<div class="thumbnail-wrapper"><div class="thumbnail placeholder"></div></div>');

            if(me.Options.ValueMode != "none" && !me.Options.HideTagValues) {

                //BUILD CHOSEN LINE
                //TAG LINK DISPLAY BECOMES AN ANCHOR LINK TO EDIT THE VALUES
                if(me.Options.AllowEditChosen && !me.Options.ReadOnly)
                    li.append($('<label><span class="display"></span></label>').append($('<a href="#" title="Edit">'+tag.TagLinkTitle+'</a>').click(function(event){
                        event.preventDefault();
                        me.showItemOptions.apply(me,[li]);
                    })));
                else
                    li.append($('<label><span class="display" title="'+tag.TagLinkTitle+'">'+tag.TagLinkTitle+'</span></label>'));

                //SHOW THE TAG VALUE IN PARENS AFTER THE LINK DISPLAY, THIS WILL GET APPENDED TO IF THERE ARE ANY MORE TAGS WITH THE SAME SLUG (SEE ABOVE)
                if(tag.TagValueDisplay != null && tag.TagValueDisplay.length > 0) {
                    li.append($('<label><span class="value">('+tag.TagValueDisplay+')</span></label>'));
                }

            } else {
                //NO TAG VALUES, JUST SHOW THE LINK DISPLAY
                li.append($('<label><span class="display" title="'+tag.TagLinkTitle+'">'+tag.TagLinkTitle+'</span></label>'));

                if(me.Options.HideTagValues && tag.TagValueDisplay != null && tag.TagValueDisplay.length > 0) {
                    li.append($('<label><span class="value">('+tag.TagValueDisplay+')</span></label>'));
                }
            }

            //BIND A FUNCTION TO THE LI THAT RETURNS THE TAG OBJECT REPRESENTING THAT LINE
            li[0].getTag = function() {
                return tag;
            };

            //BIND A FUNCTION TO THE LI THAT RETURNS THE TAG VALUES
            li[0].getValues = function() {
                return [{value:tag.TagValue,display:tag.TagValueDisplay}];
            };

            if(me.Options.ShowRemoveButton && !me.Options.ReadOnly) {
                var wrapper = $('div.thumbnail-wrapper', li);
                wrapper.prepend(
                    $('<a href="#" title="Remove">&times;</a>').addClass("remove")
                        .click(function(event){
                            event.preventDefault();

                            if(me.Options.WarnOnRemove && !confirm("Remove this item?"))
                                return;

                            var tagpartial = new TagPartial(
                                    tag.TagElement,
                                    tag.TagSlug,
                                    tag.TagRole
                                );

                            //SAVE TAGS FOR UNDO, UPDATE BEHAVIOR FOR UNDO BUTTON
                            var savetags = me.taggableObject.getTags(me.Options.TagDirection,tagpartial);
                            me.DOM.undoRemoveButton.unbind('click').click(function(event){
                                event.preventDefault();

                                if (me._isLiveUpdateable())
                                    me.isLiveUpdating = true;
                                me.taggableObject.addMoreTags(me.Options.TagDirection,savetags);
                                if (!me._isLiveUpdateable()) {
                                    me.isLiveUpdating = false;
                                    // Readd the tags
                                    $.each(savetags, function(i,tag) {
                                        me._asyncAdd(tag);
                                    });
                                }
                            });

                            if (me._isLiveUpdateable())
                                me.isLiveUpdating = true;

                            var tagID = SlugUtils.createSlug(tagpartial.TagElement+'_'+tagpartial.TagSlug);
                            var li = $('#'+me.domID+'-'+tagID, me.DOM.chosenList);
                            var data = li.data('*');
                            me.gallery.size -= data.original.filesize;

                            me.removeItem.apply(me,[tagpartial]);
                            if (me._isLiveUpdateable())
                                me.isLiveUpdating = false;
                            me._setZoomLevel(me.grid.zoomLevel);
                        })
                );
            }

            me.DOM.chosenList.append(li);

            //CALL EXTENSION FUNCTION
            me._postRenderChosen.apply(me,[li,i+1]);


            previousSlug = tag.TagSlug;
            previousLI = li;
        }
    });

    if(this.DOM.chosenList.children().length == 0) {
        this.DOM.chosenList.css({display:'none'});
        this.DOM.clearChosenListButton.css({display:'none'});
        if(!this.Options.ShowLabelWhenEmpty) {
            this.DOM.label.css({display:'none'});
        }
    } else {
        this.DOM.clearChosenListButton.css({display:''});
        this.DOM.chosenList.css({display:''});
        this.DOM.label.css({display:''});
    }

    $.each(me.tagDelta,  function(i,t) {
        var chosenLi = $('#'+me.domID+'-'+t, me.DOM.chosenList);

        me._fetchMediaInfo(t, chosenLi);
    });
    // Clear the delta now we've fetched what we need
    me.tagDelta = [];

    if(this.Options.AllowReorderChosenList)
        if(this.DOM.chosenList.children().length > 1)
            this.DOM.reorderChosenListButton.show();
        else
            this.DOM.reorderChosenListButton.hide();

    if(this.DOM.chosenList.children().length == 0) {
        this.DOM.label.css({display: 'block'});
        this.DOM.thumbnailControl.hide();
    }
    else {
        this.DOM.label.css({display: 'inline'});
        this.DOM.thumbnailControl.css({display : 'inline'});
    }

    this._positionSearchContainer();
};

MediaGalleryTagWidget.prototype._chosenItemsCleared = function() {
    this.closeWidget();
};

MediaGalleryTagWidget.prototype._addMediaTag = function(node) {

	var me = this;

	var newtag = this._buildTag();

    newtag.TagElement = node.element;
    newtag.TagSlug = node.slug;
    newtag.TagLinkTitle = node.title;
    newtag.TagLinkURL = node.recordLink;
    newtag.TagLinkNode = me._nodeObjectFromJsonNode(node);
    newtag.TagLinkNode.Status = node.status;

    if (me._isLiveUpdateable())
        me.isLiveUpdating = true;

	if(this.Options.ValueMode != 'none') {

		var existingTags = null;

		//ADD NEW TAG BUT SUPPRESS EVENTS
		//WE DON'T WANT THE CHOSEN LIST TO RE-RENDER JUST YET

        MediaGalleryTagWidget.superclass.doTag.call(this,newtag,true);

		if(!this.Options.AllowMultiple) {
            //SAVE EXISTING TAGS, NEED TO BE REPLACE IF Cancel IS CLICKED
           existingTags = this.taggableObject.getTags(this.Options.TagDirection,this.tagPartial);
		}

		this.closeWidget.apply(this);

		//ADD A TEMPORARY LINE TO THE CHOSEN LIST (WONT BE SEEN)
		var li = $('<li>Temporary Line</li>');

		//BIND A FUNCTION TO THE LI THAT RETURNS THE TAG OBJECT REPRESENTING THAT LINE
		li[0].getTag = function() {
			return newtag;
		};

		//BIND A FUNCTION TO THE LI THAT RETURNS THE TAG VALUES, NONE IN THIS CASE
		li[0].getValues = function() {
			return [];
		};

		this.DOM.chosenList.append(li);

		//SHOW THE ITEM OPTIONS PASSING A CUSTOM CANCEL ACTION WHICH REVERSES WHAT WE DID ABOVE
		this.showItemOptions(li,function(event){
			event.preventDefault();

			//REMOVE THE TEMPORARY CHOSEN LINE
			li.remove();

			if(me.Options.AllowMultiple) {
				//REMOVE THE TAG THAT WE ADDED EARLIER, SUPRESS EVENTS
				me.taggableObject.removeTag(me.Options.TagDirection,newtag.toPartial(),true);
			} else {
				//WE NEED TO REPLACE THE OLD EXISTING TAGS TO UNDO THIS QUICK ADD
				me.taggableObject.removeTags(me.Options.TagDirection,me.tagPartial,existingTags==true);
				if(existingTags) {
					me.taggableObject.addMoreTags(me.Options.TagDirection,existingTags);
				}
			}

			//BUBBLE UP TO ORIGINAL EVENT HANDLER
			me.cancelItemOptions.apply(me);
		});
	} else {
        MediaGalleryTagWidget.superclass.doTag.call(this,newtag);
	}

    if (me._isLiveUpdateable()) {
        me.isLiveUpdating = false;
        me._asyncAdd(newtag);
    }

    me.gallery.number = $('li.item', me.DOM.chosenList).length;
    $('.gallery-size',me.DOM.status).text(me.gallery.number);

    this._afterQuickAdd.apply(this,[newtag,node]);
};

MediaGalleryTagWidget.prototype._itemChosen = function(node,choiceli) {
    var me = this;

    if (me.Options.IsFieldLike)
        return;

    var newtag = me._buildTag();

    newtag.TagElement = node.Element.Slug;
    newtag.TagSlug = node.Slug;
    newtag.TagLinkTitle = node.Title;
    newtag.TagLinkURL = node.RecordLink;
    newtag.TagLinkNode = node instanceof NodeObject ? node : new NodeObject(node);

    me._asyncAdd(newtag);
};

MediaGalleryTagWidget.prototype._itemRemoved = function(tagpartial) {
    var me = this;

    var tagID = SlugUtils.createSlug(tagpartial.TagElement+'_'+tagpartial.TagSlug);
    var li = $('#'+me.domID+'-'+tagID, me.DOM.chosenList);
    li.remove();

    if (me.Options.IsFieldLike)
        return;

    var newtag = me._buildTag();

    newtag.TagElement = tagpartial.TagElement;
    newtag.TagSlug = tagpartial.TagSlug;
    newtag.TagRole = tagpartial.TagRole;

    me._asyncUpdate('remove',newtag,{
        nonce : me.Options.RemoveTagNonce,
        error : function(){
            alert('Unable to remove tag '+newtag);
            me.DOM.undoRemoveButton.click();
        }
    });
};

MediaGalleryTagWidget.prototype._renderSearchResults = function(json,append){

    var me = this;

    // If the append flag is set, new results will be appended to the
    // result list even if the nodequery's totalrecords is 0.  If a query
    // is out of range and comes back empty with totalrecords = 0, we
    // don't want to clear the results.
    append = (typeof append == 'undefined') || append; //DEFAULT TO APPEND
    if(!append) {
        this.DOM.searchResultsList.empty();
    }

    if(json.nodes.length > 0) {
        $.each(json.nodes, function(i,n){
            if(typeof n != 'undefined' && n) {
                for(var attr in n) {
                    if (attr == 'element') {
                        n['Element'] = {
                            'Slug': n[attr]
                        };
                    }
                    else {
                        n[attr.charAt(0).toUpperCase() + attr.slice(1)] = n[attr];
                    }
                }
            }
            var node = new NodeObject(n);
            node['Original'] = {
                'width': n.width,
                'height': n.height,
                'url': n.url
            };
            node['ThumbnailUrl'] = n['ThumbnailUrl'];
            var li = $('<li><span class="line-number"></span></li>');
            var choice = $('<a class="choice-link" href="#" title="Choose">'+n['title']+(me._isMultiType() || me.Options.ShowElementInSearchResults?' <em>('+SystemService.getElementBySlug(n['element']).Name+')</em>':'')+'</a>')
                .click(function(event){
                    event.preventDefault();

                    //THE CHOICE LINE IS ALREADY ACTIVE AND SELECTED (USED WITH predefined & typein)
                    if(li.hasClass("highlight")) return;

                    me.chooseItem.apply(me,[node,li]);
                })
                .dblclick(function(event){
                    event.preventDefault();

                    //THE CHOICE LINE IS ALREADY ACTIVE AND SELECTED (USED WITH predefined & typein)
                    if(li.hasClass("highlight")) return;

                    me.chooseItem.apply(me,[node,li]);

                    if(me.Options.AllowMultiple)
                        me.closeWidget.apply(me);
                });

            if(me.Options.ShowSlugInSearchResults) {
                choice.append($('<br/><em>'+n['slug']+'</em>'));
            }

            li.append(choice);
            me.DOM.searchResultsList.append(li);

            me._postRenderSearchResult.apply(me,[li,node,i+1,json.nodes.length]);
        });

        //SAVE TOTAL RECORDS SO WE CAN PREVENT UNNECESSARY SCROLL LOADS
        this.TotalRecords = json.totalRecords;

        this.DOM.searchResultsTotalLabel.text(this.TotalRecords+" records found.").removeClass('loading');

        //ADD STRIPING TO SEARCH RESULTS
        this.DOM.searchResultsList.find('li:nth-child(even)').addClass('striped');

        if(this.Options.ShowLineNumbers)
            this.DOM.searchResultsList.find('span.line-number').each(function(i,span){
                if(i+1 <= 999) $(span).text(i+1); //ONLY 3 DIGITS FIT IN THE LEFT MARGIN
            });

    } else {

        if (!append) {
            this.DOM.searchResultsTotalLabel.text("No records found.").removeClass('loading');
        }
    }

    var v = this.DOM.searchInput.val();
    if(this.Options.AllowQuickAdd && v != AbstractTagWidget.CONSTANTS.START_TYPING)
        this.DOM.searchResultsQuickAddInput.val(v);

};

MediaGalleryTagWidget.prototype._postRenderSearchResult = function(li,node,index/*starts at 1*/,total) {
    var link = $('a.choice-link',li);

    if(this.Options.ShowOriginalSizeInSearchResults) {
        var origWidth = node['Original']['width'];
        var origHeight = node['Original']['height'];
        if(origWidth != null) {
            link.append('<span class="display"> ['+origWidth+'x'+origHeight+']</span>');
        }
    }

	if(!this.Options.ShowThumbnailsInSearchResults) return;

	var thumbURL = node['ThumbnailUrl'];
	if(thumbURL != null) {
		link.prepend($('<img class="thumbnail" src="'+thumbURL+'"/>'));
		li.append($('<div style="clear:both"></div>'));
	}
};

MediaGalleryTagWidget.prototype._setZoomLevel = function(s,li) {
    var me = this;
    var sizes = this.Options.ThumbSizes.split(',');

    me.grid.zoomLevel = s;
    me.grid.size = parseInt(sizes[s]);

    me.grid.cellWidth = me.grid.size + 10; // thumb size + li padding
    if (me.Options.DisplayMetas != null && me.Options.DisplayMetas.split(',').length > 0)
        me.grid.cellHeight = me.grid.size + 10 + 30; // thumb size + li padding + attrs
    else
        me.grid.cellHeight = me.grid.size + 10 + 10; // thumb size + li padding + title

    $('.item',this.DOM.chosenList).css({ width : me.grid.cellWidth, height : me.grid.cellHeight });

    var thumbs = $('.item .thumbnail',this.DOM.chosenList);

    var setImgSize = function(data, img) {
        var scale = me.grid.size / 150;
        if (parseInt(data.thumbnail.width) >= parseInt(data.thumbnail.height)) {
            img.closest('.thumbnail-wrapper').css({ 'padding-top' : (me.grid.size - parseInt(data.thumbnail.height*scale))+'px' });
            img.css({ width : me.grid.size+'px', height : 'auto' });
        }
        else
            img.css({ width : 'auto', height : me.grid.size+'px' });
    };

    if (!li) {
        thumbs.each(function(i,e) {
            var img = $(e);
            var item = img.closest('li.item');
            if (img.hasClass('placeholder'))
                img.css({ width : me.grid.size+'px', height : 'auto' });
            else {
                var data = item.data('*');
                setImgSize(data, img);
            }
        });
    } else {
        var img = $('.thumbnail', li);
        if (img.hasClass('placeholder'))
            img.css({ width : me.grid.size+'px', height : me.grid.size+'px' });
        else {
            var data = li.data('*');
            setImgSize(data, img);
        }
    }

    // Panel dimensions
    var listWidth = parseInt($('#app-content').width() * .9);
    me.grid.itemsPerRow = Math.floor(listWidth/me.grid.cellWidth);

    var spacing = 0;
    if (me.Options.VisualMode == 'grid') {
        var numRows = Math.ceil(thumbs.length/me.grid.itemsPerRow);
        spacing = 10 * numRows;
        me.grid.height = me.grid.cellHeight * numRows;
        me.DOM.chosenList.css({height:(me.grid.height+spacing)+'px'});
    }
    else {
        spacing = 10;
        if (thumbs.length > me.grid.itemsPerRow) {
            spacing += 20;
        }
        this.DOM.chosenList.css({height:(me.grid.cellHeight+spacing)+'px'});
    }
};

/** Chosen list helpers **/

MediaGalleryTagWidget.prototype._fetchMediaInfo = function(tagID, li) {
    var me = this;
    var chunks = tagID.split('_');
    var tag = li[0].getTag();
    var element = tag.TagElement;
    var slug = tag.TagSlug;
    var displayMetas = (me.Options.DisplayMetas != null) ? me.Options.DisplayMetas.split(',') : [];

    var details = $('> ul.details',li);
    if (displayMetas.length == 0) {
        // do nothing
    }
    else if (details.length == 0) {
        details = $('<ul class="details"></ul>');
        li.append(details);
    }
    else
        details = $(details.get(0));
    details.empty();

    var placeholder = $('<div class="thumbnail placeholder"></div>').css({ width: me.grid.size+'px', height: me.grid.size+'px' });
    $('.thumbnail',li).replaceWith(placeholder);

    var errorHandler = function(err) {
        var data = {
            thumbnail : {
                width : 150,
                height : 150
            }
        };
        li.data('*',data);

        details.append('<li>Error: '+err+'</li>');
    };

    var status200Handler = function(res) {
        var data = {};

        data['original'] = {
            width : res.width,
            height : res.height,
            filesize : res.size,
            type : me._getExtension(res.url),
            activeDate : res.activeDate.date,
            title : res.title
        };
        me.gallery.size += res.size;
        $('.gallery-filesize',me.DOM.status).text(me._formatFileSize(me.gallery.size));

        $.each(res['thumbnails'],function(i,thumb){
            if (thumb['value'] == '150') {
                data['thumbnail'] = {
                    url : thumb['url'],
                    width : thumb['width'],
                    height : thumb['height']
                };
            }
        });
        li.data('*',data);

        if (data.thumbnail && data.thumbnail.url) {
            var thumbnail = $('<img class="thumbnail" src="'+data.thumbnail.url+'" />')
                .click(function(event){event.preventDefault();})
                .dblclick(function(event){
                    event.preventDefault();
                    new ImageFilterTool({
                        nodeRef : element+':'+slug,
                        gallery : (me.Options.AllowMultiple && me.taggableObject.Slug != '') ? me.taggableObject.NodeRef+'#'+me.tagPartial.TagRole : null
                    });
                });
            $('.thumbnail',li).replaceWith(thumbnail);
        }
        else
            $('div.thumbnail',li).text('No thumb').css('background-image', 'none');

        if (data.original != null) {
            if ($.inArray('type',displayMetas) != -1 && data.original.type != null)
                details.append('<li class="type">'+data.original.type+'</li>');
            if ($.inArray('filesize',displayMetas) != -1 && data.original.filesize != null)
                details.append('<li class="size">'+me._formatFileSize(data.original.filesize)+'</li>');
            if ($.inArray('dimensions',displayMetas) != -1 && data.original.width != null && data.original.height != null)
                details.append('<li class="dimensions">'+data.original.width+'x'+data.original.height+'</li>');
        }
    };

    var options = {
        retrieveThumbnails : true,
        error : function(err) {
            errorHandler(err);
        },
        success : function(json) {
            status200Handler(json);
            me._setZoomLevel(me.grid.zoomLevel,li);
        }
    };
    MediaService.get(element+':'+slug, options);
};

/**
 * _fetchOutTags
 *
 * Asynchronously fetch the outtags for non-fieldlike.
 * Will render the list and perform necessary calculations provide
 * gallery summary.
 */
MediaGalleryTagWidget.prototype._fetchOutTags = function() {
    var me = this;

    var options = {
        error : function(req, err) {
            me._ajaxErrorHandler(req, err);
        },
        success : function(json, xhr) {
            try {
                var resp;
                if (json != null)
                    resp = json;
                else
                    resp = $.parseJSON(xhr.responseText);

                var newtags = new Array();
                $.each(resp, function(i,n) {
                    var newtag = me._buildTag();

                    newtag.TagElement = n.TagElement;
                    newtag.TagSlug= n.TagSlug;
                    newtag.TagLinkTitle = n.TagLinkTitle;
                    newtag.TagLinkURL = n.TagLinkURL;
                    newtag.TagLinkNode = new NodeObject(n);
                    newtag.TagSortOrder = n.TagSortOrder;
                    newtag.TagLinkNode.Status = n.TagLinkStatus;
                    newtags.push(newtag);
                });
                me.taggableObject.updateTags(me.Options.TagDirection,me.tagPartial,newtags,true);

                me._renderList(me.taggableObject.getTags(me.Options.TagDirection,me.tagPartial));

                // Update image count
                me.gallery.number = $('li.item',me.DOM.chosenList).length;
                $('.gallery-size',me.DOM.status).text(me.gallery.number);
                $('.gallery-filesize',me.DOM.status).text(me._formatFileSize(me.gallery.size));

                me.initialized = true;
            }
            catch(e) {
                alert("There was an error fetching out tags: "+e);
            }
        }
    };

    NodeService.getTags(this.taggableObject, this.Options.TagDirection, this.tagPartial, options);
};

/**
 * _asyncUpdate
 *
 * Handles asynchronous updates of non-fieldlike tags.
 *
 * @param action    valid options 'add' or 'remove'
 * @param tag       affected tag
 * @param options   NodeService call options
 */
MediaGalleryTagWidget.prototype._asyncUpdate = function(action, tag, options) {
    var me = this;

    // Don't try to asynchronously update when this is a new node
    if (this.Options.IsNewControlAction) {
        $('.gallery-size',me.DOM.status).text(me.gallery.number);
        $('.gallery-filesize',me.DOM.status).text(me._formatFileSize(me.gallery.size));
        return;
    }

    options = $.extend({
        nonce : null,
        success : function(){
            me.DOM.ajaxLoader.hide();
            // Update image count
            if (action == 'remove')
                me.gallery.number--;
            else if (action == 'clear') {
                me.gallery.number = 0;
                me.gallery.size = 0;
            }

            // On add the success200Handler updates the size/filesize, which is what is used on
            // page load as well.  clear/remove should still use this.
            if (action != 'add') {
                $('.gallery-size',me.DOM.status).text(me.gallery.number);
                $('.gallery-filesize',me.DOM.status).text(me._formatFileSize(me.gallery.size));
            }

        },
        error : function(){
            me.DOM.ajaxLoader.hide();
        }
    }, options || {});

    me.DOM.ajaxLoader.css({ display: 'inline-block' });
    if (action == 'add')
        NodeService.addTag(me.taggableObject,tag,options);
    else if (action == 'remove')
        NodeService.removeTag(me.taggableObject,tag,options);
    else if (action == 'reorder' || action == 'clear')
        NodeService.updateTags(me.taggableObject,tag,options,me.Options.TagDirection);
};

/**
 * _asyncAdd
 *
 * Convenience function to asynchronously add tags.
 *
 * @param tag       the tag
 */
MediaGalleryTagWidget.prototype._asyncAdd = function(tag) {
    var me = this;

    me._asyncUpdate('add', tag, {
        nonce : me.Options.AddTagNonce,
        error : function(){
            alert('Unable to add tag '+tag);
            var tagID = SlugUtils.createSlug(tag.TagElement+'_'+tag.TagSlug);
            $('#'+me.domID+'-'+tagID, me.DOM.chosenList).remove();
        }
    });
};

/**
 * _sortList
 *
 * Sort the chosen list by activeDate or alphabetically by title.
 *
 * @param sortBy    (activeDate|title) default: title
 */
MediaGalleryTagWidget.prototype._sortList = function(sortBy) {
    var sortMethod = function(a,b) {
        var aData = $(a).data('*');
        var bData = $(b).data('*');

        if (sortBy == 'activeDate') {
            var aDate = new Date(aData.original[sortBy]);
            var bDate = new Date(bData.original[sortBy]);

            return (aDate < bDate) ? -1 : ((aDate > bDate) ? 1 : 0);
        }
        else {
            return (aData.original[sortBy].toLowerCase() < bData.original[sortBy].toLowerCase()) ? -1 : ((aData.original[sortBy].toLowerCase() > bData.original[sortBy].toLowerCase()) ? 1 : 0);
        }
    };
    var chosenList = $('li.item',this.DOM.chosenList).get().sort(sortMethod);
    this.DOM.chosenList.append(chosenList);
};

/** General Helpers */

MediaGalleryTagWidget.prototype._getExtension = function(filename) {
    if (filename == null)
        return;

    var sanitizedFilename = filename.split('?')[0];
    return sanitizedFilename.slice(sanitizedFilename.lastIndexOf('.')+1).toLowerCase();
};

MediaGalleryTagWidget.prototype._formatFileSize = function(size) {

    //Uses OS X Snow Leopard file size math

    if(size >= 1000000) {
        return Math.round(size/1000000)+'MB';
    }

    return Math.round(size/1000)+'KB';
};

/**
 * Default options for HTML5 upload are the TagWidget options.
 */
MediaGalleryTagWidget.prototype._buildUploadOptions = function() {
    var me = this;
    return $.extend(this.Options,
        {
            'OnComplete' : function(node) {
                me._addMediaTag(node);
            }
        } || {});
};

/**
 * Prevent form_changed to trigger:
 * - on widgets within the dialog box
 * - when asynchronous saves are being made
 */
MediaGalleryTagWidget.prototype._suppressFormChangedEvent = function() {
    var me = this;
    var fn = function(event) {
        var active = $(event.target.activeElement);
        if (active.closest('div.upload-preview').length > 0) {
            event.stopImmediatePropagation();
        }
        else if (me._isLiveUpdateable() && me.isLiveUpdating)
            event.stopImmediatePropagation();
    };
    var handlers = $(document).data('events')['form_changed'];
    // Only bind if not already bound
    if (!($.inArray(fn,handlers) !== -1)) {
        $(document).bind('form_changed', fn);
        var handler = handlers.pop();
        handlers.splice(0,0,handler);
    }
};

/**
 * Non-fieldlike tags on non-new pages are live updateable.
 */
MediaGalleryTagWidget.prototype._isLiveUpdateable = function () {
    return (!this.Options.IsFieldLike && !this.Options.IsNewControlAction);
};
