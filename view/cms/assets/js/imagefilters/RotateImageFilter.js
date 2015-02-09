var RotateImageFilter = function() {
    RotateImageFilter.superclass.constructor.call(this);
};
extend(RotateImageFilter,AbstractImageFilter);

RotateImageFilter.getType = function() {
    return "rotate";
};
RotateImageFilter.prototype.getType = function() {
    return RotateImageFilter.getType();
};
RotateImageFilter.prototype.buildOptions = function() {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');
    this.DOM.degreesInput = $('<input type="text" class="numeric" value="0"/>').change(refresh);
    this.DOM.autoCropCheckbox = $('<input type="checkbox"/>').change(refresh);
    ul.append($('<li></li>').append('<label>Degrees:</label>').append(this.DOM.degreesInput));
    ul.append($('<li></li>').append('<label>Auto-crop:</label>').append(this.DOM.autoCropCheckbox).append('<em class="note">*This option is applied only when rotation is &plusmn;15 degrees.</em>'));
    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};
RotateImageFilter.prototype._getAutoCropDimensions = function(radians,width,height) {

    //MATH REF:
    //xRot = xCenter + cos(Angle) * (x - xCenter) - sin(Angle) * (y - yCenter)
    //yRot = yCenter + sin(Angle) * (x - xCenter) + cos(Angle) * (y - yCenter)

    var topLeft     = { x : (-1 * (width/2)), y : (-1*(height/2)) };
    var bottomLeft  = { x : (-1 * (width/2)), y : ( 1*(height/2)) };
    var topRight    = { x : ( 1 * (width/2)), y : (-1*(height/2)) };
    var bottomRight = { x : ( 1 * (width/2)), y : ( 1*(height/2)) };

    var x,y,w,h;

    if(radians < 0) {
        x =  Math.cos(radians) * bottomLeft.x -  Math.sin(radians) * bottomLeft.y;
        y =  Math.sin(radians) * topLeft.x +     Math.cos(radians) * topLeft.y;
        w = (Math.cos(radians) * topRight.x -    Math.sin(radians) * topRight.y) - x;
        h = (Math.sin(radians) * bottomRight.x + Math.cos(radians) * bottomRight.y) - y;
    } else {
        x =  Math.cos(radians) * topLeft.x -     Math.sin(radians) * topLeft.y;
        y =  Math.sin(radians) * topRight.x +    Math.cos(radians) * topRight.y;
        w = (Math.cos(radians) * bottomRight.x - Math.sin(radians) * bottomRight.y) - x;
        h = (Math.sin(radians) * bottomLeft.x +  Math.cos(radians) * bottomLeft.y) - y;
    }

    return { width : w, height : h };
};
RotateImageFilter.prototype._getRotateDimensions = function(radians,width,height) {

    //MATH REF:
    //xRot = xCenter + cos(Angle) * (x - xCenter) - sin(Angle) * (y - yCenter)
    //yRot = yCenter + sin(Angle) * (x - xCenter) + cos(Angle) * (y - yCenter)

    var topLeft     = { x : (-1 * (width/2)), y : (-1*(height/2)) };
    var bottomLeft  = { x : (-1 * (width/2)), y : ( 1*(height/2)) };
    var topRight    = { x : ( 1 * (width/2)), y : (-1*(height/2)) };
    var bottomRight = { x : ( 1 * (width/2)), y : ( 1*(height/2)) };

    var minY=0,minX=0,maxY=0,maxX=0;

    $.each([topLeft,bottomLeft,topRight,bottomRight],function(i,point){
        var x =  Math.cos(radians) * point.x -  Math.sin(radians) * point.y;
        var y =  Math.sin(radians) * point.x +  Math.cos(radians) * point.y;

        if(x < minX) minX = x;
        if(x > maxX) maxX = x;
        if(y < minY) minY = y;
        if(y > maxY) maxY = y;
    });

    return { width : maxX - minX, height : maxY - minY };
};
RotateImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var deg = this._getNumericInputValue(this.DOM.degreesInput);
        if(deg == null)
            return image;

        var dim;
        var radians = deg * (Math.PI / 180.0);

        var autoCrop = this.DOM.autoCropCheckbox.is(':checked');

        //only enable auto-crop if rotation is +- 15 degrees (otherwise it's too severe)
        if(deg != 0 && deg <= 15 && deg >= -15 && autoCrop) {
            dim = this._getAutoCropDimensions(radians,image.width,image.height);
        } else  {
            dim = this._getRotateDimensions(radians,image.width,image.height);
        }

        this.internalOptions.width = image.width;
        this.internalOptions.height = image.height;
        this.internalOptions.angle = deg;
        this.internalOptions.autoCrop = autoCrop;

        var canvas = this._getTempCanvas(dim.width,dim.height);
        var ctx = canvas[0].getContext('2d');

        ctx.save();
        ctx.clearRect(0,0,dim.width,dim.height);
        ctx.translate(dim.width/2,dim.height/2);
        ctx.rotate(radians);
        ctx.drawImage(image.data,(image.width/2)*-1,(image.height/2)*-1);
        ctx.restore();

        image.data = canvas[0];
        image.width = dim.width;
        image.height = dim.height;

    } catch(err) {
        console_log(err);
    }

    return image;
};
