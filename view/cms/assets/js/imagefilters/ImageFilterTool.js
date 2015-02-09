var ImageFilterTool = function(options){

    this.options = $.extend({
        nodeRef : null, // one of these is required
        node : null,    // one of these is required
        gallery : null, // element:slug#role OR array
        background : 'black',
        patternSize : 10,
        filters : [
            'ResizeImageFilter','CropImageFilter',/*'VisualCropImageFilter',*/'RotateImageFilter','MatteImageFilter','WatermarkImageFilter','PhotoCreditImageFilter','ThumbnailImageFilter'
        ],
        minZoom : 10,
        maxZoom : 400
    },options || {});


    var me = this;

    this.filters = [];
    this.DOM = {
        container : null,
        clickShield : null
    };

    this.uploadProperties = {};

    this.asyncQueue = new AsyncQueue();

    this.DOM.container = $('<div id="image-filter-tool"></div>').click(function(event){
        if(me.DOM.addFilterMenu.css('display') != 'none')
            me.DOM.addFilterMenu.hide();
    });
    this.DOM.titleBar = $('<div class="title-bar"><span>image filter tool</span></div>');
    this.DOM.closeButton = $('<div class="close-button"><a href="#" title="Close">&times;</a></div>');
    $('a',this.DOM.closeButton).click(function(event){
        event.preventDefault();
        if(me.filters.length == 0 || confirm('Are you sure?'))
            me._close.apply(me);
    });


    /* GALLERY */
    this.DOM.galleryPanel = $('<div class="panel gallery-panel">\
        <div class="scroll-pane">\
            <ol>\
            </ol>\
            </div>\
        </div>');


    /* CANVAS */
    this.DOM.canvasPanel = $('<div class="panel canvas-panel"></div>');
    this.DOM.canvas = $('<canvas width="100" height="100"></canvas>');
    this.DOM.canvasLoader = $('<div class="ajax-loader"></div>');
    this.context = this.DOM.canvas[0].getContext('2d');
    this.DOM.canvasZoomSlider = $('<div class="slider"></div>');
    this.DOM.canvasZoomLabel = $('<div class="slider-label"></div>');
    this.DOM.canvasConfigMenu = $('<div class="config-menu"><ul></ul></div>');
    $('ul',this.DOM.canvasConfigMenu)
        .append($('<li title="Black Background" class="black-background"><div></div></li>').click(function(event){
            event.preventDefault();
            me._setCanvasBackground.apply(me,['black']);
        }))
        .append($('<li title="White Background" class="white-background"><div></div></li>').click(function(event){
            event.preventDefault();
            me._setCanvasBackground.apply(me,['white']);
        }))
        .append($('<li title="Grey Background" class="grey-background"><div></div></li>').click(function(event){
            event.preventDefault();
            me._setCanvasBackground.apply(me,['grey']);
        }))
        .append($('<li title="Checkerboard Background" class="checkerboard-background"><div></div></li>').click(function(event){
            event.preventDefault();
            me._setCanvasBackground.apply(me,['checkerboard']);
        }))
        .append($('<li title="Toggle Hash Marks" class="toggle-hash-marks"><div></div></li>').click(function(event){
            event.preventDefault();
            me._toggleHashMarks.apply(me);
        }))
        .append($('<li title="Zoom to Fit" class="zoom-to-fit"><div></div></li>').click(function(event){
            event.preventDefault();
            me._zoomToFit.apply(me);
        }))
        .append($('<li title="Zoom 100%" class="zoom-100"><div>1:1</div></li>').click(function(event){
            event.preventDefault();
            me._zoomTo.apply(me,[100]);
        }));

    this.DOM.canvasPanel
        .append(this.DOM.canvas)
        .append(this.DOM.canvasLoader)
        .append(this.DOM.canvasZoomSlider)
        .append(this.DOM.canvasZoomLabel)
        .append(this.DOM.canvasConfigMenu)
        .append('<div class="drophover-indicator"></div>');

    this.DOM.canvasPanel.droppable({
        accept : '.gallery-item',
        hoverClass : 'drophover',
        drop : function(event,ui){
            var nodeRef = $(ui.draggable).data('nodeRef');
            me._loadImage.apply(me,[nodeRef]);
        }
    });


    this.DOM.sidePanel = $('<div class="panel side-panel"></div>');

    /* ORIGINAL */
    this.DOM.originalPanel = $(
        '<div class="original-panel">\
            <h4>original</h4>\
            <img style="display:none;" src=""/>\
            <ul>\
            </ul>\
            <div style="clear:both;"></div>\
        </div>');

    /* THUMBNAILS */
    this.DOM.thumbnailPanel = $('<div class="thumbnail-panel">\
            <h4>thumbnails</h4>\
            <ol>\
                <li class="buttons">\
                    <div class="buttons"><a href="#" class="button"><div class="icon plus-icon"></div>add thumbnail</a></div>\
                </li>\
            </ol>\
        </div>');

    /* FILTERS */
    this.DOM.filtersPanel = $('<div class="panel filters-panel">\
            <div class="tabs">\
                <ol>\
                    <li class="save" style="display:none;"><a href="#">SUMMARY</a></li>\
                    <li class="add"><a href="#">add filter</a></li>\
                </ol>\
                <div style="clear:both;"></div>\
            </div>\
            <div class="filter-options empty">\
                <p>There are no image transformation filters defined. Click the <strong>Add Filter</strong> button to get started. &uarr;</p>\
                <div style="clear:both;"></div>\
            </div>\
            <div class="add-filter-menu" style="display:none;">\
                <ul>\
                <ul>\
            </div>\
        </div>');
    $('.tabs > ol > li.save > a',this.DOM.filtersPanel).click(function(event){
        event.preventDefault();
        $('.tabs > ol > li',me.DOM.filtersPanel).removeClass('active');
        $('.tabs > ol > li.save',me.DOM.filtersPanel).addClass('active');
        $('.filter-options',me.DOM.filtersPanel).hide();
        $('.filter-options.summary',me.DOM.filtersPanel).show();
    });
    this.DOM.addFilterMenu = $('.add-filter-menu',this.DOM.filtersPanel);
    $.each(this.options.filters,function(i,cls){
        try {
            var filterType = eval(cls+'.getType()');
            me.DOM.addFilterMenu.append($('<li>'+filterType+'</li>').data('type',filterType).data('class',cls));
        } catch(err) {
            console_log("Filter class not available: "+cls);
        }
    });
    $('li',this.DOM.addFilterMenu).click(function(event){
        event.preventDefault();
        me._addFilter.apply(me,[$(this).data('type'),$(this).data('class')]);
        me.DOM.addFilterMenu.hide();
    });
    this.DOM.addFilterButton = $('li.add > a',this.DOM.filtersPanel).click(function(event){
        event.preventDefault();
        event.stopPropagation();
        me.DOM.addFilterMenu.toggle();
    });


    /* UPLOAD/REPLACE DIALOG */
    this.DOM.uploadDialog = $('<div class="upload-dialog" style="display:none;">\
            <div class="title-bar"><span>replace - 150w</span></div>\
            <div class="file-drop"><span>drop file</span></div>\
            <ol></ol>\
            <p class="help replace">Drag an image file from your desktop to the box on the left. A preview of the image will be displayed. Click <strong>OK</strong> to upload and replace the chosen thumbnail size.</p>\
            <p class="help add">Drag an image file from your desktop to the box on the left. A preview of the image will be displayed. Click <strong>OK</strong> to upload a new thumbnail size.</p>\
            <div class="buttons"><a href="#" class="cancel">Cancel</a><a href="#" class="button"><div class="icon tick-icon"></div>OK</a><div style="clear:both;"></div></div>\
        </div>');

    $('a.cancel',this.DOM.uploadDialog).click(function(event){
        event.preventDefault();
        me._closeUploadDialog.apply(me);
    });
    $('a.button',this.DOM.uploadDialog).click(function(event){
        event.preventDefault();
        me._processUploadDialog.apply(me);
    });
    $('.file-drop',this.DOM.uploadDialog)
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
                var dt = event.originalEvent.dataTransfer;
                if(dt == null)
                    return;
                var files = dt.files;
                if(files.length > 0) {
                    var file = files[0];
                    me.uploadProperties.file = file;
                    me.uploadProperties.fileName = file.name;
                    me.uploadProperties.type = file.type;
                    if (!file.type.match(/image\/jpeg/) && !file.type.match(/image\/gif/) && !file.type.match(/image\/png/)) {
                        return false;
                    }
                    var width = '', height = '';

                    var showImageDetails = function() {
                        $('p.help',me.DOM.uploadDialog).hide();
                        var ol = $('ol',me.DOM.uploadDialog).empty().show();
                        ol.append('<li><strong>Filename:</strong> '+file.name+'</li>');
                        ol.append('<li><strong>Type:</strong> '+file.type+'</li>');
                        ol.append('<li><strong>Size:</strong> '+humanFilesize(file.size,2)+'</li>');
                        ol.append('<li><strong>Width:</strong> '+width+'</li>');
                        ol.append('<li><strong>Height:</strong> '+height+'</li>');
                    };

                    if(typeof FileReader == 'function') {
                        $('span',div).hide();
                        var img = $('<img style="opacity:0"/>');
                        var dataURLReader = new FileReader();
                        dataURLReader.onloadend = function() {
                            img.attr('src',dataURLReader.result);
                            div.append(img);
                            //allow browser time to calc image dimensions
                            setTimeout(function(){
                                width = img.width();
                                height = img.height();
                                me.uploadProperties.width = width;
                                me.uploadProperties.height = height;
                                if(width >= height)
                                    img.attr('width',150);
                                else
                                    img.attr('height',150);
                                img.css('opacity',1);
                                showImageDetails();
                            },100);
                        };

                        dataURLReader.readAsDataURL(file);
                    } else {
                        showImageDetails();
                        $('ol',me.DOM.uploadDialog).append('<li><em>Preview not available on this browser.</em></li>');
                    }
                }
            } catch(err) {
                console_log(err);
            }
        })
    ;


    /* ASSEMBLE DOM */

    this.DOM.clickShield = $('<div id="image-filter-tool-clickshield"></div>').css({
        backgroundColor : 'black',
        opacity : 0.3,
        position : 'absolute',
        top : 0,
        left : 0,
        bottom : 0,
        right : 0
    });
    $('body').append(this.DOM.clickShield);

    this.DOM.progressDialog = $('<div id="image-filter-tool-progress"><div class="ajax-loader"></div><span>Please wait...</span></div>');
    $('body').append(this.DOM.progressDialog);

    this.DOM.container
        .append(this.DOM.titleBar
                    .append(this.DOM.closeButton))
        .append(this.DOM.galleryPanel)
        .append(this.DOM.canvasPanel)
        .append(this.DOM.sidePanel
            .append(this.DOM.originalPanel)
            .append(this.DOM.thumbnailPanel)
            )
        .append(this.DOM.filtersPanel)
        .append(this.DOM.uploadDialog);

    $('body').append(this.DOM.container);


    /* INITIALIZE COMPONENTS */
    this._buildFilterSummary();
    this._buildGallery();
    this._buildCanvas();
    this._buildZoomSlider();
    this._centerWindow();


    //re-center tool when browser window is resized
    this.resizeDelay = null;
    $(window).bind('resize', function() {
        if(me.resizeDelay)
            clearTimeout(me.resizeDelay);
        me.resizeDelay = setTimeout(function(){
            me._centerWindow.apply(me);
        },250);
    });


    this._loadImage(me.options.nodeRef||me.options.node,function(){
        //background doesn't render when browser is first opened
        setTimeout(function(){
            me._setCanvasBackground.apply(me,[me.options.background]);
        },500);
    });


    //bind key handler
    this.keyHandler = function(event){
        //ESC to close the IFT
        if (event.keyCode == 27)
            $('a',me.DOM.closeButton).click();

        //CMD-A selects all in gallery
        if(event.keyCode == 65 && event.metaKey) {
            event.preventDefault();
            event.stopPropagation();
            $('ol > li',me.DOM.galleryPanel).addClass('selected');
            me._refreshFilterSummary.apply(me);
        }

        //arrow key panning, 1px by default, 10px if holding shift key
        switch(event.keyCode) {
            case 38:
                me.pan.y += 1 * (event.shiftKey ? 10 : 1);
                me._renderCanvas.apply(me);
            break;
            case 40:
                me.pan.y -=  1 * (event.shiftKey ? 10 : 1);
                me._renderCanvas.apply(me);
            break;
            case 37:
                me.pan.x += 1 * (event.shiftKey ? 10 : 1);
                me._renderCanvas.apply(me);
            break;
            case 39:
                me.pan.x -= 1 * (event.shiftKey ? 10 : 1);
                me._renderCanvas.apply(me);
            break;
            default:
            break;
        }

        if(event.keyCode >= 37 && event.keyCode <= 40 && event.shiftKey)
            event.preventDefault();
    };
    $(document).bind('keydown',this.keyHandler);

    //prevent I-beam cursor while dragging in Chrome
    document.onselectstart = function() { return false; };
};

