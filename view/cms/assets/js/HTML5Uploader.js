var HTML5Uploader = function(widget,container,toolbar,options){

    this.options = $.extend({
        // Functional options
        QuickAddURL : "/api/media/quick-add.json/",
        ArchiveAddURL : "/api/media/upload-archive.json/",
        QuickAddNonce : null,
        QuickAddElement : null,
        DefaultQuickAddElement : null,
        DefaultElement : 'image',
        ElementExtensionMap : {
            'jpg' : 'image',
            'jpeg': 'image',
            'gif' : 'image',
            'png' : 'image',
            'bmp' : 'image',
            'tiff': 'image',
            'cr2' : 'image',
            'psd' : 'image',
            'tif' : 'image',
            'aif' : 'audio',
            'aifc': 'audio',
            'aiff': 'audio',
            'au'  : 'audio',
            'm3u' : 'audio',
            'mid' : 'audio',
            'mp3' : 'audio',
            'ra'  : 'audio',
            'ram' : 'audio',
            'rmi' : 'audio',
            'snd' : 'audio',
            'wav' : 'audio',
            'asf' : 'video',
            'asr' : 'video',
            'asx' : 'video',
            'avi' : 'video',
            'lsf' : 'video',
            'lsx' : 'video',
            'mov' : 'video',
            'movie' : 'video',
            'mpa' : 'video',
            'mpe' : 'video',
            'mpeg' : 'video',
            'mpg' : 'video',
            'mpv2' : 'video',
            'qt' : 'video',
            'mp4' : 'video',
            '*'    : 'document'
        },
        FileMask : null,
        PostParams : null,

        // Display options
        UploadDialogTitle : "Upload Files...",
        ConfirmDialogTitle : "Confirm Upload: ",
        OnComplete : null, // Action to perform when complete (usually adding the media tag)
        OnCompleteAll : null, // Extra things to do on completeAll
        ShowDialog : true, // Use the preview panel, otherwise just set defaults
        ShowUrlPrompt : true // JS prompt for upload from URL, otherwise will use a field
    },options||{});

    this.widget = widget;

    this.DOM = {
        container : container,
        toolbar : toolbar
    };

    this.init();
};

