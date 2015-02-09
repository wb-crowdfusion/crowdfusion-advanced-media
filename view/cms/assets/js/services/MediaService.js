var MediaService = (function() {

    var newInstance = function() {

        var UUID = 'mediaservice-'+(new Date().getTime())+Math.floor(Math.random()*1024);

        /* private attributes */
        var quickAddLoading = false;
        var findAllLoading = false;
        var currentRequest;
        var asyncQueue = new AsyncQueue();

        var checkResponse = function(json,url,params) {
            if(json == null || typeof json != "object") {
                var paramMsg = "Params:\n";
                if(params != null && typeof params == 'object') {
                    for(var paramkey in params) {
                        paramMsg += "   "+paramkey+": "+params[paramkey]+"\n";
                    }
                }

                var jsonMsg = "JSON is ";
                if(json == null)
                    jsonMsg += "null";
                else if(typeof json != 'object')
                    jsonMsg += "not an object: "+json;
                else
                    jsonMsg += "is valid";

                jsonMsg += "\n\n";

                var urlMsg = "URL: " + url + "\n\n";

                //console_log("There was a problem with the following API call:\n\n" + jsonMsg + urlMsg + paramMsg);

                return false;
            }

            return true;
        };

        var putInCache = function(nodeRef,obj) {
            NodeObjectCache.set(nodeRef,obj,300);
        };

        var getFromCache = function(nodeRef) {
            return NodeObjectCache.get(nodeRef);
        };

        /* public methods */
        return {

            getUUID : function() {
                return UUID;
            },

            getInstance : function() {
                return newInstance();
            },

            addThumbnail : function(nodeRef, thumbnailValue, srcFile, options) {
                options = $.extend({
                    nonce : null,
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : '/api/media/add-thumbnail.json/',
                    async : true,
                    useCache : true
                },options || {});

                var params = $.extend({
                    nodeRef: nodeRef,
                    thumbnailValue: thumbnailValue,
                    srcFile: srcFile
                },options.params || {});

                $.ajax({
                    dataType : 'json',
                    type : 'POST',
                    url : options.url,
                    data : params,
                    async : options.async,

                    error : function(req, err) {
                        if(typeof options.error == 'function')
                            options.error(err);
                    },

                    success : function(json) {
                        if(!checkResponse(json,options.url,params)) return;

                        if(typeof options.error == 'function' && json.Errors) {
                            if(json.Errors.length > 0) {
                                alert(json.Errors[0].Message);
                            }

                        } else if(!json.Errors) {
                            NodeObjectCache.remove(nodeRef);

                            if(typeof options.success == 'function')
                                options.success(json);
                        }
                    },

                    complete: function() {
                        if(typeof options.complete == 'function')
                            options.complete();
                    }
                });
            },

            replaceThumbnail : function(nodeRef, thumbnailValue, srcFile, options) {
                options = $.extend({
                    nonce : null,
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : '/api/media/replace-thumbnail.json/',
                    async : true,
                    useCache : true
                },options || {});

                var params = $.extend({
                    nodeRef: nodeRef,
                    thumbnailValue: thumbnailValue,
                    srcFile: srcFile
                },options.params || {});

                $.ajax({
                    dataType : 'json',
                    type : 'POST',
                    url : options.url,
                    data : params,
                    async : options.async,

                    error : function(req, err) {
                        if(typeof options.error == 'function')
                            options.error(err);
                    },

                    success : function(json) {
                        if(!checkResponse(json,options.url,params)) return;

                        if(typeof options.error == 'function' && json.Errors) {
                            if(json.Errors.length > 0) {
                                alert(json.Errors[0].Message);
                            }

                        } else if(!json.Errors) {
                            NodeObjectCache.remove(nodeRef);

                            if(typeof options.success == 'function')
                                options.success(json);
                        }
                    },

                    complete: function() {
                        if(typeof options.complete == 'function')
                            options.complete();
                    }
                });
            },

            removeThumbnail : function(nodeRef, thumbnailValue, options) {

                options = $.extend({
                    nonce : null,
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : '/api/media/remove-thumbnail.json/',
                    async : true
                },options || {});

                var params = {
                    nodeRef: nodeRef,
                    thumbnailValue: thumbnailValue
                };

                if(typeof options.params == 'function')
                    options.params(params);

                $.ajax({

                    dataType: 'json',
                    type: 'POST',
                    url: options.url,
                    data: params,
                    async : options.async,

                    error: function(req, err) {
                        if(typeof options.error == 'function')
                            options.error(err);
                    },

                    success: function(json) {

                        //SUCCESS IS 204 EMPTY

                        if(typeof options.error == 'function' && json && json.Errors) {
                            options.error(json);

                            if(json.Errors.length > 0) {
                                alert(json.Errors[0].Message);
                            }

                        } else if(!json || !json.Errors) {

                            NodeObjectCache.remove(nodeRef);

                            if(typeof options.success == 'function')
                                options.success();
                        }
                    },

                    complete: function() {
                        if(typeof options.complete == 'function')
                            options.complete();
                    }
                });
            },

            uploadArchive : function(options) {

                options = $.extend({
                    nonce : null,
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : "/api/media/upload-archive.json/",
                    async : true
                },options || {});

                var params = {
                    action_nonce: options.nonce
                };

                if(typeof options.params == 'function')
                    options.params(params);
                else
                    params = $.extend(params, options.params || {});

                $.ajax({

                    dataType: 'json',
                    type: 'POST',
                    url: options.url,
                    data: params,
                    async: options.async,

                    error: function(req, err) {
                        if(typeof options.error == 'function')
                            options.error(req, err);
                    },

                    success: function(json) {

                        if(!checkResponse(json,options.url,params)) return;

                        if(typeof options.error == 'function' && json.Errors) {
                            if(json.Errors.length > 0) {
                                if(typeof options.error == 'function')
                                    options.error(null,json.Errors[0].Message);
                                else
                                    alert(json.Errors[0].Message);
                            }

                        } else if(!json.Errors) {
                            if(typeof options.success == 'function')
                                options.success(json);
                        }
                    },

                    complete: function() {
                        if(typeof options.complete == 'function')
                            options.complete();
                    }
                });

            },

            quickAdd : function(options) {

                options = $.extend({
                    nonce : null,
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : '/api/media/quick-add.json/',
                    async : true
                },options || {});

                var params = {};

                if(typeof options.params == 'function')
                    options.params(params);
                else
                    params = $.extend(params, options.params || {});

                $.ajax({

                    dataType: 'json',
                    type: 'POST',
                    url: options.url,
                    data: params,
                    async: options.async,

                    error: function(req, err) {
                        if(typeof options.error == 'function')
                            options.error(err);
                    },

                    success: function(json) {

                        if(!checkResponse(json,options.url,params)) return;

                        if(typeof options.error == 'function' && json.Errors) {
                            if(json.Errors.length > 0) {
                                if(typeof options.error == 'function')
                                    options.error(json.Errors[0].Message);
                                else
                                    alert(json.Errors[0].Message);
                            }

                        } else if(!json.Errors) {
                        if(typeof options.success == 'function')
                            options.success(json);
                        }
                    },

                    complete: function() {
                        if(typeof options.complete == 'function')
                            options.complete();
                    }
                });

            },

            get : function(nodeRef, options) {

                options = $.extend({
                    success : null,
                    error : null,
                    complete : null,
                    params : null,
                    url : '/api/media/get.json/',
                    async : true,
                    retrieveThumbnails : true,
                    useCache : true
                },options || {});

                if(typeof options.success != 'function')
                    return;

                var params = {
                    nodeRef : nodeRef,
                    retrieveThumbnails : options.retrieveThumbnails
                };

                if(typeof options.params == 'function')
                    options.params(params);

                //if it's in cache, return right-away
                if(options.useCache) {
                    var json;
                    if((json = getFromCache(nodeRef))) {
                        options.success(json);
                        return;
                    }
                }

                asyncQueue.push(function(onDone){

                    //check cache again after this queued function executes
                    //another thread may have gotten this node after it was queued
                    if(options.useCache) {
                        var json;
                        if((json = getFromCache(nodeRef))) {
                            options.success(json);
                            onDone();
                            return;
                        }
                    }

                    $.ajax({

                        dataType: 'json',
                        type: 'GET',
                        url: options.url,
                        data: params,
                        async: options.async,

                        error: function(req, err) {
                            if(typeof options.error == 'function')
                                options.error(err);
                        },

                        success: function(json) {

                            if(!checkResponse(json,options.url,params)) return;

                            if(typeof options.error == 'function' && json.Errors) {
                                options.error(json);

                                if(json.Errors.length > 0) {
                                    alert(json.Errors[0].Message);
                                }

                            } else if(!json.Errors) {

                                if(options.useCache) {
                                    putInCache(nodeRef,json);
                                }

                                options.success(json);
                            }
                        },

                        complete: function() {
                            if(typeof options.complete == 'function')
                                options.complete();

                            onDone();
                        }
                    });
                });

            },

            findAll : function(options) {

                options = $.extend({
                    success : null,
                    error : null,
                    params : null,
                    url : '/api/media/find-all.json/',
                    async : true
                },options || {});

                if(!findAllLoading && typeof options.success == 'function') {

                    findAllLoading = true;

                    if(typeof currentRequest != 'undefined') currentRequest.abort();

                    currentRequest = $.ajax({
                        dataType: 'json',
                        type: 'GET',
                        url: options.url,
                        data: options.params,
                        async: options.async,

                        error: function(xhr, msg) {
                            if(typeof options.error == 'function')
                                options.error(xhr, msg);
                        },

                        success: function(json, status, xhr) {
                            if(!checkResponse(json,options.url,options.params)) return;

                            if(json.Errors) {

                                if(json.Errors.length > 0) {
                                    alert(json.Errors[0].Message);
                                }

                                if(typeof options.error == 'function')
                                    options.error(json);

                            } else
                                options.success(json, xhr);
                        },

                        complete: function() {
                            findAllLoading = false;
                        }
                    });
                }

                //no need for quickSearch if findall is implemented
            }

        };
    };

    return {
        getInstance : newInstance
    }
})().getInstance();
