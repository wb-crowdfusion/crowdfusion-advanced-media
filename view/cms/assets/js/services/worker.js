function get(url) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return xhr.responseText;
    } catch (e) {
        return null; // turn all errors into empty results
    }
}

self.addEventListener('message', function(e) {
    self.postMessage('alive');
}, false);

