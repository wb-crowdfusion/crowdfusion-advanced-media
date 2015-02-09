var FileTagWidget = function(node,tagPartial,domID,options) {

	//INITIALIZE DEFAULT OPTIONS
	options = $.extend({
		FileMask : "*",
        ParentElement: node.Element.Slug,
        QuickAddURL: "/api/files/quick-add.json/",
		UploadDialogTitle : "Upload File(s)",
        ShowActivateButton: false,
        AllowClearChosenList: false,
        PostParams: null,
        ShowDialog: false
	}, options || {});

    FileTagWidget.superclass.constructor.call(this,node,tagPartial,domID,options);
};
extend(FileTagWidget,NodeTagWidget);

FileTagWidget.prototype._handleWidgetActivatedEvent = function(widgetUUID) {
    if(widgetUUID != this.UUID && !this.uploadInProgress)
        this.closeWidget();
};

//OVERRIDE FUNCTIONS FROM SUPER CLASS TO ADD MEDIA-SPECIFIC DOM
FileTagWidget.prototype._handleInitialized = function() {

	var me = this;

	//EXECUTE DEFAULT BEHAVIOR
	FileTagWidget.superclass._handleInitialized.call(this);

    this.DOM.container.addClass("file-tag-widget");

	//REMOVE DEFAULT QUICK-ADD COMPONENTS
    this.DOM.searchContainer.remove();
	//this.DOM.searchResultsTotalLabel.nextAll().remove();


    if(this.Options.AllowQuickAdd) {
        this.DOM.uploadContainer = $('<div class="tag-widget-upload-container"></div>');
        this.DOM.container.append(me.DOM.uploadContainer);
        this.uploader = new HTML5Uploader(this,this.DOM.uploadContainer,this.DOM.uploadContainer,this._buildUploadOptions());
    }

};

FileTagWidget.prototype._itemChoiceOptionsCancelled = function(choiceli) {

	//HAVE TO RE-ADD THIS DIV BECAUSE THE SUPER-CLASS CANCEL BUTTON WIPES IT OUT (IN ORDER TO CLEAR THE ITEM OPTIONS UL & BUTTONS)
	choiceli.append($('<div style="clear:both;"></div>'));
};

FileTagWidget.prototype._addFileTag = function(node) {

	var me = this;

	var type = null;
	if(this._isMultiType()) {
		type = $.trim(this.DOM.searchResultsQuickAddTypeSelect.val());
		if(type == "-1") {
			this.DOM.searchResultsQuickAddTypeSelect.focus();
			return;
		}
	}

	var newtag = this._buildTag();

    newtag.TagElement = type != null ? type : node.Element.Slug;
	newtag.TagSlug = node.Slug;
	newtag.TagLinkTitle = node.Title;
	newtag.TagLinkURL = node.RecordLink;
    newtag.TagLinkNode = new NodeObject(node);

    if(this.Options.ValueMode != 'none') {

		var existingTags = null;

		//ADD NEW TAG BUT SUPRESS EVENTS
		//WE DONT WANT THE CHOSEN LIST TO RE-RENDER JUST YET
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
				//WE NEED TO REPLACE THE OLD EXISTING TAGS TO UNDO THIS QUCK ADD
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

/**
 * Default options for HTML5 upload are the TagWidget options.
 */
FileTagWidget.prototype._buildUploadOptions = function() {
    var me = this;
    return $.extend(this.Options,
        {
            'ElementExtensionMap' : null,
            'OnComplete' : function(node) {
                me._addFileTag(node);
            }
        } || {});
};

FileTagWidget.prototype._suppressFormChangedEvent = function() {
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