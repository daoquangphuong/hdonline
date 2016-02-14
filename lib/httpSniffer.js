var chrome = require('chrome');
var Components = chrome.components;

// PourBico

function Listener(sniffer) {
    this.originalListener = null;
    this.receivedData = [];   // array for incoming data.
    this.sniffer = sniffer;
}

Listener.prototype = {

    onDataAvailable: function (request, context, inputStream, offset, count) {
        try { //if modify -> copy response to this.receivedData
            if (this.sniffer.response.mod) {
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
                return;
            }
            //if new
            if (this.sniffer.response.new) {
                return;
            }
            //other
            this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), offset, count);
        } catch (e) {
            console.error(e);
        }
    },

    onStartRequest: function (request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function (request, context, statusCode) {
        try {
            var newResponseSource;
            if (this.sniffer.response.mod) {
                newResponseSource = this.sniffer.response.mod(this.receivedData.join(''));
            }
            else if (this.sniffer.response.new) {
                newResponseSource = this.sniffer.response.new();
            }
            else {
                return this.originalListener.onStopRequest(request, context, statusCode);
            }
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
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Components.interfaces.nsIStreamListener) ||
            aIID.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
};

var Sniffer = function (sniffer, subject, topic, data) {
    var self = this;
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
    if (topic == "http-on-examine-response") {
        var newListener = new Listener(sniffer);
        subject.QueryInterface(Components.interfaces.nsITraceableChannel);
        newListener.originalListener = subject.setNewListener(newListener);
    }
};

var httpRequestObserver =
{
    sniffer: [
        //{
        //    link: 'http://www.hayhaytv.vn/', // string or regex
        //    break: true,
        //    response: { // just one method effect
        //        new: function () {
        //            return 'new response';
        //        },
        //        mod: function (data) {
        //            return 'modify response data'
        //        }
        //    }
        //}
    ],

    observe: function (subject, topic, data) {
        var self = this;
        var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);
        var requestURL = subject.URI.spec;
        if(requestURL.indexOf('httpSniffer=bypass') > -1) return;
        var is_match = false;
        for (var i = 0; i < self.sniffer.length; i++) {
            var sniffer = self.sniffer[i];
            if (sniffer.regex) {
                var regex = new RegExp(sniffer.regex.pattern, sniffer.regex.option);
                is_match = requestURL.match(regex);
            }
            if (sniffer.link) {
                is_match = requestURL == sniffer.link;
            }
            if (is_match) {
                new Sniffer(sniffer, subject, topic, data);
                if (sniffer.break) {
                    break;
                }
            }
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
