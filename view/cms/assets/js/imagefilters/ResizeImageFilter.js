var ResizeImageFilter = function() {
    ResizeImageFilter.superclass.constructor.call(this);
};
extend(ResizeImageFilter,AbstractImageFilter);

ResizeImageFilter.getType = function() {
    return "resize";
};
ResizeImageFilter.prototype.getType = function() {
    return ResizeImageFilter.getType();
};
ResizeImageFilter.prototype.buildOptions = function(image) {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');

    this.DOM.widthInput = $('<input type="text" class="numeric" value="'+Math.round(image.width)+'"/>').change(refresh);
    this.DOM.heightInput = $('<input type="text" class="numeric" value="'+Math.round(image.height)+'"/>').change(refresh);
    //this.DOM.methodSelect = $('<select><option value="lanczos">Lanczos</option></select>').change(refresh);
    ul.append($('<li></li>').append('<label>Width:</label>').append(this.DOM.widthInput));
    ul.append($('<li></li>').append('<label>Height:</label>').append(this.DOM.heightInput));
    //ul.append($('<li></li>').append('<label>Method:</label>').append(this.DOM.methodSelect));
    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};
ResizeImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var width = this._getNumericInputValue(this.DOM.widthInput);
        var height = this._getNumericInputValue(this.DOM.heightInput);

        if(width == null && height == null)
            return image;

        width = width == null ? null : Math.round(width);
        height = height == null ? null : Math.round(height);

        this.internalOptions.width = width;
        this.internalOptions.height = height;

        if(width == null) {
            width = image.width * (height / image.height);
            this.internalOptions.width = 'auto';
        }

        if(height == null) {
            height = image.height * (width / image.width);
            this.internalOptions.height = 'auto';
        }

        var canvas = this._getTempCanvas(width,height);
        var ctx = canvas[0].getContext('2d');

        ctx.save();
        ctx.clearRect(0,0,width,height);
        ctx.scale(width/image.width,height/image.height); //todo: will this produce pixel rounding errors?
        ctx.drawImage(image.data,0,0);
        ctx.restore();

        image.data = canvas[0];
        image.width = width;
        image.height = height;

    } catch(err) {
        console_log(err);
    }

    return image;
};
