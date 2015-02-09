var AsyncQueue = function(){

    //todo: USE JQUERY 1.5 DEFERRED OBJECTS FOR THIS

    this.queue = [];
    this.running = false;
};

AsyncQueue.prototype = {

    push : function(callback) {
        this.queue.push(callback);
        if(this.queue.length == 1)
            this._processQueue();
    },

    _processQueue : function() {
        var me = this;
        if(this.queue.length > 0 && !this.running) {
            this.running = true;
            var func = this.queue.shift();
            setTimeout(function(){
                func(function(){
                    me.running = false;
                    me._processQueue.call(me);
                });
            },1);
        }
    }

};