ImageFilterTool.prototype = {

    _openUploadDialog : function(mode,title,img) {
        this.uploadProperties.value = title;
        this.DOM.uploadDialog.removeClass('add replace');
        $('.help',this.DOM.uploadDialog).hide();
        $('img',this.DOM.uploadDialog).remove();
        $('.file-drop > span',this.DOM.uploadDialog).show();
        $('ol',this.DOM.uploadDialog).empty().hide();
        if(mode == 'replace') {
            this.DOM.uploadDialog.addClass('replace');
            $('.title-bar > span',this.DOM.uploadDialog).text('replace thumbnail - '+title);
            $('.help.replace',this.DOM.uploadDialog).show();
        } else if(mode == 'add') {
            this.DOM.uploadDialog.addClass('add');
            $('.title-bar > span',this.DOM.uploadDialog).text('add new thumbnail');
            $('.help.add',this.DOM.uploadDialog).show();
        }
        this.DOM.uploadDialog.show();
        this._centerWindow();
    },

    _closeUploadDialog : function() {
        this.uploadProperties = {};
        this.DOM.uploadDialog.fadeOut();
    },

    _processUploadDialog : function() {
        var me = this;
        var nodeRef = this.srcImage.element+":"+this.srcImage.slug;
        var img = $('.file-drop img',this.DOM.uploadDialog);
        var filename = this.uploadProperties.fileName;

        if(typeof this.uploadProperties.fileName == 'undefined') {
            alert('Please drag an image on to the "DROP FILE" area, then click "OK".');
            return;
        }

        if (this.DOM.uploadDialog.hasClass('add')) {
            var width = parseInt(this.uploadProperties.width);
            var height = parseInt(this.uploadProperties.height);

            var success = function(json) {
                me.srcImage.thumbnails.push(json);
                me._buildThumbnails();
            };

            this._addThumbnail(nodeRef,width+'x'+height,img.attr('src'),filename,success);
        }
        else {
            var replaceVal = this.uploadProperties.value;

            var success = function(json) {
                $.each(me.srcImage.thumbnails, function(i,t) {
                    if (t && t.value == replaceVal) {
                        me.srcImage.thumbnails.splice(i,1,json);
                        me._buildThumbnails();
                    }
                });
            };
            this._replaceThumbnail(nodeRef,replaceVal,img.attr('src'),filename,success);
        }
        this.DOM.uploadDialog.fadeOut();
    },

    _addThumbnail : function(nodeRef,thumbnailValue,srcFile,filename,successCallback) {
        var me = this;
        var hasImage = false;
        if (srcFile instanceof Array) {
            $.each(srcFile, function(i,filter) {
                if (filter.image) {
                    hasImage = true;
                }
            });
        }
        else if (me.uploadProperties.file) {
            hasImage = true;
        }
        var supportsFileReader = (typeof FileReader !== 'undefined' && typeof FileReader.prototype.readAsDataURL === 'function');

        if ((hasImage && supportsFileReader) || !hasImage) {
            var params;
            if (srcFile instanceof Array)
                params = {};
            else {
                params = {
                    extension : filename.slice(filename.lastIndexOf('.')+1).toLowerCase()
                }
            }
            me.asyncQueue.push(function(ondone){
                MediaService.addThumbnail(nodeRef,thumbnailValue,srcFile,{
                    params : params,
                    success : successCallback,
                    error : function() {}, //default alert error message
                    complete : function(){ ondone(); }
                });
            });
        }
        else {
            var formData = {
                nodeRef : nodeRef,
                thumbnailValue : thumbnailValue
            };

            var files = [];
            if (srcFile instanceof Array) {
                $.each(srcFile, function(i,filter) {
                    if (filter['image']) {
                        files.push(filter['image'].file);
                    }
                });

                formData['srcFile'] = JSON.stringify(srcFile);
            }
            else {
                files.push(me.uploadProperties.file);

                formData['File'] = filename;
                formData['Type'] = me.uploadProperties.type;
                formData['extension'] = filename.slice(filename.lastIndexOf('.')+1).toLowerCase()
            }

            me.asyncQueue.push(function(ondone){
                var container = $('body');
                var form = $('<form action="/api/media/add-thumbnail.json/" method="POST" enctype="multipart/form-data"><input type="file" name="file"/></form>');
                container.append(form);
                form.fileUpload({
                    namespace : 'file_upload',
                    sequentialUploads : false,
                    formData : formData,
                    onLoad : function(event, files, index, xhr, handler) {
                        var json;
                        try {
                            json = $.parseJSON(xhr.responseText);
                            if(json.Errors && json.Errors.length > 0) {
                                alert(json.Errors[0].Message);
                            }
                            else if(!json.Errors) {
                                NodeObjectCache.remove(nodeRef);
                                successCallback(json);
                            }
                        }
                        catch (e) {
                            alert(e);
                        }
                    },
                    onLoadAll : function(){ form.fileUpload('destroy'); form.remove(); ondone(); }
                });
                form.fileUpload('upload', files);
            });
        }
    },

    _replaceThumbnail : function(nodeRef, thumbnailValue, srcFile, filename, successCallback) {
        var me = this;
        var hasImage = false;
        if (srcFile instanceof Array) {
            $.each(srcFile, function(i,filter) {
                if (filter.image) {
                    hasImage = true;
                }
            });
        }
        else if (me.uploadProperties.file) {
            hasImage = true;
        }
        var supportsFileReader = (typeof FileReader !== 'undefined' && typeof FileReader.prototype.readAsDataURL === 'function');

        if ((hasImage && supportsFileReader) || !hasImage) {
            var params;
            if (srcFile instanceof Array)
                params = {};
            else {
                params = {
                    extension : filename.slice(filename.lastIndexOf('.')+1).toLowerCase()
                }
            }
            me.asyncQueue.push(function(ondone){
                MediaService.replaceThumbnail(nodeRef,thumbnailValue,srcFile,{
                    params : params,
                    success : successCallback,
                    error : function(){},
                    complete : function(){ ondone(); }
                });
            });
        }
        else {
            var formData = {
                nodeRef : nodeRef,
                thumbnailValue : thumbnailValue
            };

            if (! srcFile instanceof Array) {
                formData['extension'] = filename.slice(filename.lastIndexOf('.')+1).toLowerCase();
            }

            me.asyncQueue.push(function(ondone){
                var files = [];
                if (srcFile instanceof Array) {
                    $.each(srcFile, function(i,filter) {
                        if (filter['image']) {
                            files.push(filter['image'].file);
                        }
                    });

                    formData['srcFile'] = JSON.stringify(srcFile);
                }
                else {
                    files.push(me.uploadProperties.file);

                    formData['File'] = filename;
                    formData['Type'] = me.uploadProperties.type;
                    formData['extension'] = filename.slice(filename.lastIndexOf('.')+1).toLowerCase();
                }

                var container = $('body');
                var form = $('<form action="/api/media/replace-thumbnail.json/" method="POST" enctype="multipart/form-data"><input type="file" name="file"/></form>');
                container.append(form);
                form.fileUpload({
                    namespace : 'file_upload',
                    sequentialUploads : true,
                    formData : formData,
                    onLoad : function(event, files, index, xhr, handler) {
                        var json;
                        try {
                            json = $.parseJSON(xhr.responseText);
                            if(json.Errors && json.Errors.length > 0) {
                                alert(json.Errors[0].Message);
                            }
                            else if(!json.Errors) {
                                NodeObjectCache.remove(nodeRef);
                                successCallback(json);
                            }
                        }
                        catch (e) {
                            alert(e);
                        }
                    },
                    onLoadAll : function(){ form.fileUpload('destroy'); form.remove(); ondone(); }
                });
                form.fileUpload('upload', files);
            });
        }
    },

    _close : function() {
        var me = this;
        $(document).unbind('keydown',this.keyHandler);
        this.DOM.container.remove();
        this.DOM.clickShield.remove();
        delete me;
    },

    _toggleHashMarks : function() {
        //create property on-demand
        if(!this.hashMarks)
            this.hashMarks = true;
        else
            this.hashMarks = false;

        this._renderCanvas();
    },

    _buildFilterSummary : function() {

        var me = this;

        var panel = $('<div class="filter-options summary" style="display:none;"></div>');

        var ul = $('<ul></ul>');

        ul.append('<li><label>Replace:</label><select></select></li>');
        ul.append('<li><div class="separator"></div></li>');
        ul.append('<li><label>Add New Thumbnail Label:</label><input type="text"/></li>');
        ul.append('<li><div class="separator"></div></li>');
        ul.append('<li><label>Apply to <strong><em>0</em></strong> Gallery Selections:</label><input type="checkbox"/></li>');
        ul.append('<li><div class="separator"></div></li>');
        ul.append('<li><label>Output Type:</label><select><option value="jpg">JPG</option><option value="png">PNG</option><option value="gif">GIF</option></select></li>');
        ul.append('<li><label>Output Quality:</label><select><option value="10">10</option><option value="9">9</option><option value="8">8</option><option value="7">7</option><option value="6">6</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></li>');
        ul.append('<li><label>Use Alpha:</label><input type="checkbox"/></li>');
        ul.append('<li><div class="separator"></div></li>');
        ul.append('<li><label>Batch Process:</label><input type="checkbox" disabled/><em class="note">*Selecting this option submits a batch job and will be completed as server resources permit. No notification will be sent upon completion.</em></li>');
        ul.append('<li><div class="separator"></div></li>');
        ul.append('<li><a class="button" href="#"><div class="icon save-icon"></div>Apply &amp; Save</a></li>');

        ul.append('<div style="clear:both;"></div>');
        $('.tabs',this.DOM.filtersPanel).after(panel.append(ul));

        this.DOM.filterSummary = {
            replaceSelect : $('li:eq(0) select',ul),
            addNewInput : $('li:eq(2) input',ul),
            applyToGalleryCheckbox : $('li:eq(4) input',ul),
            outputTypeSelect : $('li:eq(6) select',ul),
            outputQualitySelect : $('li:eq(7) select',ul),
            useAlphaCheckbox : $('li:eq(8) input',ul),
            batchProcessCheckbox : $('li:eq(10) input',ul),
            applySaveButton : $('li:eq(12) a',ul)
        };

        this.DOM.filterSummary.addNewInput.blur(function(event){
            var t = $(this);
            t.val(SlugUtils.createSlug(t.val(),false));
        });

        this.DOM.filterSummary.applySaveButton.click(function(event){
            event.preventDefault();

            var proceed = true;

            var replaceVal = (me.DOM.filterSummary.replaceSelect.val() ? me.DOM.filterSummary.replaceSelect.val().trim() : '');
            var addNewVal = me.DOM.filterSummary.addNewInput.val().trim();

            if((replaceVal.length == 0 && addNewVal.length == 0) || (replaceVal.length > 0 && addNewVal.length > 0)) {
                alert("Please select an existing thumbnail to replace OR specify a new thumbnail label.");
                return;
            }

            var applyToGallery = me.DOM.filterSummary.applyToGalleryCheckbox.is(':checked');
            var galleryCnt = $('ol > li.selected',me.DOM.galleryPanel).length;

            if(proceed && applyToGallery) {
                proceed = confirm('The specified filters will be applied to '+galleryCnt+' gallery selection(s). Proceed?');
            }

            var batchProcess = me.DOM.filterSummary.batchProcessCheckbox.is(':checked');
            if(proceed && batchProcess) {
                proceed = confirm('The image(s) will be processed asynchronously as server resources permit. There will be NO notification upon completion. Proceed?');
            }

            if(proceed) {
                proceed = confirm('Apply filters and save? This action cannot be undone.');
            }

            if(proceed) {
                var nodeRefs = [];

                if(applyToGallery) {
                    me.DOM.galleryPanel.find('li.selected').each(function(i,e){
                        nodeRefs.push($(e).data('nodeRef'));
                    });
                } else {
                    nodeRefs.push(me.srcImage.element+":"+me.srcImage.slug);
                }

                var filterOptions = [];

                $.each(me.filters,function(i,filter){
                    filterOptions.push(filter.getOptions());
                });


                //move click shield up to cover image filter tool
                me.DOM.clickShield.css('zIndex',20000);
                me.DOM.progressDialog.show();

                if(replaceVal.length > 0) {
                    $.each(nodeRefs,function(i,nr){
                        var success = function(json){
                            $.each(me.srcImage.thumbnails, function(i,t) {
                                if (t.value == replaceVal && me.srcImage.element+':'+me.srcImage.slug == nr) {
                                    me.srcImage.thumbnails.splice(i,1,json);
                                    me._buildThumbnails();
                                }
                            });
                        };

                        me._replaceThumbnail(nr,replaceVal,filterOptions,null,success);
                    });
                } else {
                    $.each(nodeRefs,function(i,nr){
                        var success = function(json){
                            if (me.srcImage.element+':'+me.srcImage.slug == nr) {
                                me.srcImage.thumbnails.push(json);
                                me._buildThumbnails();
                            }
                        };

                        me._addThumbnail(nr,addNewVal,filterOptions,null,success)
                    });
                }

                me.asyncQueue.push(function(ondone){
                    me.DOM.clickShield.css('zIndex',10000);
                    me.DOM.progressDialog.hide();
                    ondone();
                });
            }
        });

        this._refreshFilterSummary();
    },

    _refreshFilterSummary : function() {

        //refresh gallery selections
        var cnt = $('ol > li.selected',this.DOM.galleryPanel).length;
        $('.filter-options.summary li:eq(4) > label > strong > em',this.DOM.filtersPanel).text(cnt);
        $('.filter-options.summary li:eq(4) > *',this.DOM.filtersPanel).attr('disabled',cnt == 0 ? true : null);

        //refresh thumbnail sizes
        var replaceSelect = $('.filter-options.summary li:eq(0) > select',this.DOM.filtersPanel).empty();
        replaceSelect.append('<option value=""></option>');

        $('ol > li',this.DOM.thumbnailPanel).each(function(i,li){
            var value = $(li).data('value');
            if(value != null) //exclude 'Add Thumbnail' li
                replaceSelect.append('<option value="'+value+'">'+value+'</option>');
        });
    },

    _centerWindow : function() {
        var wcx = $(window).width();
        var wcy = $(window).height();
        this.DOM.container.css({
            top : (wcy / 2) - (this.DOM.container.height() / 2),
            left : (wcx / 2) - (this.DOM.container.width() / 2)
        });
        this.DOM.progressDialog.css({
            top : (wcy / 2) - (this.DOM.progressDialog.height() / 2),
            left : (wcx / 2) - (this.DOM.progressDialog.width() / 2)
        });
        wcx = this.DOM.container.width();
        wcy = this.DOM.container.height();
        this.DOM.uploadDialog.css({
            top : (wcy / 2) - (this.DOM.uploadDialog.height() / 2),
            left : (wcx / 2) - (this.DOM.uploadDialog.width() / 2)
        });
    },

    _buildOriginal : function(callback) {
        var me = this;

        if(typeof this.srcImage != 'object' || this.srcImage == null)
            return;

        var img = $('<img style="display:none;" />')
            .load(function() {
                me.DOM.canvasLoader.hide();
                //inital zoom level
                me._zoomToFit();

                if(typeof callback == 'function')
                    callback.apply(me);
            })
            .show();
        img.attr('src', this.srcImage.url);
        img.attr('title', this.srcImage.url);
        $('img',this.DOM.originalPanel).replaceWith(img);

        if(this.srcImage.height >= this.srcImage.width) {
            img.css('height','70px');
            img.css('width','auto');
        } else {
            img.css('height','auto');
            img.css('width','70px');
        }

        $('ul',this.DOM.originalPanel)
            .empty()
            .append('<li><strong>'+this.srcImage.width+'</strong> &times; <strong>'+this.srcImage.height+'</strong></li>')
            .append('<li>'+humanFilesize(this.srcImage.size,2)+'</li>');
    },

    _buildThumbnails : function() {

        var me = this;

        if(typeof this.srcImage != 'object' || this.srcImage == null)
            return;

        var ol = $('ol',this.DOM.thumbnailPanel);

        ol.empty();

        var replaceSelect = $('.filter-options.summary li:eq(0) > select',this.DOM.filtersPanel).empty();
        replaceSelect.append('<option value=""></option>');

        var rand = new Date().getTime();
        if(this.srcImage.thumbnails) {

            var nodeRef = this.srcImage.element+":"+this.srcImage.slug;

            $.each(this.srcImage.thumbnails,function(i,img){
                replaceSelect.append('<option value="'+img.value+'">'+img.value+'</option>');

                var size = (img.height >= img.width ? 'height="68"' : 'width="68"');
                var li = $('<li><img '+size+' src="'+img.url+'?'+rand+'" title="'+img.url+'"/></li>');
                var ul = $('<ul></ul>');

                ul.append('<li><span class="size">'+img.value+'</span></li>');
                ul.append('<li><strong>'+img.width+'</strong> &times; <strong>'+img.height+'</strong></li>');
                ul.append('<li>'+humanFilesize(img.size,2)+'</li>');
                ul.append($('<li class="buttons"></li>')
                        .append($('<a class="button no-text" href="#"><div class="icon turn-left-icon"></div></a>').click(function(event){
                            event.preventDefault();
                            me._openUploadDialog.apply(me,['replace',img.value]);
                        }))
                        .append($('<a class="button no-text" href="#"><div class="icon cross-icon"></div></a>').click(function(event){
                            event.preventDefault();
                            if(confirm('Permanently remove this thumbnail?')){
                                MediaService.removeThumbnail(nodeRef,img.value,{
                                    success : function(){
                                        $.each(me.srcImage.thumbnails, function(i,t) {
                                            if (t.value == img.value) {
                                                me.srcImage.thumbnails.splice(i,1);
                                                return false;
                                            }
                                        });
                                        li.slideUp(500,function(){
                                            li.remove();
                                            me._refreshFilterSummary.apply(me);
                                        });
                                    },
                                    error : function() {} //default alert error message
                                });
                            }
                        }))
                    );

                li.append(ul).append('<div style="clear:both;"></div>');
                li.data('value',img.value);
                li.data('width',img.width);
                li.data('height',img.height);
                ol.append(li);
            });
        }

        //todo: add drop upload handler
        //not sure if we want to add arbitrary thumbnails
        ol.append($('<li class="buttons"></li>').append($('<div class="buttons"></div>')
                .append($('<a href="#" class="button"><div class="icon plus-icon"></div>add thumbnail</a>')
                    .click(function(event){
                        event.preventDefault();
                        me._openUploadDialog.apply(me,['add']);
                    })
                )));

    },

    _buildGallery : function(imgs) {

        var me = this;

        var loadGallery = function(images) {
            var ol = $('ol',me.DOM.galleryPanel);
            ol.empty();

            $.each(images,function(i,img){
                var li = $('<li class="gallery-item" title="'+img.title+'"><img height="68" src="'+img.thumbnailUrl+'"/></li>')
                    .click(function(event){
                        event.preventDefault();

                        if(event.metaKey) {
                            li.toggleClass('selected');
                        } else {
                            $('li',ol).not(li).removeClass('selected');
                            li.toggleClass('selected');
                        }

                        me._refreshFilterSummary.apply(me);
                    });
                ol.append(li);

                li.data('nodeRef',img.element+':'+img.slug);

                li.draggable({
                    appendTo : 'body',
                    revert : false,
                    helper : 'clone',
                    containment : 'window',
                    zIndex : 1000000
                });
            });
            ol.append('<div style="clear:both;"></div>');

            if(images.length > 0) {

                var galleryTimer = null;
                var width = 0;
                // 26 px padding for LI, 2px border for IMG
                $.each(images,function(i,img){
                    width += (26 + 2 + ((parseInt(img.width) / parseInt(img.height)) * 68));
                });
                width += 10; //add buffer b/c thumbnail size isn't exactly same as full size
                ol.css('width',width+'px');
            } else {

                me.DOM.container.css('height','702px');
                me.DOM.canvasPanel.css('top','22px');
                me.DOM.sidePanel.css('top','22px');
            }
        };

        if(imgs == null) {
            if(this.options.gallery == null) {
                loadGallery([]);
            } else if(this.options.gallery instanceof Array) {
                loadGallery(this.options.gallery);
            } else if(typeof this.options.gallery == 'string') {
                $.ajax({
                    type : 'GET',
                    dataType : 'json',
                    url : '/api/media/find-all.json/',
                    data : {
                        'Elements.in' : '@images',
                        'InTags.exist' : this.options.gallery,
                        'MaxRows' : '1000' //todo: handle pageless paging
                    },
                    success : function(json) {
                        loadGallery(json.nodes);
                    }
                    //todo: handle error
                });
            }
        }


    },

    _buildZoomSlider : function() {
        var me = this;

        //center zoom slider
        this.DOM.canvasZoomSlider.css('left',this.DOM.canvasPanel.width() / 2 - this.DOM.canvasZoomSlider.width() / 2);

        this.DOM.canvasZoomSlider.slider({
            slide : function(event, ui) {

                //the zoom scale is from 50%(0.5) to 400%(4.0)
                var scale = me.options.minZoom / 100.0;
                if(ui.value > 0)
                    scale = ((me.options.maxZoom-me.options.minZoom) / 100.0) * (ui.value / 100.0) + (me.options.minZoom / 100.0);

                //snap to 100%
                var pct = Math.round(scale*100.0);
                if(pct >= 95 && pct <= 105) {
                    scale = 1.0;
                    pct = 100;
                }

                me.zoom = scale;

                me._renderCanvas.apply(me);

                //only show zoom label when zooming
                me.DOM.canvasZoomLabel.fadeIn('fast').text(pct+'%');
            },
            stop : function(event, ui) {
                me._renderCanvas.apply(me);
                me.DOM.canvasZoomLabel.fadeOut();
            },
            animate : true
        });
    },

    _buildCanvas : function() {
        var me = this;

        this.canvasFillStyle = "rgb(0,0,0)";

        this.cw = this.DOM.canvasPanel.width();
        this.ch = this.DOM.canvasPanel.height();

        //resize canvas to fill canvas panel size
        this.DOM.canvas.attr('width',this.cw).attr('height',this.ch);

        //set canvas control defaults
        this.zoom = 1.0;
        this.pan = { x:0, y:0 };
        this.mouse = { x:0, y:0, down:false };

        this.DOM.canvas
            .mousedown(function(event){
                me.mouse.down = {
                    x : event.clientX,
                    y : event.clientY
                };
                me.mouse.x = 0;
                me.mouse.y = 0;
                me._renderCanvas.apply(me);
            })
            .mousemove(function(event){
                if(me.mouse.down) {
                    me.mouse.x = event.clientX - me.mouse.down.x;
                    me.mouse.y = event.clientY - me.mouse.down.y;
                    me._renderCanvas.apply(me);
                }
            });

        //if the mouse is down when it leaves the canvas, the mouseup event never fires
        $(window)
            .mouseup(function(event){
                if(me.mouse.down) {
                    me.mouse.down = false;

                    //map pixel-space coords (this.mouse) to zoom-space coords b/c this.pan is always applied in zoom-space
                    me.pan.x += me.mouse.x*(1.0/me.zoom);
                    me.pan.y += me.mouse.y*(1.0/me.zoom);

                    me.mouse.x = 0;
                    me.mouse.y = 0;

                    $(me).trigger('mouseUp');
                    me._renderCanvas.apply(me);
                }
            });

    },

    _getColorAt : function(x,y) {
        var c = this.context;
        var img = c.getImageData(0,0,this.cw,this.ch);
        var offset = x * 4 + y * 4 * this.cw;
        return img.data[offset] + ',' + img.data[offset+1] + ',' + img.data[offset+2] + ',' + img.data[offset+3];
    },

    _loadImage : function(nodeRef,callback) {

        var me = this;

        var success = function(json) {

            $('span',me.DOM.titleBar).text('image filter tool - '+json.title);

            me.srcImage = json;

            me._buildOriginal();
            me._buildThumbnails();

            me.srcImageData = $('img',me.DOM.originalPanel)[0];

            me.renderedImage = {
                data : me.srcImageData,
                width : me.srcImage.width,
                height : me.srcImage.height
            };

            $(me).trigger('loadImage');

        };

        me.DOM.canvasLoader.show();

        if(typeof nodeRef == 'string') {
            //nodeRef = nodeRef.match(/(.*):(.*)/);

            MediaService.get(
                nodeRef,
                {
                    retrieveThumbnails : true,
                    success : success
                }
            );
        } else if(typeof nodeRef == 'object' && nodeRef != null) {
            success(nodeRef);
        }
    },

    _zoomToFit : function() {
        if(!this.renderedImage)
            return;

        this._renderCanvas();

        var canvasRatio = this.cw / this.ch;
        var imageRatio = this.renderedImage.width / this.renderedImage.height;

        if(canvasRatio > imageRatio) {
            this.zoom = this.ch / this.renderedImage.height;
        } else {
            this.zoom = this.cw / this.renderedImage.width;
        }
        this.DOM.canvasZoomSlider.slider('value',
            Math.round((this.zoom-(this.options.minZoom / 100.0))/((this.options.maxZoom-this.options.minZoom) / 100.0)*100.0));

        this.pan.x = 0;
        this.pan.y = 0;

        this._renderCanvas();
    },

    _zoomTo : function(pct) {

        if(typeof pct != 'number')
            return;

        if(pct < this.options.minZoom)
            pct = this.options.minZoom;

        if(pct > this.options.maxZoom)
            pct = this.options.maxZoom;

        this.zoom = pct / 100.0;

        this.DOM.canvasZoomSlider.slider('value',
            Math.round((this.zoom-(this.options.minZoom / 100.0))/((this.options.maxZoom-this.options.minZoom) / 100.0)*100.0));

        this._renderCanvas();
    },

    _createCheckerboardPattern : function() {
        var ps = this.options.patternSize;
        this.checkerboardCanvas = $('<canvas width="'+ps+'" height="'+ps+'"></canvas>')[0];
        this.checkerboardImageData = this.checkerboardCanvas.getContext('2d').createImageData(ps,ps);

        var x,y;

        //fill with grey
        for(x = 0; x < ps; x++)
            for(y = 0; y < ps; y++) {
                this.checkerboardImageData.data[x*4+y*4*ps] = 228;
                this.checkerboardImageData.data[x*4+y*4*ps+1] = 228;
                this.checkerboardImageData.data[x*4+y*4*ps+2] = 228;
                this.checkerboardImageData.data[x*4+y*4*ps+3] = 255;
            }

        //fill top left square with white
        for(x = 0; x < ps/2; x++)
            for(y = 0; y < ps/2; y++) {
                this.checkerboardImageData.data[x*4+y*4*ps] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+1] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+2] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+3] = 255;
            }

        //fill bottom right square with white
        for(x = ps/2; x < ps; x++)
            for(y = ps/2; y < ps; y++) {
                this.checkerboardImageData.data[x*4+y*4*ps] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+1] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+2] = 255;
                this.checkerboardImageData.data[x*4+y*4*ps+3] = 255;
            }

        this.checkerboardCanvas.getContext('2d').putImageData(this.checkerboardImageData,0,0);
        return this.context.createPattern(this.checkerboardCanvas,'repeat');
    },

    _setCanvasBackground : function(bg) {
        if(bg == 'black') {
            this.canvasFillStyle = "rgb(0,0,0)";
        } else if(bg == 'white') {
            this.canvasFillStyle = "rgb(255,255,255)";
        } else if(bg == 'grey' || bg == 'gray') {
            this.canvasFillStyle = "rgb(128,128,128)";
        } else if(bg == 'checkerboard') {

            if(!this.checkerboardPattern) {
                this.checkerboardPattern = this._createCheckerboardPattern();
            }

            this.canvasFillStyle = this.checkerboardPattern;
        }

        this._renderCanvas();
    },

    _renderCanvas : function() {
        var me = this;

        var c = this.context;

        // FILL CANVAS WITH BACKGROUND COLOR/PATTERN
        c.save();
        c.fillStyle = this.canvasFillStyle;
        c.fillRect(0,0,this.cw,this.ch);
        c.restore();

        if(this.srcImage == null)
            return;

        // TRANSLATE, SCALE, AND RENDER IMAGE
        c.save();

        //translate image from origin by current mouse position (when dragging)
        c.translate((this.cw/2)+this.mouse.x,(this.ch/2)+this.mouse.y);

        //apply zoom level
        c.scale(this.zoom,this.zoom);

        //offset image so zoom origin is the center of canvas
        c.translate(this.pan.x,this.pan.y);


        var image = {
            data : this.srcImageData,
            width : this.srcImage.width,
            height : this.srcImage.height
        };

        $.each(this.filters,function(i,filter){
            image = filter.renderPreview(c,image,me.zoom);
        });

        this.renderedImage = image;

        //render image in center of canvas
        c.drawImage(image.data,(image.width)/2*-1,(image.height)/2*-1);

        if(this.hashMarks) {
            c.lineWidth = 1;

            if(typeof this.canvasFillStyle == 'object' || this.canvasFillStyle == 'rgb(255,255,255)')
                c.strokeStyle = "rgba(0,0,0,1)";
            else
                c.strokeStyle = "rgba(255,255,255,1)";

            //TOP LEFT
            c.beginPath();
            c.moveTo((image.width)/2*-1,(image.height)/2*-1 - 50);
            c.lineTo((image.width)/2*-1,(image.height)/2*-1 - 10);
            c.stroke();
            c.beginPath();
            c.moveTo((image.width)/2*-1 - 50,(image.height)/2*-1);
            c.lineTo((image.width)/2*-1 - 10,(image.height)/2*-1);
            c.stroke();

            //TOP RIGHT
            c.beginPath();
            c.moveTo((image.width)/2,(image.height)/2*-1 - 50);
            c.lineTo((image.width)/2,(image.height)/2*-1 - 10);
            c.stroke();
            c.beginPath();
            c.moveTo((image.width)/2 + 50,(image.height)/2*-1);
            c.lineTo((image.width)/2 + 10,(image.height)/2*-1);
            c.stroke();

            //BOTTOM LEFT
            c.beginPath();
            c.moveTo((image.width)/2*-1,(image.height)/2 + 50);
            c.lineTo((image.width)/2*-1,(image.height)/2 + 10);
            c.stroke();
            c.beginPath();
            c.moveTo((image.width)/2*-1 - 50,(image.height)/2);
            c.lineTo((image.width)/2*-1 - 10,(image.height)/2);
            c.stroke();

            //BOTTOM RIGHT
            c.beginPath();
            c.moveTo((image.width)/2,(image.height)/2 + 50);
            c.lineTo((image.width)/2,(image.height)/2 + 10);
            c.stroke();
            c.beginPath();
            c.moveTo((image.width)/2 + 50,(image.height)/2);
            c.lineTo((image.width)/2 + 10,(image.height)/2);
            c.stroke();

            //TOP CENTER
            c.beginPath();
            c.moveTo(0,(image.height)/2*-1 - 50);
            c.lineTo(0,(image.height)/2*-1 - 10);
            c.stroke();

            //BOTTOM CENTER
            c.beginPath();
            c.moveTo(0,(image.height)/2 + 50);
            c.lineTo(0,(image.height)/2 + 10);
            c.stroke();

            //LEFT CENTER
            c.beginPath();
            c.moveTo((image.width)/2*-1 - 50,0);
            c.lineTo((image.width)/2*-1 - 10,0);
            c.stroke();

            //RIGHT CENTER
            c.beginPath();
            c.moveTo((image.width)/2 + 50,0);
            c.lineTo((image.width)/2 + 10,0);
            c.stroke();

            //c.strokeRect((image.width)/2*-1,(image.height)/2*-1,image.width,image.height);
        }

        c.restore();


        $.each(this.filters,function(i,filter){
            filter.renderOverlay(me.DOM.canvas,me.cw,me.ch,me.renderedImage,me.zoom,me.pan);
        });

        //render current image size in top,left corner
        c.save();
        c.font = "bold 9px 'Lucida Grande'";
        c.textBaseline = "top";
        var txt = Math.round(this.renderedImage.width) + ' '+String.fromCharCode(0xD7)+' '+Math.round(this.renderedImage.height);
        if(typeof this.canvasFillStyle == 'object' || this.canvasFillStyle == 'rgb(255,255,255)') {
            c.fillStyle = "black";
            c.shadowColor = "white";
        } else {
            c.fillStyle = "white";
            c.shadowColor = "black";
        }
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 1;
        c.shadowBlur = 3;
        c.fillText(txt,5,5);
        c.restore();

    },

    _addFilter : function(type,cls) {
        var me = this;

        var filter = eval('new '+cls+'()');

        $(filter).bind('refresh',function(){me._renderCanvas.apply(me);});
        $(filter).bind('refreshFit',function(){me._zoomToFit.apply(me);});
        $(filter).bind('getColorAt',function(bindevt,callback){
            if(typeof callback == 'function') {
                me.DOM.canvas.css('cursor','crosshair').one('click',function(clickevt){
                    callback(me._getColorAt(clickevt.layerX,clickevt.layerY));
                    me.DOM.canvas.css('cursor','move');
                });
            }
        });

        this.filters.push(filter);

        var index = this.filters.length - 1;
        var dom = filter.buildOptions(this.renderedImage,this);

        var ol = $('.tabs > ol',this.DOM.filtersPanel);

        //this re-numbers the tab labels and re-indexes internal filter object array
        var renumberTabs = function(){
            var newFilters = [];
            $('.tabs > ol > li.tab',me.DOM.filtersPanel).each(function(i,li){
                var tab = $(li);
                newFilters.push(me.filters[$('a',tab).data('index')]);
                $('a > span',tab).text(i+1);
                $('a',tab).data('index',i);
            });
            me.filters = newFilters;
        };

        $('.empty',this.DOM.filtersPanel).hide();
        $('.tabs > ol > li',this.DOM.filtersPanel).removeClass('active');
        $('.tabs > ol > li.save',this.DOM.filtersPanel).before($('<li class="active tab"></li>').append(
                $('<a href="#" title="Remove Filter" class="remove">&times;</a>').data('index',index).click(function(event){
                    event.preventDefault();
                    if(confirm('Remove this filter?')) {
                        if (typeof filter.onRemove === 'function')
                            filter.onRemove();
                        dom.remove();
                        $(this).parent().remove();

                        renumberTabs();

                        //show first filter
                        if(me.filters.length > 0) {
                            $('.tabs > ol > li.tab',me.DOM.filtersPanel).removeClass('active');
                            $('.tabs > ol > li:eq(0)',me.DOM.filtersPanel).addClass('active');
                            $('.filter-options',me.DOM.filtersPanel).hide();
                            $('.filter-options:eq(0)',me.DOM.filtersPanel).show();
                        } else {
                            //show the empty panel
                            $('.tabs > ol > li.save',me.DOM.filtersPanel).hide();
                            $('.filter-options.summary',me.DOM.filtersPanel).hide();
                            $('.filter-options.empty',me.DOM.filtersPanel).show();
                            ol.sortable('disable');
                        }
                        me._renderCanvas.apply(me);
                    }
                })).append(
                $('<a href="#'+filter.UUID+'"><span>'+this.filters.length+'</span>.&nbsp;'+type+'</a>').data('index',index).click(function(event){
                    event.preventDefault();
                    $('.tabs > ol > li',me.DOM.filtersPanel).removeClass('active');
                    $(this).parent().addClass('active');
                    $('.filter-options',me.DOM.filtersPanel).hide();
                    dom.show(); // show my options

                })
                ));
        $('.filter-options',this.DOM.filtersPanel).hide();
        $('.filter-options.summary',this.DOM.filtersPanel).before(dom);

        $(':input:eq(0)',dom).focus().select();

        $('.tabs > ol > li.save',this.DOM.filtersPanel).show();

        if(typeof ol.sortable('option','disabled') != 'boolean') {
            $('.tabs > ol',this.DOM.filtersPanel).sortable({
                axis : 'x',
                revert : false,
                //containment : 'parent',
                items : '> li.tab',
                tolerance : 'pointer',
                update : function(){
                    renumberTabs();
                    me._renderCanvas();
                }
            });
        }
        if(this.filters.length == 1) {
            ol.sortable('enable');
        } else if(this.filters.length > 1) {
            ol.sortable('refresh');
        }

        this._renderCanvas();
    }

};
