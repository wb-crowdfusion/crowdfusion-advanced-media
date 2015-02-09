var MediaTagWidget = function(node,tagPartial,domID,options) {

	//INITIALIZE DEFAULT OPTIONS
	options = $.extend({
		ShowThumbnailsInChosenList : true,
		ShowThumbnailsInSearchResults : true,
        ShowOriginalSize : true,
        ShowOriginalSizeInSearchResults : true,
        AllowQuickAdd : false,
        QuickAddURL : "/api/media/quick-add.json/",
        ArchiveAddURL : "/api/media/upload-archive.json/",
		UploadDialogTitle : "Upload File(s)",
        ConfirmDialogTitle : "Confirm Upload: ",
        QuickAddNonce : null,
        QuickAddElement : null,
        DefaultQuickAddElement : null,
        //ForceElementSelection : false,
        DefaultElement : 'image',
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
        }
	}, options || {});

    MediaTagWidget.superclass.constructor.call(this,node,tagPartial,domID,options);

};
extend(MediaTagWidget,NodeTagWidget);

//OVERRIDE FUNCTIONS FROM SUPER CLASS TO ADD MEDIA-SPECIFIC DOM
MediaTagWidget.prototype._handleInitialized = function() {

	var me = this;

	//EXECUTE DEFAULT BEHAVIOR
	MediaTagWidget.superclass._handleInitialized.call(this);

    this._suppressFormChangedEvent();

    this.DOM.container.addClass("media-tag-widget");

	//REMOVE DEFAULT QUICK-ADD COMPONENTS
	this.DOM.searchResultsTotalLabel.nextAll().remove();

	if(this.Options.AllowQuickAdd)
        this.uploader = new HTML5Uploader(this,this.DOM.searchContainer,this.DOM.searchResultsToolbar,this._buildUploadOptions());
};

MediaTagWidget.prototype._postRenderChosen = function(li,callback) {

    var me = this;

    if(this.Options.ShowThumbnailsInChosenList || this.Options.ShowOriginalSize) {

        var tag = li[0].getTag();

        var placeholder = $('<div class="ajax-image-placeholder"></div>');
        $('span.display',li).before(placeholder);

        MediaService.get(tag.TagElement + ':' + tag.TagSlug,{
            retrieveThumbnails : true,
            success : function(json) {
                li.data('*', json);
                if(me.Options.ShowThumbnailsInChosenList) {
                    placeholder.remove();
                    var img = $('<img />').addClass('thumbnail');
                    if (! json.thumbnailUrl)
                        img.addClass('thumbnail-placeholder');
                    else
                        img.attr('src', json.thumbnailUrl);

                    var link = $('<a href="'+json.url+'" title="Original Image" class="thumbnail"></a>')
                                .append(img)
                                .click(function(event){event.preventDefault();});

                    // Only attempt to connect the IFT if this is an image
                    if (!!json.width && !!json.height) {
                        link.dblclick(function(event){
                            event.preventDefault();
                            new ImageFilterTool({
                                nodeRef : json.element+':'+json.slug,
                                gallery : (me.Options.AllowMultiple && me.taggableObject.Slug != '') ? me.taggableObject.NodeRef+'#'+me.tagPartial.TagRole : null
                            });
                        });
                    }
                    $('span.display',li).before(link);
                    li.append($('<div style="clear:both"></div>'));
                }

                if(me.Options.ShowOriginalSize && !!json.width && !!json.height) {
                    var span = $('span.value',li);
                    if(span.length == 0) {
                        span = $('span.display',li);
                        var txt = span.text();
                        span.text(txt+' ['+json.width+'x'+json.height+'] ');
                    } else {
                        var txt = span.text();
                        span.text('['+json.width+'x'+json.height+'] '+txt);
                    }
                }

                if(typeof callback == 'function') {
                    callback.apply(me,[json]);
                }
            }
        });
    }

};

MediaTagWidget.prototype._itemChoiceOptionsCancelled = function(choiceli) {

	//HAVE TO RE-ADD THIS DIV BECAUSE THE SUPER-CLASS CANCEL BUTTON WIPES IT OUT (IN ORDER TO CLEAR THE ITEM OPTIONS UL & BUTTONS)
	choiceli.append($('<div style="clear:both;"></div>'));
};

