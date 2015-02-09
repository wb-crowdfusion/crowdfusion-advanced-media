var AbstractImageFilter = function(){
    this.DOM = {};
    this.UUID = 'filter-'+(new Date().getTime())+Math.floor(Math.random()*1024);
    this.internalOptions = {
        type : this.getType(),
        width : 0,
        height : 0
    };
};

AbstractImageFilter.prototype = {
    getType : function() {
        throw Error('not implemented');
    },
    renderPreview : function(context, image, zoom) {
        throw Error('not implemented');
    },
    renderOverlay : function(context, w, h, image, zoom) {
    },
    buildOptions : function(image,options) {
        //returns options panel DOM
        throw Error('not implemented');
    },
    _buildAnchorInput : function(name) {
        var nm = this.UUID+'-'+name;
        var anchor = $('\
            <div class="anchor">\
                <ol class="top">\
                    <li><input title="Top, Left" type="radio" name="'+nm+'" value="0,0" checked=""/></li>\
                    <li><input title="Top, Center" type="radio" name="'+nm+'" value="50,0"/></li>\
                    <li><input title="Top, Right" type="radio" name="'+nm+'" value="100,0"/></li>\
                </ol>\
                <ol class="center">\
                    <li><input title="Center, Left" type="radio" name="'+nm+'" value="0,50"/></li>\
                    <li><input title="Center, Center" type="radio" name="'+nm+'" value="50,50"/></li>\
                    <li><input title="Center, Right" type="radio" name="'+nm+'" value="100,50"/></li>\
                </ol>\
                <ol class="bottom">\
                    <li><input title="Bottom, Left" type="radio" name="'+nm+'" value="0,100"/></li>\
                    <li><input title="Bottom, Center" type="radio" name="'+nm+'" value="50,100"/></li>\
                    <li><input title="Bottom, Right" type="radio" name="'+nm+'" value="100,100"/></li>\
                </ol>\
                <div style="clear:both;"></div>\
            </div>');

        return anchor;
    },
    _getTempCanvas : function(width,height) {
        if(!this.DOM.tempCanvas) {
            this.DOM.tempCanvas = $('<canvas width="'+width+'" height="'+height+'"></canvas>');
        } else {
            this.DOM.tempCanvas.attr('width',width).attr('height',height);
        }
        return this.DOM.tempCanvas;
    },
    _getNumericInputValue : function(input) {
        if(input.val().trim() == ''  || isNaN(input.val()))
            return null;

        return parseFloat(input.val());
    },
    getOptions : function() {
        return this.internalOptions;
    }
};
