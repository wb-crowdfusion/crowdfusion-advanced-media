var VisualCropImageFilter = function() {
    this.slidersInitialized = false;

    VisualCropImageFilter.superclass.constructor.call(this);
};
extend(VisualCropImageFilter,AbstractImageFilter);

VisualCropImageFilter.getType = function() {
    return "visual-crop";
};
VisualCropImageFilter.prototype.getType = function() {
    return VisualCropImageFilter.getType();
};
VisualCropImageFilter.prototype.buildOptions = function(image,tool) {
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
    };

    var undoCrop = function(){
        if(me.overlayMode)
            return;
        me.DOM.cropButton.html('<div class="icon tick-icon"></div>Apply Crop');
        me.overlayMode = true;
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

    this.DOM.xOffsetInput = $('<input type="text" class="numeric" readonly value=""/>').val(0).change(refresh);
    this.DOM.yOffsetInput = $('<input type="text" class="numeric" readonly value=""/>').val(0).change(refresh);
    this.DOM.widthInput = $('<input type="text" class="numeric" value=""/>').val(image.width).change(function() {
        me.DOM.cropWidthSlider.slider('value', $(this).val() / image.width * 100.0);
        refresh();
    });
    this.DOM.heightInput = $('<input type="text" class="numeric" value=""/>').val(image.height).change(function() {
        me.DOM.cropHeightSlider.slider('value', $(this).val() / image.height * 100.0);
        refresh();
    });

    ul.append($('<li></li>').append('<label>Width:</label>').append(this.DOM.widthInput));
    ul.append($('<li></li>').append('<label>Height:</label>').append(this.DOM.heightInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Offset X:</label>').append(this.DOM.xOffsetInput));
    ul.append($('<li></li>').append('<label>Offset Y:</label>').append(this.DOM.yOffsetInput));
    ul.append($('<li></li>').append(this.DOM.cropButton));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<em class="note">*Pan and zoom the canvas to align the image within the crop region. Click the Apply Crop button to commit.</em>'));

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};
VisualCropImageFilter.prototype.renderOverlay = function($canvas, width, height, image, zoom, pan) {
    if(!this.overlayMode)
        return;

    try {

        var ctx = $canvas[0].getContext('2d');

        var cropWidth = this._getNumericInputValue(this.DOM.widthInput) || 0;
        var cropHeight = this._getNumericInputValue(this.DOM.heightInput) || 0;

        cropWidth = Math.round(cropWidth);
        cropHeight = Math.round(cropHeight);

        var cx = width / 2 - (cropWidth * zoom) / 2;
        var cy = height / 2 - (cropHeight * zoom) / 2;

        var absx = (((image.width*zoom)/2 - width/2) - (pan.x*zoom));
        var absy = (((image.height*zoom)/2 - height/2) - (pan.y*zoom));

        var xOffset = parseInt((absx+cx) * (1/zoom));
        var yOffset = parseInt((absy+cy) * (1/zoom));

        this.DOM.xOffsetInput.val(xOffset);
        this.DOM.yOffsetInput.val(yOffset);

        this.internalOptions.width = cropWidth;
        this.internalOptions.height = cropHeight;
        this.internalOptions.anchor = [0,0];
        this.internalOptions.xOffset = xOffset;
        this.internalOptions.yOffset = yOffset;

        /////////////////////////////////////////////////////////
        this.cropCanvas = this._getTempCanvas(cropWidth,cropHeight);
        var cropctx = this.cropCanvas[0].getContext('2d');

        cropctx.save();
        cropctx.clearRect(0,0,cropWidth,cropHeight);
        cropctx.drawImage(image.data,-1 * xOffset,-1 * yOffset);
        cropctx.restore();
        /////////////////////////////////////////////////////////

        if (!this.slidersInitialized) {
            this.DOM.cropWidthSlider = $('<div class="cropwidth-slider"></div>');
            this.DOM.cropWidthSliderLabel = $('<div class="cropwidth-slider-label"></div>');
            this.DOM.cropHeightSlider = $('<div class="cropheight-slider"></div>');
            this.DOM.cropHeightSliderLabel = $('<div class="cropheight-slider-label"></div>');

            $canvas.closest('.panel')
                .append(this.DOM.cropWidthSlider)
                .append(this.DOM.cropWidthSliderLabel)
                .append(this.DOM.cropHeightSlider)
                .append(this.DOM.cropHeightSliderLabel);

            this._buildCropSliders(width,height,image);

            this.slidersInitialized = true;
        }

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeRect(cx,cy,(cropWidth * zoom),(cropHeight * zoom));
        ctx.restore();

    } catch(err) {
        console_log(err);
    }

};

VisualCropImageFilter.prototype.renderPreview = function(context, image, zoom) {
    if(this.overlayMode)
        return image;

    return {
        data : this.cropCanvas[0],
        width : this.internalOptions.width,
        height : this.internalOptions.height
    }

};

VisualCropImageFilter.prototype._buildCropSliders = function(width,height,image) {
    var me = this;

    this.DOM.cropWidthSlider.css('left',width / 2 - this.DOM.cropWidthSlider.width() / 2);

    this.DOM.cropWidthSlider.slider({
        slide : function(event,ui) {
            var size = parseInt(ui.value / 100 * image.width);
            me.DOM.cropWidthSliderLabel.fadeIn('fast').text(size+'px');
            me.DOM.widthInput.val(parseInt(size)).change();
        },
        stop : function(event,ui) {
            $(me).trigger('refresh');
            me.DOM.cropWidthSliderLabel.fadeOut();
        },
        animate : true
    });

    this.DOM.cropWidthSlider.slider('value', this.DOM.widthInput.val() / image.width * 100.0);

    this.DOM.cropHeightSlider.css('top',height / 2 - this.DOM.cropHeightSlider.height() / 2);

    this.DOM.cropHeightSlider.slider({
        slide : function(event,ui) {
            var size = parseInt(ui.value / 100 * image.height);
            me.DOM.cropHeightSliderLabel.fadeIn('fast').text(size+'px');
            me.DOM.heightInput.val(parseInt(size)).change();
        },
        stop : function(event,ui) {
            $(me).trigger('refresh');
            me.DOM.cropHeightSliderLabel.fadeOut();
        },
        animate : true,
        orientation : 'vertical'
    });

    this.DOM.cropHeightSlider.slider('value', this.DOM.heightInput.val() / image.height * 100.0);
};

VisualCropImageFilter.prototype.onRemove = function() {
    this.DOM.cropWidthSlider.remove();
    this.DOM.cropWidthSliderLabel.remove();
    this.DOM.cropHeightSlider.remove();
    this.DOM.cropHeightSliderLabel.remove();
};