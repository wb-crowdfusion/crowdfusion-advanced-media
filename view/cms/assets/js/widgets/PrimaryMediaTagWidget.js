var PrimaryMediaTagWidget = function(node,tagPartial,domID,options) {

	//INITIALIZE DEFAULT OPTIONS
	options = $.extend({
		MediaLibraryTagPartial : '#media-library'
	}, options || {});

	var me = this;

    PrimaryMediaTagWidget.superclass.constructor.call(this,node,tagPartial,domID,options);

    this.taggableObject.bind(Taggable.EVENTS.TAGS_UPDATED_WITH_PARTIAL,function(){
        me._handleAutoPopulate.apply(me);
    },new TagPartial(this.Options.MediaLibraryTagPartial));

};
extend(PrimaryMediaTagWidget,MediaTagWidget);

PrimaryMediaTagWidget.prototype._handleAutoPopulate = function() {

    var outTags = this.taggableObject.getTags(this.Options.TagDirection,new TagPartial(this.Options.MediaLibraryTagPartial));

    if(outTags.length > 0 && this.DOM.chosenList.children().length == 0) {

        //clone the *first* tag object otherwise it affects the other tag widget
        var primaryMediaTag = new Tag(outTags[0]);

        //change the role to match this widget
        primaryMediaTag.TagRole = this.tagPartial.TagRole;

        this.taggableObject.addTag(this.Options.TagDirection,primaryMediaTag);
    }

};