HTML5Uploader.prototype = {
    init : function() {
        var self = this;

        if (!!this.options.ShowUrlPrompt)
            this._buildInlineToolbar();
        else
            this._buildTabularToolbar();

        //BUILD LOCAL FILE UPLOAD CONFIRM DIALOG
        this.DOM.confirmLocalDialog = $('<div class="upload-preview"></div>');

        this.DOM.localFileTable = $('<table id="html5-upload-files-'+this.widget.UUID+'" cellpadding="0" cellspacing="0"></table>');

        this.DOM.paginationPanel = $('<div class="pagination" style="display:none"></div>');
        this.DOM.paginationLabel = $('<span>File <em>1</em> of <em>X</em></span>');
        this.DOM.paginationPrevButton = $('<a href="#">&laquo;</a>')
            .click(function(event){
                event.preventDefault();
                var currPage = self._getCurrentPage.apply(self);
                if (currPage <= 1)
                    return;
                self._setCurrentPage.apply(self,[currPage-1]);
            });
        this.DOM.paginationNextButton = $('<a href="#">&raquo;</a>')
            .click(function(event){
                event.preventDefault();
                setTimeout(function() {
                    var currPage = self._getCurrentPage();
                    var maxPages = $('em:eq(1)',self.DOM.paginationLabel).text();
                    var numPages = $('tr.file',self.DOM.localFileTable).length;
                    if(numPages == 0 || (maxPages == numPages && currPage >= maxPages)) return;
                    self._setCurrentPage(currPage+1);
                },1);
            });
        this.DOM.paginationPanel
            .append(this.DOM.paginationPrevButton)
            .append(this.DOM.paginationLabel)
            .append(this.DOM.paginationNextButton);

        this.DOM.confirmLocalDialog
            .append($('<div></div>')
            .append($('<div class="file-table-wrapper"></div>')
            .append(this.DOM.localFileTable))
            .append(this.DOM.paginationPanel));

        $('#app-main').after(this.DOM.confirmLocalDialog);

        this._buildDialog();
        this._buildFileUploadUI();
    },

    _buildInlineToolbar : function() {
        var self = this;

        this.DOM.container.addClass("html5upload");

        //BUILD NEW DOM FOR QUICK ADD UPLOADS
        var uploadButtonID = 'html5-upload-'+this.widget.UUID;
        this.DOM.uploadFromLocalForm = $('<form id="'+uploadButtonID+'" action="'+this.options.QuickAddURL+'" method="POST" enctype="multipart/form-data"></form>');
        this.DOM.uploadFromLocalForm.append('<input type="file" name="file" multiple>'+
            '<button>Upload</button>'+
            '<div class="file_upload_label">Upload from local</div>'
        );

        this.DOM.uploadFromURLButton = $('<a href="#" class="upload-from-url" title="Upload '+this.options.Label+' from URL">or from URL</a>')
            .css({
                'float': 'left',
                'margin-left': '1em',
                'margin-top' : '0.5em'
            })
            .click(function(event){
                self.quickAddFromURL.apply(self,[event]);
            });

        var localFormWrapper = $('<div style="display: inline; float: left;"></div>')
            .append(this.DOM.uploadFromLocalForm);

        this.DOM.toolbar
            .append(localFormWrapper)
            .append(this.DOM.uploadFromURLButton);

        if (!this.options.ShowDialog) {
            this.DOM.toolbar.append($('<div id="progressbar-'+self.widget.UUID+'" class="file_upload_progress progressbar inline"></div>').progressbar().css({display:'none'}));
        }
    },

    _buildTabularToolbar : function() {
        var self = this;

        var tr = $('<tr></tr>');
        tr.append('<td class="html5upload"></td>')
            .append('<td class="or">OR</td>')
            .append('<td class="label"><label for="media-add-url-input">URL:</label></td>')
            .append('<td><input type="text" id="media-add-url-input"/><a href="#" title="Clear" id="media-add-url-input-clear">Clear</a></td>')
            .append('<td></td>')
            .append($('<td></td>').append($('<a href="#" class="upload" title="Upload">Upload</a>').click(function(event){
            event.preventDefault();
            var url = self.DOM.urlInput.val();
            if ($.trim(url) == '') {
                alert('Please enter a valid URL.');
                self.DOM.urlInput.focus();
            }
            else if (self._isValidURL(url)) {
                self._showURLConfirmPopup(url);
            }
        })));
        this.DOM.container.append($('<table></table>').append(tr));

        var uploadButtonID = 'html5-upload-'+this.widget.UUID;
        this.DOM.uploadFromLocalForm = $('<form id="'+uploadButtonID+'" action="'+this.options.QuickAddURL+'" method="POST" enctype="multipart/form-data"></form>');
        this.DOM.uploadFromLocalForm.append('<input type="file" name="file" multiple>'+
            '<button>Upload</button>'+
            '<div class="file_upload_label">Upload from local</div>');

        var localFormWrapper = $('<div style="display: inline; float: left;"></div>')
            .append(this.DOM.uploadFromLocalForm);

        $('.html5upload', this.DOM.widget).append(localFormWrapper);

        this.DOM.urlInput = $('#media-add-url-input');
        this.DOM.urlInput.inputFocus();

        $('#media-add-url-input-clear').click(function(event){
            event.preventDefault();
            self.DOM.urlInput.val('').focus();
        });
    },

    _buildDialog : function() {
        var self = this;

        this.DOM.confirmLocalDialog.dialog({
            autoOpen : false,
            draggable : false,
            height : 'auto',
            width : 1000,
            modal: true,
            position : 'center',
            resizable : false,
            resize: 'auto',
            zIndex : 100001,
            closeText : '&times;',
            buttons : {
                "Upload File(s)" : function(event) {
                    if(!self.uploadUrl && !self.filetypesValid) return false;

                    if (self.options.ShowDialog) {
                        if(!self._validateTitles(self.DOM.confirmLocalDialog)) return;
                        if(!self._validateElements(self.DOM.confirmLocalDialog)) return;
                    }

                    self.DOM.confirmLocalButton = $(event.target);
                    if(self.DOM.confirmLocalButton.text() == 'Please Wait') return;
                    self.hasErrors = false;
                    self.DOM.confirmLocalButton.text('Please Wait');
                    self._setCurrentPage(1);
                    if (! self.storingTemporary) {
                        $('tr.file',self.DOM.localFileTable).each(function(i,r) {
                            if (self.uploadUrl) {
                                self._quickAddFromUrl();
                            }
                            else {
                                r.startUpload();
                            }
                        });
                    }
                    else {
                        if (self.hasErrors)
                            return false;
                        setTimeout(function() {
                            var firstRow = $('tr.file:eq(0)',self.DOM.localFileTable);
                            var numRows = $('tr.file',self.DOM.localFileTable).length;
                            self._storeTemporary(0,firstRow,numRows);
                        },0);
                    }
                }
            },
            close : function() {
                self.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').find('.file_upload_progress').remove();
                $('tr.file',self.DOM.localFileTable).each(function(i,r) {
                    if (typeof r.cancelUpload === 'function')
                        r.cancelUpload();
                });
                $('tr.file', self.DOM.localFileTable).remove();
                self.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').find('.file_upload_progress').remove();
                self.storingTemporary = false;
                self.uploadUrl = false;
                $(this).unbind('keydown');
            },
            open : function() {
                self.hasErrors = false;

                self.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').prepend(self.DOM.confirmLocalDialog.find('.file_upload_progress'));
                var files = $('tr.file',self.DOM.localFileTable).length;
                self.DOM.paginationLabel.html("File <em>1</em> of <em>"+files+"</em>");
                self._updateTableRows();
                self._positionDialog.apply(self,[$(this)]);
                $(this).bind('keydown', function(e) { e.stopPropagation(); });
            }
        });
    },

    _buildFileUploadUI : function() {
        var self = this;
        var options = {
            uploadTable : this.DOM.localFileTable,
            downloadTable : this.DOM.localFileTable,
            sequentialUploads : true,
            previewMaxWidth : 150,
            previewMaxHeight : 150,
            onChange : function(event) {
                self.filetypesValid = true;
                self.storingTemporary = false;
                var files;
                if (event.target.files && self._isXHRUploadCapable()) {
                    files = event.target.files;
                } else {
                    files = event.target && event.target.files;
                    files = files ? Array.prototype.slice.call(files, 0) : [{name: '', type: null, size: null}];
                }

                if (!!self.options.FileMask) {
                    self.filetypesValid = self._filetypesValid(files);
                    if (!self.filetypesValid)
                        return false;
                }
                if (!self._checkFileTypes(files))
                    return false;
                else if ((self.hasArchive && self.hasImage) || (self.hasArchive && files.length > 1)) {
                    alert('Upload either images or a single archive, combined uploads are not supported.');
                    return false;
                }

                return true;
            },
            onDrop : function(event) {
                self.filetypesValid = true;
                self.storingTemporary = false;
                var files = event.originalEvent.dataTransfer.files;

                if (!!self.options.FileMask) {
                    self.filetypesValid = self._filetypesValid(files);
                    if (!self.filetypesValid)
                        return false;
                }
                if (!self._checkFileTypes(files))
                    return false;
                else if ((self.hasArchive && self.hasImage) || (self.hasArchive && files.length > 1)) {
                    alert('Upload either images or a single archive, combined uploads are not supported.');
                    return false;
                }

                return true;
            },
            loadPreviewImage : function (files, index, handler) {
                index = index || 0;
                handler.uploadRow.find(handler.previewSelector).each(function () {
                    var previewNode = $(this),
                        file = files[index];
                    setTimeout(function () {
                        handler.loadImage(
                            file,
                            function (img) {
                                handler.addNode(
                                    previewNode,
                                    $(img)
                                );
                                if (!previewNode.is(':empty'))
                                    previewNode.removeClass('placeholder');
                            },
                            handler.previewMaxWidth,
                            handler.previewMaxHeight,
                            handler.imageTypes,
                            !handler.previewAsCanvas
                        );
                    }, handler.previewLoadDelay);
                    index += 1;
                });
            },
            initUploadRow : function (event, files, index, xhr, handler) {
                var uploadRow = handler.uploadRow = (typeof handler.buildUploadRow === 'function' ?
                    handler.buildUploadRow(files, index, handler) : null);
                if (uploadRow) {
                    handler.progressbar = handler.initProgressBar(
                        self.DOM.confirmLocalDialog.closest('.ui-dialog').find('#row-'+index+'-progressbar'),
                        0
                    );
                    handler.uploadRow[0].cancelUpload = function () {
                        handler.cancelUpload(null, files, index, xhr, handler);
                    };
                    var isArchive = false;
                    if (files[index].type && files[index].type == 'application/zip')
                        isArchive = true;
                    else if (self._getExtension(files[index].name) == 'zip')
                        isArchive = true;
                    if (!isArchive || (isArchive && self._hasElementZip())) {
                        handler.loadPreviewImage(files, index, handler);
                        self._getImageDimensions(files, index, handler);
                        var element = handler.uploadRow.find('select[name=ElementSlug]').val();
                        self._fetchInlineEdit(files[index].name,index,element,handler.uploadRow.find('.inline-fields')[0]);
                    }
                }
            },
            buildUploadRow : function(files,index,handler) {
                if (self.options.RowHandler != null && typeof self.options.RowHandler === 'function') {
                    return self.options.RowHandler(files,index,handler);
                }
                else {
                    return self._generateRow(files,index,handler);
                }
            },
            initDownloadRow: function (event, files, index, xhr, handler) {
                var json, downloadRow;
                try {
                    json = handler.response = handler.parseResponse(xhr, handler);
                } catch (e) {
                    if (typeof handler.onError === 'function') {
                        handler.originalEvent = event;
                        handler.onError(e, files, index, xhr, handler);
                    } else {
                        throw e;
                    }
                }
                /* Handle the return from an archive upload */
                if (self.hasArchive && json.nodes && json.nodes.length > 0) {
                    self.storingTemporary = true;

                    handler.uploadRow.remove();
                    self.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').find('.file_upload_progress').remove();
                    $.each(json.nodes, function(i,n) {
                        downloadRow = self._generateRow(files,i,handler,n);
                        downloadRow.appendTo(handler.downloadTable);

                        handler.initProgressBar(
                            self.DOM.confirmLocalDialog.closest('.ui-dialog').find('#row-'+i+'-progressbar'),
                            0
                        );

                        var element = downloadRow.find('select[name=ElementSlug]').val();
                        self._fetchInlineEdit(n.title,i,element,downloadRow.find('.inline-fields')[0]);
                    });

                    self.DOM.confirmLocalButton && self.DOM.confirmLocalButton.text('Upload File'+(json.nodes.length==1?'':'s'));
                    self.DOM.confirmLocalDialog.dialog('option','title',self.options.ConfirmDialogTitle+json.nodes.length+' file'+(json.nodes.length==1?'':'s'));
                    self.DOM.paginationPanel.show();
                    self.DOM.paginationLabel.html("File <em>1</em> of <em>"+json.nodes.length+"</em>");
                    self._updateTableRows();
                    self._positionDialog.apply(self,[$(this)]);
                }
                else {
                    downloadRow = handler.downloadRow = $('<tr class="file" id="row-'+index+'"><td colspan="3"></td></tr>');
                    handler.downloadRow[0].cancelUpload = function () {
                        handler.cancelUpload(null, files, index, xhr, handler);
                    };
                    handler.downloadRow.hide();
                }
            },
            buildDownloadRow: function (file, handler, ofiles, index) {
                if (self.options.RowHandler != null && typeof self.options.RowHandler === 'function') {
                    return self.options.RowHandler(ofiles,index,handler,file);
                }
                else {
                    return self._generateRow(ofiles,index,handler,file);
                }
            },
            replaceNode: function (oldNode, newNode, callBack) {
                if (!(newNode && newNode.length)) {
                    oldNode.remove();
                    if (typeof callBack === 'function') {
                        try {
                            callBack();
                        } catch (e) {
                            // Fix endless exception loop:
                            oldNode.stop();
                            throw e;
                        }
                    }
                    return;
                }
                if (oldNode && oldNode.length) {
                    newNode.css('display', 'none');
                    oldNode.replaceWith(newNode);
                    newNode.fadeIn(function () {
                        if (typeof callBack === 'function') {
                            try {
                                callBack();
                            } catch (e) {
                                // Fix endless exception loop:
                                oldNode.stop();
                                newNode.stop();
                                throw e;
                            }
                        }
                    });
                } else if (typeof callBack === 'function') {
                    callBack();
                }
            },
            beforeSend: function (event, files, index, xhr, handler, callBack) {
                if (self.hasArchive && !self._hasElementZip()) {
                    handler.formData = {
                        'File' : files[index].name,
                        "PHPSESSID_FLASH" : $.cookie('phpsessionid'),
                        "MEMBERREF_FLASH" : $.cookie('memberRef')
                    };
                }
                else {
                    handler.formData = {
                        "action_nonce" : self.options.QuickAddNonce,
                        'File' : files[index].name,
                        "Keys" : 'Slug,Title,Status,Element.Slug,RecordLink',
                        "PHPSESSID_FLASH" : $.cookie('phpsessionid'),
                        "MEMBERREF_FLASH" : $.cookie('memberRef')
                    };
                }

                handler.uploadRow[0].startUpload = function () {
                    var id = parseInt($(handler.uploadRow[0]).attr('id').replace(/^row-/,''));
                    if (!self.hasArchive)
                        eval('document.uniqueTagFormManager'+id+'._rebuildInputs();');
                    $('#row-'+id+' :input',self.DOM.localFileTable).each(function() {
                        var o = $(this);
                        handler.formData[o.attr('name')] = o.val();
                    });

                    callBack();
                    return false;
                };

                if(files.length > 1)
                    self.DOM.paginationPanel.show();

                self.DOM.confirmLocalButton && self.DOM.confirmLocalButton.text('Upload File'+(files.length==1?'':'s'));
                self.DOM.confirmLocalDialog.dialog('option','title',self.options.ConfirmDialogTitle+files.length+' file'+(files.length==1?'':'s'));
                self.DOM.confirmLocalDialog.dialog('open');
                $(':input',self.DOM.confirmLocalDialog).not('[type=image]').inputFocus();
            },
            onSend: function (event, files, index, xhr, handler) {
                if (self.hasErrors)
                    return;
                handler.initUploadProgress(xhr, handler);
            },
            onProgress : function (event, files, index, xhr, handler) {
                setTimeout(function() {
                    if (handler.progressbar && event.lengthComputable) {
                        handler.progressbar.progressbar(
                            'value',
                            parseInt(event.loaded / event.total * 100, 10)
                        );
                    }
                },1);
            },
            onAbort: function (event, files, index, xhr, handler) {
                // do nothing
            },
            onLoad: function (event, files, index, xhr, handler) {
                if (self.hasErrors)
                    return;

                var resp = handler.parseResponse(xhr, handler);

                var callBack = function () {
                    if (typeof handler.onComplete === 'function') {
                    // FF: explicitly pass resp to onComplete to avoid setTimeout scope issue
                    handler.onComplete(event, files, index, xhr, handler, resp);
                    }
                    handler.multiLoader.complete();
                };

                var args = arguments;
                var onload = function() {
                    if (self.hasArchive && !self._hasElementZip()) {
                        handler.multiLoader.push(Array.prototype.slice.call(args, 1));
                        handler.initDownloadRow(event, files, index, xhr, handler);
                        handler.replaceNode(handler.uploadRow, handler.downloadRow, callBack);
                    }
                    else if (resp.Errors) {
                        self.hasErrors = true;

                        alert(resp.Errors[0].Message);
                        // Return error, stop all other uploads, move to page with error
                        $('tr.file',self.DOM.localFileTable).each(function(i,r) {
                            var id = $(r).attr('id').replace(/^row-/,'');
                            if (id < index)
                                return;

                            setTimeout(function() {
                                $('#row-'+id+'-progressbar .ui-progressbar-value').css('width','0%');
                            },0);
                            if (typeof r.cancelUpload === 'function')
                                r.cancelUpload();
                        });
                        self._setCurrentPage(1);
                        self.DOM.confirmLocalButton && self.DOM.confirmLocalButton.text('Upload File'+((files.length - index)==1?'':'s'));
                        self.DOM.paginationLabel.html("File <em>1</em> of <em>"+(files.length - index)+"</em>");
                    }
                    else {
                        handler.multiLoader.push(Array.prototype.slice.call(args, 1));
                        handler.removeNode(handler.uploadRow, callBack);
                        $('#row-'+index+'-progressbar').remove();
                    }
                };

                if ($('#row-'+index+'-progressbar .ui-progressbar-value').css('width') != '100%') {
                    // FF: Needs this to be forced to 100% because it doesn't fire the final onProgress event
                    $('#row-'+index+'-progressbar .ui-progressbar-value').css('width','100%');
                    // Add a 1/4 second delay before progressing to provide a visual cue for completion.
                    setTimeout(function() {
                        onload();
                    },250);
                }
                else
                    onload();
            },
            // FF: resp is explicitly passed in, xhr loses scope after setTimeout
            onComplete: function(event, files, index, xhr, handler, resp) {
                try {
                    if (self.hasErrors) {
                        // do nothing
                    }
                    else if (self.hasArchive && !self._hasElementZip()) {
                        // do nothing, user interaction required
                    } else {
                        //successful upload, add a new out tag
                        if (typeof self.options.OnComplete === 'function')
                            self.options.OnComplete(resp.nodes[0]);
                        if ($('tr.file',self.DOM.localFileTable).length > 0) {
                            self._setCurrentPage(self._getCurrentPage() + 1);
                        }
                        else {
                            if (typeof handler.onCompleteAll === 'function') {
                                handler.onCompleteAll();
                            }
                        }
                    }
                } catch(e) {
                    alert("There was an error processing the upload: "+e);
                }
            },
            onCompleteAll: function(list) {
                if (self.hasErrors) {
                    // do nothing
                }
                else if (!self.hasArchive || self._hasElementZip()) {
                    if ($('.ui-progressbar-value:last').css('width') != '100%') {
                        // FF: Needs this to be forced to 100% because it doesn't fire the final onProgress event
                        $('.ui-progressbar-value:last').css('width','100%');
                        // Add a 1/4 second delay before progressing to provide a visual cue for completion.
                        if (typeof self.options.OnCompleteAll === 'function')
                            self.options.OnCompleteAll();
                        setTimeout(function() {
                            self.DOM.confirmLocalDialog.dialog('close');
                        },250);
                    }
                    else {
                        if (typeof self.options.OnCompleteAll === 'function')
                            self.options.OnCompleteAll();
                        self.DOM.confirmLocalDialog.dialog('close');
                    }
                }
            }
        };

        // If we don't need the dialog, override some of the upload behaviors.
        if (!this.options.ShowDialog) {
            options.initUpload = function (event, files, index, xhr, handler, callback) {
                handler.formData = $.extend({
                    "action_nonce" : self.options.QuickAddNonce,
                    'ParentElement' : self.options.ParentElement,
                    'File' : files[index].name,
                    "PHPSESSID_FLASH" : $.cookie('phpsessionid'),
                    "MEMBERREF_FLASH" : $.cookie('memberRef')
                }, self.options.PostParams || {});
                callback();
            };
            delete(options.beforeSend);
            options.onSend = function (event, files, index, xhr, handler) {
                if (files[index].size > 207618048) { // 198MB
                    $.error('FILE TOO BIG!');
                }

                if (self.hasErrors)
                    return;
                $('#progressbar-'+self.widget.UUID).show();
                handler.initUploadProgress(xhr, handler);
            };
            options.onProgress = function (event, files, index, xhr, handler) {
                setTimeout(function() {
                    if (event.lengthComputable) {
                        $('#progressbar-'+self.widget.UUID+' .ui-progressbar-value').css('width',parseInt(event.loaded / event.total * 100, 10)+'%');
                    }
                },1);
            };
            options.onLoad = function (event, files, index, xhr, handler) {
                if (self.hasErrors)
                    return;

                var resp = handler.parseResponse(xhr, handler);

                var onload = function() {
                    handler.multiLoader.push(Array.prototype.slice.call(arguments, 1));
                    if (resp.Errors) {
                        self.hasErrors = true;
                        $.error(resp.Errors[0].Message);
                    }
                    else {
                        //successful upload, add a new out tag
                        if (typeof self.options.OnComplete === 'function')
                            self.options.OnComplete(resp);
                        if (index == files.length - 1)
                            $('#progressbar-'+self.widget.UUID).hide();
                    }
                };

                if ($('#progressbar-'+self.widget.UUID+' .ui-progressbar-value').css('width') != '100%') {
                    // FF: Needs this to be forced to 100% because it doesn't fire the final onProgress event
                    $('#progressbar-'+self.widget.UUID+' .ui-progressbar-value').css('width','100%');
                    // Add a 1/4 second delay before progressing to provide a visual cue for completion.
                    setTimeout(function() {
                        onload();
                    },250);
                }
                else
                    onload();
            }
        }

        this.DOM.uploadFromLocalForm.fileUploadUI(options);
    },

    quickAddFromURL : function(event) {
        event.preventDefault();

        var self = this;

        var URL;
        do {
            URL = prompt("Please specify the URL for this media file:",'');
            if(URL == null || (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Version/5.1') != -1 &&  URL == "")) return false;

            var sanitizedUrl = URL.split('?')[0];
            var isValid = this._isValidURL(URL) && this._filetypesValid([{ name : sanitizedUrl.substring(sanitizedUrl.lastIndexOf('/')+1) }]);
            URL = $.trim(URL);
        } while(URL.length == 0 || !isValid);

        if (!self.options.QuickAddURL.match(/\/api\/files/))
            self._confirmQuickAddFromUrl.apply(self,[URL]);
        else
            self._quickAddFileFromUrl.apply(self,[URL]);
    },

    _confirmQuickAddFromUrl : function(URL) {
        this.uploadUrl = true;

        $('tr.file:first',this.DOM.localFileTable).nextAll().remove();

        var sanitizedUrl = URL.split('?')[0];
        var file = {
            title : sanitizedUrl.substring(sanitizedUrl.lastIndexOf('/')+1),
            size : -1,
            dimensions : null,
            thumbnailUrl : URL
        };

        var tr = this._generateRow([],0,null,file);
        if (!tr)
            return;

        $('.file_upload_progress', this.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane')).append($('<div/>').addClass('ui-progressbar-value').css('width','0%'));

        this.DOM.localFileTable.append(tr);
        $('select[name="ElementSlug"]', tr).change();

        var previewImage = $('.file_upload_preview img',tr);
        previewImage.width('auto').height('auto');

        var width = previewImage[0].width;
        var height = previewImage[0].height;

        if(width > height)
            previewImage.width('150px');
        else
            previewImage.height('150px');

        this.DOM.confirmLocalButton && this.DOM.confirmLocalButton.text('Upload File');
        this.DOM.confirmLocalDialog.dialog('open');
    },

    _quickAddFromUrl : function() {
        var self = this;

        var url = $('tr:eq(0) .file_upload_preview img',this.DOM.localFileTable).attr('src');
        var sanitizedUrl = url.split('?')[0];
        var ext = self._getExtension(sanitizedUrl);

        var formData = {
            "action_nonce" : self.options.QuickAddNonce,
            'Url' :  $.trim(url),
            'Title' : sanitizedUrl.substring(sanitizedUrl.lastIndexOf('/')+1),
            'ElementSlug' : self.options.ElementExtensionMap[ext.toLowerCase()]
        };

        eval('document.uniqueTagFormManager0._rebuildInputs();');
        $('tr.file:eq(0) :input',this.DOM.localFileTable).each(function() {
            var o = $(this);
            formData[o.attr('name')] = o.val();
        });

        var options = {
            url : self.options.QuickAddURL,
            success : function(json){
                if (typeof self.options.OnComplete === 'function')
                    self.options.OnComplete(json.nodes[0]);
                if (typeof self.options.OnCompleteAll == 'function')
                    self.options.OnCompleteAll();
                self.DOM.confirmLocalDialog.dialog('close');
            },
            error : function(err){
                var numFiles = $('tr.file',self.confirmLocalDialog).length;

                self.hasErrors = true;
                self._setCurrentPage(1);
                setTimeout(function() {
                    $('#row-0-progressbar .ui-progressbar-value').css('width','0%');
                },0);

                self.DOM.confirmLocalButton && self.DOM.confirmLocalButton.text('Upload File'+(numFiles==1?'':'s'));
                self.DOM.paginationLabel.html("File <em>1</em> of <em>"+(numFiles)+"</em>");

                self._ajaxErrorHandler(null, err);
            },
            params : formData
        };
        setTimeout(function() {
            $('#row-0-progressbar .ui-progressbar-value').css('width','100%');
            MediaService.quickAdd(options);
        },0);
    },

    _quickAddFileFromUrl : function(url) {
        var self = this;

        var node = new NodeObject();

        node.Element = {
            Slug : ""
        };
        node.Title = "";

        setTimeout(function() {
            $('#progressbar-'+self.widget.UUID).show();
            $('#progressbar-'+self.widget.UUID+' .ui-progressbar-value').css('width','100%');

            NodeService.quickAdd(node,{
                url: self.options.QuickAddURL,
                nonce : self.options.QuickAddNonce,
                success : function(newnode){
                    if (typeof self.options.OnComplete === 'function')
                        self.options.OnComplete(newnode);
                    setTimeout(function() {
                        $('#progressbar-'+self.widget.UUID).hide();
                    },250);
                },
                error : function(err){
                    self.hasErrors = true;

                    if (!err.Errors) // These are alerted by NodeService
                        self._ajaxErrorHandler(null, err);
                },
                params : function(params){
                    params['ParentElement'] = self.options.ParentElement;
                    params['FileURL'] = url;
                }
            });
        },0);
    },

    _showURLConfirmPopup : function(url) {
        this.uploadUrl = true;

        $('tr.file:first',this.DOM.localFileTable).nextAll().remove();

        var sanitizedUrl = url.split('?')[0];
        var file = {
            title : sanitizedUrl.substring(sanitizedUrl.lastIndexOf('/')+1),
            size : -1,
            dimensions : null,
            thumbnailUrl : url
        };

        var tr = this._generateRow([],0,null,file);
        if (!tr)
            return;

        $('.file_upload_progress', this.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane')).append($('<div/>').addClass('ui-progressbar-value').css('width','0%'));

        this.DOM.localFileTable.append(tr);
        $('select[name="ElementSlug"]', tr).change();

        var previewImage = $('.file_upload_preview img',tr);
        previewImage.width('auto').height('auto');

        var width = previewImage[0].width;
        var height = previewImage[0].height;

        if(width > height)
            previewImage.width('150px');
        else
            previewImage.height('150px');

        this.DOM.confirmLocalButton && this.DOM.confirmLocalButton.text('Upload File');
        this.DOM.confirmLocalDialog.dialog('open');
    },

    _positionDialog : function(dialog) {
        var table = dialog.find('table');
        dialog.dialog('option','position','center');
    },

    _getCurrentPage : function() {
        return parseInt($('em:eq(0)',this.DOM.paginationLabel).text());
    },

    _setCurrentPage : function(page) {
        $('em:eq(0)',this.DOM.paginationLabel).text(page+'');
        this._updateTableRows();
        this._positionDialog(this.DOM.confirmLocalDialog);
    },

    _updateTableRows : function() {
        var page = this._getCurrentPage();
        var maxPages = $('em:eq(1)',this.DOM.paginationLabel).text();
        var numRows = $('tr.file',this.DOM.localFileTable).length;

        $('.file_upload_progress').hide();
        $('tr.file',this.DOM.localFileTable).hide();
        var row;
        if (maxPages == numRows) {
            row = this.DOM.localFileTable.find('tr.file:eq('+(page-1)+')');
        }
        else {
            row = this.DOM.localFileTable.find('tr.file:eq(0)');
        }
        row.show();

        var id = row.attr('id').replace(/^row-/,'');
        $('#row-'+id+'-progressbar').show();
    },

    _generateRow : function(files,index,handler,file) {
        var self = this;

        var filename = (file && file['title']) ? file['title'] : files[index].name;
        var filesize = (file && file['size']) ? file['size'] : files[index].size;
        var dimensions = (file && file['width'] && file['height']) ? '<span>'+file['width']+'x'+file['height']+'</span>' : '&nbsp;';

        var tr = $('<tr class="file" id="row-'+index+'"></tr>');
        tr.append('<td class="file_upload_preview placeholder"></td>');

        if (file != null) {
            $('.file_upload_preview',tr).removeClass('placeholder')
                .append($('<img src="'+file['thumbnailUrl']+'" />'));
        }
        else if (this.hasArchive) {
            // keep placeholder
        }

        var progress = $('<div class="file_upload_progress progressbar" id="row-'+index+'-progressbar"></div>');
        if (file != null && file['title']) {
            progress.progressbar = function (key, value) {
                return this.each(function () {
                    if (key === 'destroy') {
                        $(this).removeClass('progressbar').empty();
                    } else {
                        $(this).children().css('width', value + '%');
                    }
                });
            };
        }
        if (this.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').length > 0) {
            this.DOM.confirmLocalDialog.next('.ui-dialog-buttonpane').prepend(progress);
        }
        else {
            this.DOM.confirmLocalDialog.prepend(progress);
        }

        var fieldCell = $('<td class="fields"></td>');

        if (file && file['element'] && file['slug'])
            fieldCell.append($('<input type="hidden" name="NodeRef" value="'+file['element']+':'+file['slug']+'" />'));

        var fields = $('<ul></ul>');

        fields.append('<li class="filename"><label>Filename</label>'+filename+'</li>');
        if (filesize >= 0)
            fields.append('<li class="size"><label>Size</label>'+this._formatFileSize(filesize)+'</li>');
        if (!this.uploadUrl)
            fields.append('<li class="dimensions"><label>Dimensions</label>'+dimensions+'</li>');

        var el = $('<li class="element"><label>Element</label></li>');
        if (file != null && file['element'] && file['element'] != 'temporary-zipped-media') {
            el.append('<span>'+file['element']+'</span>');
        } else {
            var isArchive = false;
            var ext = this._getExtension(filename);
            var eslug;
            var mime;
            if (!!this.options.ElementExtensionMap && ext in this.options.ElementExtensionMap){
                eslug = this.options.ElementExtensionMap[ext];
            }
            else if (file == null && files[index].type != null) {
                mime = files[index].type.split('/');
                eslug = mime[0];
            }

            if ((mime != null && mime[1] == 'zip') || ext == 'zip')
                isArchive = true;

            if(eslug == null)
                eslug = this.options.ElementExtensionMap['*'];

            if (!isArchive || (isArchive && self._hasElementZip())) {
                var element = SystemService.getElementBySlug(eslug);
                if(element == null) {
                  eslug   = self.options.ElementExtensionMap['*'];
                  element = SystemService.getElementBySlug(eslug);
                }

                var elements;
                if (this.options.QuickAddElement.charAt(0) == '@') {
                    elements = SystemService.getElementsByAspect(SystemService.getAspectBySlug(this.options.QuickAddElement.substr(1)).Slug);
                } else {
                    elements = [SystemService.getElementBySlug(this.options.QuickAddElement)];
                }

                var select = $('<select name="ElementSlug"></select>').change(function() {
                    var o = $(this);
                    self._fetchInlineEdit(filename,index,o.val(),o.closest('td').find('.inline-fields')[0]);
                });

                if(this.options.DefaultQuickAddElement == null)
                    select.append('<option></option>');

                $.each(elements,function(j,e){
                    if (e.Slug == 'temporary-zipped-media')
                        return;
                    select.append($('<option value="'+e.Slug+'"'+((self.options.DefaultQuickAddElement === e.Slug) ? ' selected="true"':'')+'>'+e.Name+'</option>'));
                });
                el.append(select);
            }
        }
        fields.append(el);

        fieldCell.append(fields);
        fieldCell.append('<div class="inline-fields"></div>');
        tr.append(fieldCell);

        return tr;
    },

    _fetchInlineEdit : function(filename,index,element,div) {
        var self = this;

        $.ajax({
            type: 'GET',
            dataType: 'html',
            url: 'ajax/template/',
            data: {
                'Template': 'upload-fields.cft',
                'Element': (typeof element == 'undefined' && self.options.ForceElementSelection) ? self.options.DefaultElement : element,
                'Title': filename,
                index: index
            },
            success: function(data, status) {
                if (status == "success" || status == "notmodified" ) {
                    $(div).empty().append(data);

                    $('input[name=Title]',div).each(function() {
                        var o = $(this);
                        var newSlug = SlugHelper.create(o.val());
                        $('input#Slug', o.closest('ul')).val(newSlug);
                    });
                    if ($('tr#row-'+index+'.file',self.DOM.confirmLocalDialog).is(':visible'))
                        self._positionDialog(self.DOM.confirmLocalDialog);
                } else {
                    if(typeof console != "undefined")
                        console.error(status);
                }
            }
        });
    },

    _getImageDimensions : function(files, index, handler) {
        index = index || 0;
        handler.uploadRow.find('.dimensions').each(function () {
            var dimensionNode = $(this),
                file = files[index];
            setTimeout(function () {
                var img = document.createElement('img');
                var urlAPI = typeof URL !== 'undefined' ? URL : typeof webkitURL !== 'undefined' ? webkitURL : null;
                if (urlAPI && typeof urlAPI.createObjectURL === 'function') {
                    img.onload = function () {
                        urlAPI.revokeObjectURL(this.src);
                        dimensionNode.append('<span>'+img.width+'x'+img.height+'</span>');
                    };
                    img.src = urlAPI.createObjectURL(file);
                } else if (typeof FileReader !== 'undefined' && typeof FileReader.prototype.readAsDataURL === 'function') {
                    img.onload = function () {
                        dimensionNode.append('<span>'+img.width+'x'+img.height+'</span>');
                    };
                    fileReader = new FileReader();
                    fileReader.onload = function (e) {
                        img.src = e.target.result;
                    };
                    fileReader.readAsDataURL(file);
                } else {
                    dimensionNode.append('<span>Not available</span>');
                }
            }, handler.previewLoadDelay);
        });
    },

    _storeTemporary : function(i,row,numRows) {
        var self = this;
        row = $(row);
        var index = parseInt(row.attr('id').replace(/^row-/,''));

        var formData = {
            "Store" : true,
            "PHPSESSID_FLASH" : $.cookie('phpsessionid'),
            "MEMBERREF_FLASH" : $.cookie('memberRef')
        };

        eval('document.uniqueTagFormManager'+index+'._rebuildInputs();');
        $(':input',row).each(function() {
            var o = $(this);
            formData[o.attr('name')] = o.val();
        });

        var options = {
            params : formData,
            async : false,
            error : function(req, err) {
                var numFiles = $('tr.file',self.confirmLocalDialog).length;

                self.hasErrors = true;
                self._setCurrentPage(1);

                setTimeout(function() {
                    $('.ui-progressbar-value').css('width','0%');
                },0);

                self.DOM.confirmLocalButton && self.DOM.confirmLocalButton.text('Upload File'+(numFiles==1?'':'s'));
                self.DOM.paginationLabel.html("File <em>1</em> of <em>"+(numFiles)+"</em>");

                self._ajaxErrorHandler(req,err);
            },
            success : function(json) {
                try {
                    if (typeof self.options.OnComplete === 'function')
                        self.options.OnComplete(json.nodes[0]);
                    row.remove();
                    $('#row-'+index+'-progressbar').remove();

                    var numRows = $('tr.file',self.DOM.localFileTable).length;
                    if (numRows == 0) {
                        if (typeof self.options.OnCompleteAll == 'function')
                            self.options.OnCompleteAll();
                        setTimeout(function() {
                            self.DOM.confirmLocalDialog.dialog('close');
                        },250);
                    }
                    else {
                        var nextRow = $('tr.file:eq(0)',self.DOM.localFileTable);
                        self.DOM.paginationNextButton.click();
                        self._storeTemporary(index+1,nextRow,numRows);
                    }
                }
                catch(e) {
                    alert("There was an error processing the upload: "+e);
                }
            }
        };
        $('#row-'+index+'-progressbar .ui-progressbar-value').css('width','100%');
        setTimeout(function() {
            MediaService.uploadArchive(options);
        },250);
    },

    // Helper Functions
    _validateTitles : function($dialog) {
        var self = this;
        var failure = false;

        $('tr input[name=Title]',$dialog).each(function(i,e){
            var title = $(e);
            if($.trim(title.val()) == '') {
                alert('Please enter a title.');
                self._setCurrentPage(i+1);
                title.focus();
                failure = true;
                return false;
            }
        });

        return !failure;
    },

    _validateElements : function($dialog) {
        var self = this;
        var failure = false;

        $('tr select[name=ElementSlug]',$dialog).each(function(i,e) {
            var element = $(e);
            if ($.trim(element.val()) == '') {
                alert('Please select an element.');
                self._setCurrentPage(i+1);
                element.focus();
                failure = true;
                return false;
            }
        });

        return !failure;
    },

    _filetypesValid : function(files) {
        var self = this;

        if (!this.options.FileMask || (!!this.options.FileMask && this.options.FileMask == '*'))
            return true;

        var valid = false;
        $.each(files, function (index, file) {
            if (typeof file.name === 'undefined')
                file.name = file.fileName;

            var ext = self._getExtension(file.name);

            var mask = self.options.FileMask.split(';');
            for (var i=0;i<mask.length;i++) {
                if (mask[i].match(new RegExp(ext+'$','gi'))) {
                    valid = true;
                    break;
                }
            }
            if (!valid) {
                alert('Upload contains an invalid file type. Valid file types are: '+self.options.FileMask);
                return false;
            }
        });

        return valid;
    },

    _checkFileTypes : function(files) {
        var self = this;
        this.hasArchive = false;
        this.hasImage = false;
        var status = true;
        $.each(files, function (index, file) {
            if (!!self.options.ElementExtensionMap) {
                // Check there's an element to map to (will not apply to FileTagWidget)
                if (typeof file.name === 'undefined')
                    file.name = file.fileName;

                    var ext = self._getExtension(file.name);
                    var eslug;
                    if (file.type != null && file.type != '') {
                        var mime = file.type.split('/');
                        eslug = mime[0];
                    }
                    else
                        eslug = self.options.ElementExtensionMap[ext];

                if(eslug == null)
                    eslug = self.options.ElementExtensionMap['*'];

                var element = SystemService.getElementBySlug(eslug);

                if(element == null && ext != 'zip'){
                    eslug = self.options.ElementExtensionMap['*'];

                    element = SystemService.getElementBySlug(eslug);
                    if(element == null && ext != 'zip') {
                        alert("Element not found for file type: "+ext);
                        status = false;
                        return false;
                    }
                }

                // Check the extension is accepted
                var extensions = [];
                for(var e in self.options.ElementExtensionMap) {
                    if (e == '*')
                        extensions.push('.'+e);
                    else
                        extensions.push(e);
                }
                var restr = "\\.("+extensions.join(')|(')+')$';
                var regexp = new RegExp(restr,'i');
                // Using the filename extension for our test,
                // as legacy browsers don't report the mime type
                if (!regexp.test(file.name)) {
                    alert('Filetype of '+file.fileName+' is not allowed.');
                    status = false;
                    return false;
                }
            }

            if (file.size > 207618048) { // 198MB
                alert('File '+file.fileName+' is too big ('+self._formatFileSize(file.size)+').');
                status = false;
                return false;
            }

            if (ext == 'zip') {
                self.hasArchive = true;
            } else if (!self.options.ElementExtensionMap || self.options.ElementExtensionMap[ext] != null) {
                self.hasImage = true;
            }
        });

        if (this.hasArchive && !self._hasElementZip()) {
            $('form#html5-upload-'+this.widget.UUID).attr('action',this.options.ArchiveAddURL);
        }
        else
            $('form#html5-upload-'+this.widget.UUID).attr('action',this.options.QuickAddURL);

        return status;
    },

    /**
     * Checks if we support the zip extension as an element. If so, we won't try to extract it.
     */
    _hasElementZip : function() {
        // Default to true if there is no extension map
        if (!this.options.ElementExtensionMap)
            return true;

        return !!this.options.ElementExtensionMap.zip;
    },

    _isValidURL : function(url) {
        var isValid = true;
        var sanitizedUrl = url.split('?')[0];
        var m = /(http[s]?):\/\/((.+)\/)+(([%\w-]+)\.([0-9a-zA-Z]+))/.exec(sanitizedUrl);
        if(m == null) {
            alert('The specified URL must link to a valid file with an extension.');
            isValid = false;
        }

        return isValid;
    },

    _isXHRUploadCapable : function() {
        return typeof XMLHttpRequest !== 'undefined' && typeof XMLHttpRequestUpload !== 'undefined' &&
            typeof File !== 'undefined' && (typeof FormData !== 'undefined' ||
            (typeof FileReader !== 'undefined' && typeof XMLHttpRequest.prototype.sendAsBinary === 'function'));
    },

    _formatFileSize : function(size) {

        //Uses OS X Snow Leopard file size math

        if(size >= 1000000) {
            return Math.round(size/1000000)+'MB';
        }

        return Math.round(size/1000)+'KB';
    },

    _getExtension : function(filename) {
        if (filename == null)
            return;

        var sanitizedFilename = filename.split('?')[0];
        return sanitizedFilename.slice(sanitizedFilename.lastIndexOf('.')+1).toLowerCase();
    },

    _ajaxErrorHandler : function(req, err) {
        if (req != null)
            alert('Error: '+err+': '+req.response);
        else
            alert('Error: '+err);
    }
};

