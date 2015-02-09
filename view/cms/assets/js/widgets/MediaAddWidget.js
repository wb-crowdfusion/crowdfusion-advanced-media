var MediaAddWidget = function(options) {

    //INITIALIZE DEFAULT OPTIONS
    this.options = $.extend({
        UploadDialogTitle : "Upload Files...",
        ConfirmDialogTitle : "Confirm Upload: ",
        QuickAddURL : "/api/media/quick-add.json/",
        ArchiveAddURL : "/api/media/upload-archive.json/",
        QuickAddNonce : null,
        QuickAddElement : null,
        DefaultQuickAddElement : null,
        ForceElementSelection : false,
        DefaultElement : 'image',
        //todo: pick the element based on the site scope for the CMS
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
        ShowUrlPrompt : false
    }, options || {});

    var me = this;

    this.DOM = {};
    this.UUID = 'add-'+(new Date().getTime())+Math.floor(Math.random()*1024);

    //BUILD WIDGET UI
    // Add widget to page
    this.DOM.widget = $('<div id="media-add-widget"></div>');
    $('#app-main-header').append(this.DOM.widget);

    this.uploader = new HTML5Uploader(this,this.DOM.widget,this.DOM.widget,this._buildUploadOptions());

    this._suppressFormChangedEvent();
};

MediaAddWidget.prototype = {

    /**
     * Default options for HTML5 upload are the TagWidget options.
     */
    _buildUploadOptions : function() {
        return $.extend(this.options,
            {
                'OnCompleteAll' : function() {
                    List.reloadData();
                }
            } || {});
    },

    _suppressFormChangedEvent : function() {
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
    }
};
