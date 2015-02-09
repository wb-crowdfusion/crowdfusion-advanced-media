var CropImageFilter = function() {
    CropImageFilter.superclass.constructor.call(this);
};
extend(CropImageFilter,AbstractImageFilter);

CropImageFilter.getType = function() {
    return "crop";
};
CropImageFilter.prototype.getType = function() {
    return CropImageFilter.getType();
};
CropImageFilter.prototype.buildOptions = function(image) {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');

    this.DOM.anchor = this._buildAnchorInput('anchor');
    $(':input',this.DOM.anchor).change(refresh);

    this.DOM.xOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.yOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.widthInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.heightInput = $('<input type="text" class="numeric" value=""/>').change(refresh);

    ul.append($('<li></li>').append('<label>Width:</label>').append(this.DOM.widthInput));
    ul.append($('<li></li>').append('<label>Height:</label>').append(this.DOM.heightInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Anchor:</label>').append(this.DOM.anchor));
    ul.append($('<li></li>').append('<label>Offset X:</label>').append(this.DOM.xOffsetInput));
    ul.append($('<li></li>').append('<label>Offset Y:</label>').append(this.DOM.yOffsetInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<em class="note">*The Crop Filter is only applied if width and height are specified.</em>'));

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};
CropImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var x,y;
        var xOffset = this._getNumericInputValue(this.DOM.xOffsetInput);
        var yOffset = this._getNumericInputValue(this.DOM.yOffsetInput);
        var width = this._getNumericInputValue(this.DOM.widthInput);
        var height = this._getNumericInputValue(this.DOM.heightInput);

        if(width == null || height == null)
            return image;

        width = Math.round(width);
        height = Math.round(height);

        var anchor = $(':input:checked',this.DOM.anchor).val().split(',');
        var xr = (parseInt(anchor[0])/100.0);
        var yr = (parseInt(anchor[1])/100.0);
        x = (xr * image.width) - (xr * width);
        y = (yr * image.height) - (yr * height);

        if(xOffset != null)
            xOffset = Math.round(xOffset);
        if(yOffset != null)
            yOffset = Math.round(yOffset);

        this.internalOptions.width = width;
        this.internalOptions.height = height;
        this.internalOptions.anchor = anchor;
        this.internalOptions.xOffset = xOffset;
        this.internalOptions.yOffset = yOffset;

        // If on the south or east edges, ImageMagick offsets up and left respectively. This is needed to reflect that in the UI.
        if (xr == 1)
            xOffset = -1 * xOffset;
        if (yr == 1)
            yOffset = -1 * yOffset;

        var canvas = this._getTempCanvas(width,height);
        var ctx = canvas[0].getContext('2d');

        ctx.save();
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(image.data,(-1*x)-xOffset,(-1*y)-yOffset);
        ctx.restore();

        image.data = canvas[0];
        image.width = width;
        image.height = height;

    } catch(err) {
        console_log(err);
    }

    return image;
};