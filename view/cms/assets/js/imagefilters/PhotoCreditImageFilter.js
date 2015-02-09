var PhotoCreditImageFilter = function() {
    PhotoCreditImageFilter.superclass.constructor.call(this);
};
extend(PhotoCreditImageFilter,AbstractImageFilter);

PhotoCreditImageFilter.getType = function() {
    return "photo-credit";
};
PhotoCreditImageFilter.getFonts = function() {
    return ['Helvetica','Lucida Grande','Courier New','Georgia'];
};
PhotoCreditImageFilter.prototype.getType = function() {
    return PhotoCreditImageFilter.getType();
};
PhotoCreditImageFilter.prototype.buildOptions = function(image) {
    var me = this;

    var refresh = function(){
        $(me).trigger('refresh');
    };

    var panel = $('<div class="filter-options '+this.getType()+'"></div>');
    var ul = $('<ul></ul>');

    this.DOM.anchor = this._buildAnchorInput('anchor');
    $(':input',this.DOM.anchor).change(refresh);
    $(':input:eq(3)',this.DOM.anchor).attr('disabled','true');
    $(':input:eq(4)',this.DOM.anchor).attr('disabled','true');
    $(':input:eq(5)',this.DOM.anchor).attr('disabled','true');


    this.DOM.modeSelect = $('<select><option value="add">Add</option><option value="overlay">Overlay</option></select>').change(refresh);

    this.DOM.fontFamilySelect = $('<select></select>').change(refresh);
    $.each(PhotoCreditImageFilter.getFonts(),function(idx,font){
        me.DOM.fontFamilySelect.append('<option value="'+font+'">'+font+'</option>');
    });
    this.DOM.fontWeightSelect = $('<select><option value="normal">Normal</option><option value="bold">Bold</option></select>').change(refresh);
    this.DOM.fontSizeInput = $('<input type="text" class="numeric" value="10"/>').change(refresh);
    this.DOM.fontColorPicker = $('<div class="color-picker"><input type="text" name="color" value="#000000"/><span></span></div>');
    var input = $(this.DOM.fontColorPicker).find(':input');
    input.change(refresh);

    var activeColor = new $.jPicker.Color({ r: 0, g: 0, b: 0, a: 1 });
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

    this.DOM.bgColorPicker = $('<div class="color-picker"><input type="text" name="color" value="#ffffff"/><span></span></div>');
    var bginput = $(this.DOM.bgColorPicker).find(':input');
    bginput.change(refresh);

    var bgActiveColor = new $.jPicker.Color({ r: 255, g: 255, b: 255, a: 1 });
    $(this.DOM.bgColorPicker).find('span').jPicker(
        {
            window : {
                title : bginput.attr('title'),
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
                active: bgActiveColor
            },
            images : {
                //todo: figure out how to use a dynamic relative path
                clientPath : document.assetBasePath+'images/jpicker/'
            }
        },
        function(color, context) {
            var val = color.val();
            if(val == null)
                bginput.val('').trigger('change');
            else
                bginput.val(
                    '#'+ ((1 << 24) + (val.r << 16) + (val.g << 8) + val.b).toString(16).slice(1)
                )
                .trigger('change');
        }
    );

    this.DOM.paddingInput = $('<input type="text" class="numeric" value="5"/>').change(refresh);


    ul.append($('<li></li>').append('<label>Mode:</label>').append(this.DOM.modeSelect));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Font Family:</label>').append(this.DOM.fontFamilySelect));
    ul.append($('<li></li>').append('<label>Font Weight:</label>').append(this.DOM.fontWeightSelect));
    ul.append($('<li></li>').append('<label>Font Size:</label>').append(this.DOM.fontSizeInput));
    ul.append($('<li></li>').append('<label>Font Color:</label>').append(this.DOM.fontColorPicker));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Text:</label>').append(this.DOM.textInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Background Color:</label>').append(this.DOM.bgColorPicker));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Padding:</label>').append(this.DOM.paddingInput));
    ul.append($('<li></li>').append('<div class="separator"></div>'));
    ul.append($('<li></li>').append('<label>Anchor:</label>').append(this.DOM.anchor));

    panel.append(ul).append('<div style="clear:both;"></div>');

    return panel;
};

PhotoCreditImageFilter.prototype.renderPreview = function(context, image, zoom) {

    try {
        var padding = this._getNumericInputValue(this.DOM.paddingInput);
        if(padding != null)
            padding = Math.round(padding);
        else
            padding = 0;

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
            fontColor = '#'+fontColor;
        }
        else {
            return image;
        }

        var bgColor = this.DOM.bgColorPicker.find(':input').val().trim();
        if(bgColor.match(/^#?([0-9A-Fa-f]){6}$/)) {
            if(bgColor.charAt(0) == '#')
                bgColor = bgColor.substr(1);
            bgColor = '#'+bgColor;
        }
        else {
            return image;
        }

        var mode = this.DOM.modeSelect.val();

        var height = (padding * 2) + fontSize;
        var modeOffset = (mode == 'add' ? 0 : height);
        var imageOffset = (mode == 'add' ? height : 0);

        var anchor = $(':input:checked',this.DOM.anchor).val().split(',');
        var xr = (parseInt(anchor[0])/100.0);
        var yr = (parseInt(anchor[1])/100.0);

        this.internalOptions.width = image.width;
        this.internalOptions.height = image.height;
        this.internalOptions.mode = mode;
        this.internalOptions.fontFamily = fontFamily;
        this.internalOptions.fontWeight = fontWeight;
        this.internalOptions.fontSize = fontSize;
        this.internalOptions.fontColor = fontColor;
        this.internalOptions.text = text;
        this.internalOptions.backgroundColor = bgColor;
        this.internalOptions.padding = padding;
        this.internalOptions.anchor = anchor;

        var canvas = this._getTempCanvas(image.width,image.height+imageOffset);
        var ctx = canvas[0].getContext('2d');

        ctx.save();

        ctx.clearRect(0,0,image.width,image.height+imageOffset);
        ctx.drawImage(image.data,0,imageOffset * (1-yr)); //done

        ctx.fillStyle = bgColor;
        ctx.fillRect(0,(yr*image.height) - (yr*modeOffset),image.width,height);

        ctx.font = fontWeight+' '+fontSize+'px '+fontFamily;
        ctx.fillStyle = fontColor;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        var tm = ctx.measureText(text);
        var paddingOffset = (xr == 1 ? -1 * padding : ((1-Math.ceil(xr)) * padding));
        ctx.fillText(text,(xr*image.width) - (xr*tm.width) + paddingOffset,(yr*image.height) - (yr*modeOffset) + padding, image.width - (2*padding));

        ctx.restore();

        image.data = canvas[0];
        image.height = image.height + imageOffset;

    } catch(err) {
        console_log(err);
    }

    return image;
};