MediaTagWidget.prototype._postRenderSearchResult = function(li,node,index/*starts at 1*/,total) {

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

MediaTagWidget.prototype.activateReordering = function(event) {
    event.preventDefault();

    this.closeWidget();

    //BUILD SORTABLE LIST
    this.DOM.chosenReorderList.empty();//should always be empty, remove this?
    var list = $('<ol></ol>');
    this.DOM.chosenReorderList.append(list);

    this.DOM.chosenList.children().each(function(i,li){
        var newli = $('<li></li>');

        newli.append($(li).find('span.display').text()+' '+$(li).find('span.value').text());

        //COPY THE getTag() FUNCTION OVER TO SORTABLE LI
        //THIS IS USED LATER TO REORDER THE TAGS
        newli[0].getTag = li.getTag;

        //COPY THE getValues() FUNCTION OVER TO SORTABLE LI
        //THIS IS USED LATER TO REORDER THE TAGS
        newli[0].getValues = li.getValues;

        //COPY THE data('*') VALUE OVER TO SORTABLE LI
        newli.data('*', $(li).data('*'));

        list.append(newli);
    });

    //ADD ALTERNATING CSS CLASS
    //list.find("li:nth-child(even)").addClass("striped");

    //CONFIGURE AND ENABLE SORTING
    list.sortable({
            revert: false,
            scroll: false,
            axis: 'y',
            update: function() {
                //UPDATE ALTERNATING CSS CLASS
                //list.children().removeClass("striped").not("li:nth-child(odd)").addClass("striped");
            }
        }).sortable('enable');

    //UPDATE UI COMPONENTS
    this.DOM.clearChosenListButton.hide();
    this.DOM.reorderChosenListButton.hide();
    this.DOM.activateButton.hide();
    this.DOM.chosenList.hide();

    this.DOM.chosenReorderList.show();
    this.DOM.reorderChosenListFinishButton.show();

    this._reorderingActivated();
};

MediaTagWidget.prototype._reorderingActivated = function() {

	var me = this;

	$('li',this.DOM.chosenReorderList).each(function(i,li){
        li = $(li);

        var data = li.data('*');
		var thumbURL = data['thumbnailUrl'];
		if(thumbURL != null) {
			li
				.prepend($('<img class="thumbnail" src="'+thumbURL+'"/>'))
				.append($('<div style="clear:both"></div>'));
		}
	});

};

MediaTagWidget.prototype.enterSearchKeyword = function(keyword) {
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

MediaTagWidget.prototype.scroll = function(event) {
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

MediaTagWidget.prototype._addMediaTag = function(node) {

	var me = this;

	var newtag = this._buildTag();

    newtag.TagElement = node.element;
    newtag.TagSlug = node.slug;
    newtag.TagLinkTitle = node.title;
    newtag.TagLinkURL = node.recordLink;
    newtag.TagLinkNode = me._nodeObjectFromJsonNode(node);
    newtag.TagLinkNode.Status = node.status;

	if(this.Options.ValueMode != 'none') {

		var existingTags = null;

		//ADD NEW TAG BUT SUPPRESS EVENTS
		//WE DON'T WANT THE CHOSEN LIST TO RE-RENDER JUST YET
		if(this.Options.AllowMultiple) {
			this.taggableObject.addTag(this.Options.TagDirection,newtag,true);
		} else {
			//SAVE EXISTING TAGS, NEED TO BE REPLACE IF Cancel IS CLICKED
			existingTags = this.taggableObject.getTags(this.Options.TagDirection,this.tagPartial);

			this.taggableObject.removeTags(this.Options.TagDirection,this.tagPartial,true);
			this.taggableObject.addTag(this.Options.TagDirection,newtag,true);
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
		if(this.Options.AllowMultiple) {
			this.taggableObject.addTag(this.Options.TagDirection,newtag);
		} else {
			this.taggableObject.removeTags(this.Options.TagDirection,this.tagPartial,true);
			this.taggableObject.addTag(this.Options.TagDirection,newtag);
			this.closeWidget.apply(this);
		}
	}

    this._afterQuickAdd.apply(this,[newtag,node]);
};

MediaTagWidget.prototype._renderSearchResults = function(json,append){

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

/** General Helpers */

MediaTagWidget.prototype._suppressFormChangedEvent = function() {
    var fn = function(event) {
        var active = $(event.target.activeElement);
        if (active.closest('div.upload-preview').length > 0) {
            event.stopImmediatePropagation();
        }
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
 * Default options for HTML5 upload are the TagWidget options.
 */
MediaTagWidget.prototype._buildUploadOptions = function() {
    var me = this;
    return $.extend(this.Options,
        {
            'OnComplete' : function(node) {
                me._addMediaTag(node);
            }
        } || {});
};

NodeTagWidget.prototype._nodeObjectFromJsonNode = function(node) {
  if(node instanceof Object) {
    for(var attr in node) {
      if(node.hasOwnProperty(attr)) {
        var ucAttr = attr.substr(0,1).toUpperCase()+attr.substr(1,attr.length);
        node[ucAttr] = node[attr];
        delete node[attr];
      }
    }
    node.Element = SystemService.getElementBySlug(node.Element);
    node.ActiveDate = node.ActiveDate.date;
    node.NodeRef = node.Element+':'+node.Slug;
    return new NodeObject(node);
  }
  return new NodeObject();
};
