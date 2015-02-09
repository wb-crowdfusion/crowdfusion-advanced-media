var MatteImageFilter = function() {
    MatteImageFilter.superclass.constructor.call(this);
    this.internalOptions.image = null;
};
extend(MatteImageFilter,AbstractImageFilter);

MatteImageFilter.getType = function() {
    return "matte";
};
MatteImageFilter.prototype.getType = function() {
    return MatteImageFilter.getType();
};
MatteImageFilter.prototype.buildOptions = function(image) {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');

    this.DOM.anchor = this._buildAnchorInput('anchor');
    $(':input',this.DOM.anchor).change(refresh);

    this.DOM.widthInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.heightInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.mattColorPicker = $('<div class="color-picker"><input type="text" name="color" value=""/><span></span></div>');
    var input = $(this.DOM.mattColorPicker).find(':input');
    input.change(refresh);

    var activeColor = new $.jPicker.Color({ r: 0, g: 0, b: 0, a:0 });
    $(this.DOM.mattColorPicker).find('span').jPicker(
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

    this.DOM.xOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.yOffsetInput = $('<input type="text" class="numeric" value=""/>').change(refresh);
    this.DOM.mattImageInput = $('<div class="file-drop"><span>drop file</span></div>')
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
                me.matteImageWidth = me.matteImageHeight = 0;
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
                        if(confirm('Remove Matte Image?')){
                            img.remove();
                            me.internalOptions.image = null;
                            $('span',div).show();
                            refresh();
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
                                me.matteImageWidth = img.width();
                                me.matteImageHeight = img.height();
                                if(me.matteImageWidth >= me.matteImageHeight)
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
    this.DOM.imageRepeatCheckbox = $('<input type="checkbox"/>').change(refresh);

    ul.append($('<li></li>').append('<label>Canvas Width:</label>').append(this.DOM.widthInput));
    ul.append($('<li></li>').append('<label>Canvas Height:</label>').append(this.DOM.heightInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Matte Color:</label>').append(this.DOM.mattColorPicker));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Matte Image:</label>').append(this.DOM.mattImageInput));
    ul.append($('<li></li>').append('<label>Repeat:</label>').append(this.DOM.imageRepeatCheckbox));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Anchor:</label>').append(this.DOM.anchor));
    ul.append($('<li></li>').append('<label>Offset X:</label>').append(this.DOM.xOffsetInput));
    ul.append($('<li></li>').append('<label>Offset Y:</label>').append(this.DOM.yOffsetInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));

    var note = '<em class="note">*The Matte Filter is only applied if canvas width and canvas height are specified.</em>';
    if (typeof FileReader === 'undefined') {
        note = note + '<em class="note">*The Matte Image preview is not available in this browser. Please Apply & Save to view changes.</em>';
    }
    ul.append($('<li></li>').append(note));

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};

MatteImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var width = this._getNumericInputValue(this.DOM.widthInput);
        var height = this._getNumericInputValue(this.DOM.heightInput);

        var color = this.DOM.mattColorPicker.find(':input').val().trim();

        var x,y;
        var xOffset = this._getNumericInputValue(this.DOM.xOffsetInput);
        var yOffset = this._getNumericInputValue(this.DOM.yOffsetInput);

        if(width == null || height == null)
            return image;

        width = Math.round(width);
        height = Math.round(height);

        var anchor = $(':input:checked',this.DOM.anchor).val().split(',');
        var xr = (parseInt(anchor[0])/100.0);
        var yr = (parseInt(anchor[1])/100.0);
        x = (xr * image.width) - (xr * width);
        y = (yr * image.height) - (yr * height);

        var canvas = this._getTempCanvas(width,height);
        var ctx = canvas[0].getContext('2d');

        if(xOffset != null)
            xOffset = Math.round(xOffset);
        if(yOffset != null)
            yOffset = Math.round(yOffset);

        var repeatImage = this.DOM.imageRepeatCheckbox.is(':checked');

        this.internalOptions.width = width;
        this.internalOptions.height = height;
        this.internalOptions.anchor = anchor;
        this.internalOptions.xOffset = xOffset;
        this.internalOptions.yOffset = yOffset;
        this.internalOptions.repeat = repeatImage;

        ctx.save();
        ctx.clearRect(0,0,width,height);
        if(color.match(/^#?([0-9A-Fa-f]){6}$/)) {
            if(color.charAt(0) == '#')
                color = color.substr(1);
            ctx.fillStyle = '#'+color;
            ctx.fillRect(0,0,width,height);
        }

        this.internalOptions.color = ctx.fillStyle;

        var img = $('img',this.DOM.mattImageInput);
        if(img.length > 0) {
            //todo: use canvas background pattern for this
            if(repeatImage) {
                for(var i = 0; i < width; i += this.matteImageWidth)
                    for(var j = 0; j < height; j += this.matteImageHeight) {
                        ctx.drawImage(img[0],i,j);
                    }
            } else {
                ctx.drawImage(img[0],0,0);
            }

            this.internalOptions.image = img[0].src;
        }

        // If on the south or east edges, ImageMagick offsets up and left respectively. This is needed to reflect that in the UI.
        if (xr == 1)
            xOffset = -1 * xOffset;
        if (yr == 1)
            yOffset = -1 * yOffset;

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
