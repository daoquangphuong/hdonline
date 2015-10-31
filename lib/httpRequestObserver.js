var chrome = require('chrome');
var Components = chrome.components;

function PourBicoTracingListener() {
    this.originalListener = null;
    this.receivedData = [];   // array for incoming data.
}

PourBicoTracingListener.prototype = {

    onDataAvailable: function (request, context, inputStream, offset, count) {
        var binaryInputStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
        var storageStream = Components.classes["@mozilla.org/storagestream;1"].createInstance(Components.interfaces.nsIStorageStream);
        var binaryOutputStream = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);

        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

        // copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);

        binaryOutputStream.writeBytes(data, count);

        //this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function (request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function (request, context, statusCode) {
        try {
            var newResponseSource = this.receivedData.join('');
            newResponseSource = newResponseSource.replace(/<Ad>[\s\S]+<\/Ad>/, '');

            var channel = request.QueryInterface(Components.interfaces.nsIHttpChannel);

            var storageStream = Components.classes["@mozilla.org/storagestream;1"].createInstance(Components.interfaces.nsIStorageStream);
            var binaryOutputStream = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);

            storageStream.init(8192, newResponseSource.length, null);
            binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));


            binaryOutputStream.writeBytes(newResponseSource, newResponseSource.length);

            this.originalListener.onStartRequest(channel, context);
            this.originalListener.onDataAvailable(channel, context, storageStream.newInputStream(0), 0, newResponseSource.length);
            this.originalListener.onStopRequest(channel, context, statusCode);
        } catch (e) {
            console.error(e);
        }
        //this.originalListener.onStopRequest(request, context, statusCode);
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Components.interfaces.nsIStreamListener) ||
            aIID.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
};


var GM_class = function (httpChannel) {
    var self = this;
    self.httpChannel = httpChannel;
};

GM_class.prototype = {
    get iOService() {
        return Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    },
    getRequestHeaders: function () {
        var self = this;
        var oReqHeaders = {};
        self.httpChannel.visitRequestHeaders(function (name, value) {
            oReqHeaders[name] = value;
        });
        return oReqHeaders;
    },
    getResponseHeaders: function () {
        var self = this;
        var oRespHeaders = {};
        self.httpChannel.visitResponseHeaders(function (name, value) {
            oRespHeaders[name] = value;
        });
        return oRespHeaders;
    },
    redirectTo: function (aURL, aOriginCharset, aBaseURI) {
        var self = this;
        var URI = self.iOService.newURI(aURL, aOriginCharset, aBaseURI);
        self.httpChannel.redirectTo(URI);
    }
};

var httpRequestObserver =
{
    observe: function (subject, topic, data) {
        var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);
        var GM = new GM_class(httpChannel);
        var requestURL = subject.URI.spec;
        if (topic == "http-on-modify-request") {
            //var req_resource_mat = requestURL.match(/https?:\/\/[^\/]+hayhaytv[^\/]+\/req_resource\/(.*)/);
            //if (req_resource_mat) {
            //    GM.redirectTo(requestResource.getDataURI(req_resource_mat[1]), null, null);
            //}
            //if (requestURL.match(/^https?:\/\/[^\/]+hayhaytv[^\/]+/i)) {
            //    var request_header = GM.getRequestHeaders();
            //    if(request_header['Accept'].indexOf('image/') > -1){
            //        if(requestURL.indexOf('bypass=true') < 0){
            //            httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
            //        }
            //    }
            //}
            //if(requestURL.match(/^https?:\/\/[^\/]+hayhaytv[^\/]+/)){
            //    httpChannel.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0', true);
            //}
            //console.log('REQUEST');
            //console.log(JSON.stringify(GM.getRequestHeaders(), null, 1));
        }
        else if (topic == "http-on-examine-response") {
            http://hdonline.vn/ads/
            if (requestURL.match(/http:\/\/hdonline\.vn\/(frontend\/)?(ads|adv)\/(video|overlay)\?/)) {
                var newListener = new PourBicoTracingListener();
                subject.QueryInterface(Components.interfaces.nsITraceableChannel);
                newListener.originalListener = subject.setNewListener(newListener);
            }
            //if (requestURL.match(/^https?:\/\/www.hayhaytv.vn\/?$/i)) {
            //    var newListener = new PourBicoTracingListener();
            //    subject.QueryInterface(Components.interfaces.nsITraceableChannel);
            //    newListener.originalListener = subject.setNewListener(newListener);
            //}
            //console.log('RESPONSE');
            //console.log(JSON.stringify(GM.getResponseHeaders(), null, 1));
            //httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
        }
    },

    get observerService() {
        return Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    },

    register: function () {
        this.observerService.addObserver(this, "http-on-modify-request", false);
        this.observerService.addObserver(this, "http-on-examine-response", false);

    },

    unregister: function () {
        this.observerService.removeObserver(this, "http-on-modify-request");
        this.observerService.removeObserver(this, "http-on-examine-response");

    }
};


module.exports = httpRequestObserver;