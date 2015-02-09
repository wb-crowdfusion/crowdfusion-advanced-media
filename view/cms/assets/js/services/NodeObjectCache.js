var NodeObjectCache = (function(){

    //todo: USE JQUERY 1.5 DEFERRED OBJECTS FOR THIS

    //todo: improve speed of key looping (dont use regex) OR pass all keys to Worker thread which crunches regex
    //todo: subscribe to DOM cache events in constructor, keep expiration times in live array
    //todo: use setTimeout for cache expiration and use DOM cache events for thread saftey
    //todo: add UI to clear local storage somewhere in CMS
    //todo: use Worker thread to manage all expiration timeouts (send msgs to set and clear timeouts); worker is init'd with all expirations
    //todo: use single cache entry for all expiration times (and age, last access)

    var ENVELOPE = {
        CREATED : 0,
        EXPIRES : 1,
        LAST_ACCESSED : 2,
        MD5 : 3,
        DATA : 4
    };

    var UUID = 'noc-'+(new Date().getTime())+Math.floor(Math.random()*1024);
    var systemVersion = 1;
    var $document = $(document);
    var worker = null;


    /*
        CACHE OPTIONS
     */
    var options = {
        worker : null,
        namespace : "node.object.cache",
        heartbeatFrequency : 30, //seconds
        heartbeatThreshold : 90, //seconds
        evictionThreshold : 10 //percent
    };


    /*
        UTILITY FUNCTIONS
     */
    var makeKey = function(key) {
        return systemVersion + '_' + options.namespace + '_' + key;
    };
    var makeLock = function() {
        return systemVersion + '*LOCK*' + options.namespace;
    };
    var makeHeartbeat = function() {
        return systemVersion + '*HEARTBEAT*' + options.namespace;
    };

    var openEnvelope = function(envelope,openData) {
        try {
            var env = JSON.parse(envelope);
            return {
                created : new Date(env[ENVELOPE.CREATED]),
                expires : env[ENVELOPE.EXPIRES] === 0 ? 0 : new Date(env[ENVELOPE.EXPIRES]),
                lastAccessed : new Date(env[ENVELOPE.LAST_ACCESSED]),
                md5 : env[ENVELOPE.MD5],
                data : !!openData ? JSON.parse(env[ENVELOPE.DATA]) : env[ENVELOPE.DATA]
            };
        } catch(err) {
            return null;
        }
    };

    var touch = function(envelope) {
        try {
            var env = JSON.parse(envelope);
            env[ENVELOPE.LAST_ACCESSED] = new Date();
            return JSON.stringify(env);
        } catch(err) {
            return null;
        }
    };

    var createEnvelope = function(data,md5,expires) {
        return JSON.stringify([
            new Date(),          //created
            expires,             //expires
            new Date(),          //last accessed
            md5,                 //md5
            JSON.stringify(data) //data
        ]);
    };


    var init = function(_options) {
        options = $.extend(options,_options||{});

        if(false && options.worker != null) {
            //console_log('launching worker: '+options.worker);
            worker = new Worker(options.worker);
            worker.addEventListener('message', function(e) {
                //console.log('Worker said: ', e.data);
            }, false);
            worker.postMessage('hi');
        }

        setInterval(heartbeat,options.heartbeatFrequency * 1000);

        $(window).bind('unload',function(){
            var key = makeHeartbeat();
            var hb = localStorage.getItem(key);
            if(hb != null) {
                hb = JSON.parse(hb);
                if(hb.uuid == UUID) {
                    localStorage.removeItem(key);
                }
            }
        });
    };


    var getItem = function(key) {
        var env = localStorage.getItem(makeKey(key));
        if(env == null)
            return null;

        try {
            rawSetItem(makeKey(key),touch(env));
        } catch(err) {
            //bury
        }

        env = openEnvelope(env,true);
        return env.data;
    };


    var removeItem = function(key, suppressEvent) {
        localStorage.removeItem(makeKey(key));
        //console_log('remove '+key);
        if(!!!suppressEvent) {
            $document.trigger('NodeObjectCache.removeItem',key);
        }
    };


    var rawSetItem = function(key,entry) {
        if(entry == null)
            return;

        var attempt = 1;
        do {
            try {
                localStorage.setItem(key,entry);
                return;
            } catch(e) {
                if(e.name == "NS_ERROR_DOM_QUOTA_REACHED" /*FireFox*/ || e.name == "QUOTA_EXCEEDED_ERR" /*WebKit*/) {
                    //console_log("storage limit reached");
                    if(attempt == 1)
                        evictExpired();
                    else if(attempt == 2)
                        freeSpace();
                    else if(attempt == 3)
                        localStorage.clear(); //hopefully this never happens
                }
            }
        } while(attempt++ < 3);

        throw Error("could not free cache space");
    };
    var setItem = function(key, obj, expires) {
        if(typeof obj != 'undefined' && obj != null) {
            var d = 0;
            if(typeof expires == 'number') {
                d = new Date();
                d.setSeconds(d.getSeconds()+Math.abs(parseInt(expires)));
            }
            //todo: use accurate md5
            rawSetItem(makeKey(key), createEnvelope(obj,0,d));
        }
    };


    var heartbeat = function() {

        var hb = localStorage.getItem(makeHeartbeat());

        var update = function() {
            localStorage.setItem(makeHeartbeat(),JSON.stringify({
                uuid : UUID,
                ts : new Date()
            }));
            evictExpired(); //if this takes longer than the heartbeat threshold, then need to update into future
        };

        if(hb != null) {
            hb = JSON.parse(hb);

            if(hb.uuid == UUID) {
                //console_log('i have it');
                update();
            } else {
                var cutoff = new Date();
                cutoff.setSeconds(cutoff.getSeconds() - options.heartbeatThreshold);

                if(new Date(hb.ts) < cutoff) {
                    //console_log('other thread lost heartbeat, reclaiming');
                    update();
                } else {
                    //console_log('other thread has heartbeat');
                }
            }
        } else {
            //console_log('no heartbeat, claiming');
            update();
        }
    };


    var dumpCache = function() {
        for(var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            //console_log(key + ' = ' + localStorage.getItem(key));
        }
    };


    // EXPIRED CACHE CLEAN-UP WORKER
    //todo: find a way to make this efficient when a large number of cache entries exist
    var evictExpired = function(){
        var lockKey = makeLock();
        try {
            localStorage.setItem(lockKey,UUID);
        } catch(err) {
            return;
        }

        var i,matches = [];
        var ns = options.namespace.replace('.','\.');
        var regex = new RegExp("^"+systemVersion+"_"+ns+"_(.*)$");
        var now = new Date();

        for(i = 0; i < localStorage.length; i++) {
            var m,key = localStorage.key(i);
            if((m = key.match(regex))) {
                var env = localStorage.getItem(key);
                env = openEnvelope(env);
                if(env != null && env.expires !== 0 && env.expires < now)
                    matches.push(m[1]);
            }
        }

        //cant trigger events (via removeItem) when accessing cache, so do it here in a separate loop
        for(i in matches) {
            removeItem(matches[i]);
            if(localStorage.getItem(lockKey) !== UUID) {
                //console_log("aborted due to immediate process");
                return;
            }
        }
    };

    //todo: find a way to make this efficient when a large number of cache entries exist
    var freeSpace = function(){
        var lockKey = makeLock();
        try {
            localStorage.setItem(lockKey,UUID);
        } catch(err) {
            return;
        }

        var i,lastAccess = [];
        var ns = options.namespace.replace('.','\.');
        var regex = new RegExp("^"+systemVersion+"_"+ns+"_(.*)$");

        //get all last accessed timestamps
        for(i = 0; i < localStorage.length; i++) {
            var m,key = localStorage.key(i);
            if((m = key.match(regex))) {
                var env = localStorage.getItem(key);
                env = openEnvelope(env);
                lastAccess.push([m[1],env.lastAccessed]);
            }
        }

        //sort by oldest first
        lastAccess.sort(function(a,b) {
            return a[1] < b[1] ? -1 : 1;
        });

        //remove the X% oldest accessed entries
        var limit = Math.floor(lastAccess.length * (options.evictionThreshold / 100.0));
        for(i = 0; i < limit && i < lastAccess.length; i++) {
            removeItem(lastAccess[i][0]);
            if(localStorage.getItem(lockKey) !== UUID) {
                //console_log("aborted due to immediate process");
                return;
            }
        }

        localStorage.removeItem(lockKey);
    };

    return {
        get : getItem,
        set : setItem,
        put : setItem,
        remove : removeItem,
        _dump : dumpCache,
        _evictExpired : evictExpired,
        _freeSpace : freeSpace,
        init : init
    }

})();