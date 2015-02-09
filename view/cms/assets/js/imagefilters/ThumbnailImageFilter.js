var ThumbnailImageFilter = function() {
    ThumbnailImageFilter.superclass.constructor.call(this);
};
extend(ThumbnailImageFilter,AbstractImageFilter);

ThumbnailImageFilter.getType = function() {
    return "thumbnail";
};
ThumbnailImageFilter.prototype.getType = function() {
    return ThumbnailImageFilter.getType();
};
ThumbnailImageFilter.prototype.buildOptions = function(image,tool) {
    var me = this;

    this.overlayMode = true;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');

    var applyCrop = function(){
        if(!me.overlayMode)
            return;
        me.DOM.cropButton.html('<div class="icon turn-left-icon"></div>Undo Crop');
        me.overlayMode = false;
        me.DOM.sizeSelect.attr('disabled','true');
    };

    var undoCrop = function(){
        if(me.overlayMode)
            return;
        me.DOM.cropButton.html('<div class="icon tick-icon"></div>Apply Crop');
        me.overlayMode = true;
        me.DOM.sizeSelect.attr('disabled',null);
    };

    this.DOM.cropButton = $('<a href="#" class="button"><div class="icon tick-icon"></div>Apply Crop</a>').click(function(event){
        event.preventDefault();
        if(me.overlayMode) {
            applyCrop();
        } else {
            undoCrop();
        }
        $(me).trigger('refreshFit');
    });

    this.DOM.sizeSelect = $('<select></select>').change(refresh);
    var refreshSizes = function(){
        me.DOM.sizeSelect.empty();
        $('ol > li',tool.DOM.thumbnailPanel).each(function(i,li){
            var $li = $(li);
            var value = $li.data('value');
            if(value != null) { //exclude 'Add Thumbnail' li
                var ratio = $li.data('width') + ',' + $li.data('height');
                me.DOM.sizeSelect.append('<option value="'+ratio+'">'+value+' ('+$li.data('width')+' &times; '+$li.data('height')+')</option>');
            }
        });
        undoCrop();
    };
    $(tool).bind('loadImage',refreshSizes);
    refreshSizes();

    ul.append($('<li></li>').append('<label>Select Size:</label>').append(this.DOM.sizeSelect));

    ul.append($('<li></li>').append(this.DOM.cropButton));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<em class="note">*Pan and zoom the canvas to align the image within the crop region. Click the Apply Crop button to commit.</em>'));

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};
ThumbnailImageFilter.prototype.renderOverlay = function($canvas, width, height, image, zoom, pan) {
    if(!this.overlayMode)
        return;

    try {

        var ctx = $canvas[0].getContext('2d');

        var size = this.DOM.sizeSelect.val();
        this.internalOptions.width = parseInt(size.substr(0,size.indexOf(',')));
        this.internalOptions.height = parseInt(size.substr(size.indexOf(',')+1));

        var ratio = parseFloat(this.internalOptions.width/this.internalOptions.height);
        this.cropWidth = 0;
        this.cropHeight = 0;

        if(width > height) {
            this.cropHeight = height * 0.8;
            this.cropWidth = this.cropHeight * ratio;
        } else {
            this.cropWidth = width * 0.8;
            this.cropHeight = this.cropWidth * ratio;
        }

        this.cropWidth = parseInt(this.cropWidth);
        this.cropHeight = parseInt(this.cropHeight);

        var cx = width / 2 - this.cropWidth / 2;
        var cy = height / 2 - this.cropHeight / 2;

        //this produces a security exception if the src image is from a different domain
        //var cropSave = ctx.getImageData(cx,cy,this.cropWidth,this.cropHeight);

        var absx = (((image.width*zoom)/2 - width/2) - (pan.x*zoom));
        var absy = (((image.height*zoom)/2 - height/2) - (pan.y*zoom));

        this.internalOptions.cropWidth = this.cropWidth * (1/zoom);
        this.internalOptions.cropHeight = this.cropHeight * (1/zoom);
        this.internalOptions.xOffset = (absx+cx) * (1/zoom);
        this.internalOptions.yOffset = (absy+cy) * (1/zoom);

        //console_log(this.internalOptions.cropWidth + "," + this.internalOptions.cropHeight);
        //console_log(this.internalOptions.xOffset + "," + this.internalOptions.yOffset);

        /////////////////////////////////////////////////////////
        this.cropCanvas = this._getTempCanvas(this.cropWidth,this.cropHeight);
        var cropctx = this.cropCanvas[0].getContext('2d');
        cropctx.save();
        //cropctx.putImageData(cropSave,0,0);
        cropctx.drawImage($canvas[0],cx,cy,this.cropWidth,this.cropHeight,0,0,this.cropWidth,this.cropHeight);
        cropctx.restore();
        /////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////
        // if canvas has never been created or it exists but the width or height has changed since last
        if(!!!this.cropScaleCanvas || (
            !!this.cropScaleCanvas &&
            this.internalOptions.width != parseInt(this.cropScaleCanvas.attr('width')) &&
            this.internalOptions.height != parseInt(this.cropScaleCanvas.attr('height'))
            )
        ) {
            this.cropScaleCanvas = $('<canvas width="'+this.internalOptions.width+'" height="'+this.internalOptions.height+'"></canvas>');
        }
        var cropscalectx = this.cropScaleCanvas[0].getContext('2d');
        cropscalectx.save();
        cropscalectx.drawImage(this.cropCanvas[0],0,0,this.cropWidth,this.cropHeight,0,0,this.internalOptions.width,this.internalOptions.height);
        cropscalectx.restore();
        /////////////////////////////////////////////////////////

        /*
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+this.cropWidth,cy);
        ctx.lineTo(cx+this.cropWidth,cy+this.cropHeight);
        ctx.lineTo(cx,cy+this.cropHeight);
        ctx.clip();
        ctx.globalCompositeOperation = 'source-out';
        ctx.fillRect(cx,cy,width,height);
        ctx.restore();
*/
        //ctx.drawImage($canvas[0],cx,cy,this.cropWidth,this.cropHeight,cx,cy,this.cropWidth,this.cropHeight);


/*
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(width,0);
        ctx.lineTo(width,cy);
        ctx.lineTo(0,cy);
        ctx.clip();
        ctx.fillRect(0,0,width,height);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx+this.cropWidth,cy);
        ctx.lineTo(width,cy);
        ctx.lineTo(width,height);
        ctx.lineTo(cx+this.cropWidth,height);
        ctx.clip();
        ctx.fillRect(0,0,width,height);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(0,cy+this.cropHeight);
        ctx.lineTo(cx+this.cropWidth,cy+this.cropHeight);
        ctx.lineTo(cx+this.cropWidth,height);
        ctx.lineTo(0,height);
        ctx.clip();
        ctx.fillRect(0,0,width,height);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(0,cy);
        ctx.lineTo(cx,cy);
        ctx.lineTo(cx,cy+this.cropHeight);
        ctx.lineTo(0,cy+this.cropHeight);
        ctx.clip();
        ctx.fillRect(0,0,width,height);
        ctx.restore();
*/
        //ctx.putImageData(cropSave,cx,cy,0,0,this.cropWidth,this.cropHeight);

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeRect(cx,cy,this.cropWidth,this.cropHeight);
//        ctx.strokeStyle = 'black';
//        ctx.strokeRect(cx - 1,cy - 1,this.cropWidth + 2,this.cropHeight + 2);
        ctx.restore();

    } catch(err) {
        console_log(err);
    }

};

ThumbnailImageFilter.prototype.renderPreview = function(context, image, zoom) {
    if(this.overlayMode)
        return image;

    return {
        data : this.cropScaleCanvas[0],
        width : this.internalOptions.width,
        height : this.internalOptions.height
    }

};