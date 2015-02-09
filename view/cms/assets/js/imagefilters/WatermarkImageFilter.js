var WatermarkImageFilter = function() {
    WatermarkImageFilter.superclass.constructor.call(this);
    this.internalOptions.image = null;
};
extend(WatermarkImageFilter,AbstractImageFilter);

WatermarkImageFilter.getType = function() {
    return "watermark";
};
WatermarkImageFilter.getFonts = function() {
    return ['Helvetica','Lucida Grande','Courier New','Georgia'];
};
WatermarkImageFilter.prototype.getType = function() {
    return WatermarkImageFilter.getType();
};
WatermarkImageFilter.prototype.buildOptions = function(image) {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');


    this.DOM.anchor = this._buildAnchorInput('anchor');
    $(':input',this.DOM.anchor).change(refresh);

    this.DOM.typeSelect = $('<select><option value="text">Text</option><option value="image">Image</option></select>').change(function(){
        if($(this).val() == 'text') {
            $('li.1',ul).show();
            $('li.2',ul).hide();
        } else {
            $('li.1',ul).hide();
            $('li.2',ul).show();
        }
        refresh();
    });


    this.DOM.fontFamilySelect = $('<select></select>').change(refresh);
    $.each(WatermarkImageFilter.getFonts(),function(idx,font){
        me.DOM.fontFamilySelect.append('<option value="'+font+'">'+font+'</option>');
    });
    this.DOM.fontWeightSelect = $('<select><option value="normal">Normal</option><option value="bold">Bold</option></select>').change(refresh);
    this.DOM.fontSizeInput = $('<input type="text" class="numeric" value="14"/>').change(refresh);
    this.DOM.fontColorPicker = $('<div class="color-picker"><input type="text" name="color" value="#ffffff"/><span></span></div>');
    var input = $(this.DOM.fontColorPicker).find(':input');
    input.change(refresh);

    var activeColor = new $.jPicker.Color({ r: 255, g: 255, b: 255, a: 1 });
    $(this.DOM.fontColorPicker).find('span').jPicker(
        {
            window : {
                title : input.attr('title'),
                expandable : true,
                position : {
                    x : 'screenCenter',
                    y : 'bottom'
                },
                effects : {
                    type : 'fade',
                    speed : {
                        show : 'fast',
                        hide : 'fast'
                    }
                },
                alphaSupport : false
            },
            color : {
                active: activeColor
            },
            images : {
                //todo: figure out how to use a dynamic relative path
                clientPath : document.assetBasePath+'images/jpicker/'
            }
        },
        function(color, context) {
            var val = color.val();
            if(val == null)
                input.val('').trigger('change');
            else
                input.val(
                    '#'+ ((1 << 24) + (val.r << 16) + (val.g << 8) + val.b).toString(16).slice(1)
                )
                .trigger('change');
        }
    );

    this.DOM.textInput = $('<input type="text" class="" value=""/>').change(refresh);

    this.DOM.opacityInput = $('<input type="text" class="numeric" value="100"/>').change(refresh);

    this.DOM.xOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.yOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);

    this.DOM.watermarkImageInput = $('<div class="file-drop"><span>drop file</span></div>')
        .bind('dragover',function(event){
            event.stopPropagation();
            event.preventDefault();
            $(this).addClass('over');
        })
        .bind('dragleave',function(event){
            event.stopPropagation();
            event.preventDefault();
            $(this).removeClass('over');
        })
        .bind('drop',function(event){
            event.stopPropagation();
            event.preventDefault();
            try {
                var div = $(this);
                div.removeClass('over');
                $('img',div).remove();
                me.watermarkImageWidth = me.watermarkImageHeight = 0;
                var dt = event.originalEvent.dataTransfer;
                if(dt == null)
                    return;
                var files = dt.files;
                if(files.length > 0) {
                    var file = files[0];
                    if (!file.type.match(/image\/jpeg/) && !file.type.match(/image\/gif/) && !file.type.match(/image\/png/)) {
                        return false;
                    }
                    $('span',div).hide();
                    var img = $('<img style="opacity:0"/>').click(function(){
                        if(confirm('Remove Watermark Image?')){
                            img.remove();
                            me.internalOptions.image = null;
                            $('span',div).show();
                        }
                    });
                    if (typeof FileReader !== 'undefined' && typeof FileReader.prototype.readAsDataURL === 'function') {
                        var dataURLReader = new FileReader();
                        dataURLReader.onloadend = function() {
                            img.attr('src',dataURLReader.result);
                            me.internalOptions.image = dataURLReader.result;
                            div.append(img);
                            //allow browser time to calc image dimensions
                            setTimeout(function(){
                                me.watermarkImageWidth = img.width();
                                me.watermarkImageHeight = img.height();
                                if(me.watermarkImageWidth >= me.watermarkImageHeight)
                                    img.attr('width',50);
                                else
                                    img.attr('height',50);
                                img.css('opacity',1);
                                refresh();
                            },100);
                        };

                        dataURLReader.readAsDataURL(file);
                    }
                    else {
                        me.internalOptions.image = {
                            file : file,
                            filename : file.name,
                            type : file.type
                        };
                    }
                }
            } catch(err) {
                console_log(err);
            }
        })
    ;

    ul.append($('<li></li>').append('<label>Type:</label>').append(this.DOM.typeSelect));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li class="1"></li>').append('<label>Font Family:</label>').append(this.DOM.fontFamilySelect));
    ul.append($('<li class="1"></li>').append('<label>Font Weight:</label>').append(this.DOM.fontWeightSelect));
    ul.append($('<li class="1"></li>').append('<label>Font Size:</label>').append(this.DOM.fontSizeInput));
    ul.append($('<li class="1"></li>').append('<label>Font Color:</label>').append(this.DOM.fontColorPicker));
    ul.append($('<li class="1"></li>').append('<div class="separator"></div>'));
    ul.append($('<li class="1"></li>').append('<label>Text:</label>').append(this.DOM.textInput));
    ul.append($('<li class="2"></li>').append('<label>Watermark Image:</label>').append(this.DOM.watermarkImageInput).hide());
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Opacity:</label>').append(this.DOM.opacityInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Anchor:</label>').append(this.DOM.anchor));
    ul.append($('<li></li>').append('<label>Offset X:</label>').append(this.DOM.xOffsetInput));
    ul.append($('<li></li>').append('<label>Offset Y:</label>').append(this.DOM.yOffsetInput));

    if (typeof FileReader === 'undefined') {
        ul.append($('<li></li>').append('<div class="separator"></div>'));
        var note = '<em class="note">*The Image Watermark preview is not available in this browser. Please Apply & Save to view image watermark changes.</em>';
        ul.append($('<li></li>').append(note));
    }

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};

WatermarkImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var type = this.DOM.typeSelect.val();

        var img = null;
        var fillStyle = "#FFFFFF";
        var font = 'normal 10px sans-serif';

        if(type == 'text') {
            var fontFamily = this.DOM.fontFamilySelect.val();
            var fontWeight = this.DOM.fontWeightSelect.val();
            var fontColor = this.DOM.fontColorPicker.find(':input').val().trim();
            var fontSize = this._getNumericInputValue(this.DOM.fontSizeInput);
            if(fontSize == null)
                return image;

            var text = this.DOM.textInput.val().trim();
            if(text.length == 0)
                return image;

            if(fontColor.match(/^#?([0-9A-Fa-f]){6}$/)) {
                if(fontColor.charAt(0) == '#')
                    fontColor = fontColor.substr(1);
                fillStyle = '#'+fontColor;
            }

            font = fontWeight+' '+fontSize+'px '+fontFamily;

        } else /* image */ {
            img = $('img',this.DOM.watermarkImageInput);
            //if(img.length == 0)
            //    return image;
        }

        var opacity = this._getNumericInputValue(this.DOM.opacityInput);

        var x,y;
        var xOffset = this._getNumericInputValue(this.DOM.xOffsetInput);
        var yOffset = this._getNumericInputValue(this.DOM.yOffsetInput);


        if(xOffset != null)
            xOffset = Math.round(xOffset);
        if(yOffset != null)
            yOffset = Math.round(yOffset);

        var canvas = this._getTempCanvas(image.width,image.height);
        var ctx = canvas[0].getContext('2d');

        ctx.save();
        ctx.clearRect(0,0,image.width,image.height);
        ctx.drawImage(image.data,0,0);

        ctx.fillStyle = fillStyle;

        if(opacity != null && opacity > 0 && opacity <= 100) {
            ctx.globalAlpha = opacity/100.0;
        }

        var width,height;

        if(type == 'text') {
            ctx.font = font;
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            var tm = ctx.measureText(text);
            width = tm.width;
            height = fontSize;
        } else /* image */ {
            width = this.watermarkImageWidth;
            height = this.watermarkImageHeight;
        }

        var anchor = $(':input:checked',this.DOM.anchor).val().split(',');
        var xr = (parseInt(anchor[0])/100.0);
        var yr = (parseInt(anchor[1])/100.0);
        x = (xr * image.width) - (xr * width);
        y = (yr * image.height) - (yr * height);

        this.internalOptions.width = width;
        this.internalOptions.height = height;
        this.internalOptions.anchor = anchor;
        this.internalOptions.xOffset = xOffset;
        this.internalOptions.yOffset = yOffset;
        this.internalOptions.opacity = opacity;
        this.internalOptions.mode = type;
        this.internalOptions.fontFamily = fontFamily;
        this.internalOptions.fontWeight = fontWeight;
        this.internalOptions.fontSize = fontSize;
        this.internalOptions.fontColor = fontColor;
        this.internalOptions.text = text;

        // If on the south or east edges, ImageMagick offsets up and left respectively. This is needed to reflect that in the UI.
        if (xr == 1)
            xOffset = -1 * xOffset;
        if (yr == 1)
            yOffset = -1 * yOffset;

        if(type == 'text') {
            ctx.fillText(text,x+xOffset,y+yOffset);
        } else /* image */ {
            if(img.length > 0)
                ctx.drawImage(img[0],x+xOffset,y+yOffset);
        }

        ctx.restore();

        image.data = canvas[0];

    } catch(err) {
        console_log(err);
    }

    return image;
};


