var self = require('sdk/self');

var httpSniffer = require('./lib/httpSniffer');
// to by pass using query httpSniffer=bypass;
//httpSniffer.sniffer.push({
//    regex: {pattern: 'https?:\/\/blueserving\.com\/vast.xml', option: 'im'},
//    break: true,
//    response: {
//        new: function () {
//            return self.data.load('vast.xml');
//        }
//    }
//});
httpSniffer.sniffer.push({
    regex: {pattern: 'https?:\/\/hdonline\.vn\/', option: 'im'},
    break: true,
    response: {
        mod: function (data) {
            data = data.replace(/isVip = false;/g, 'isVip = true;');
            data = data.replace(/"uvip":false/g, '"uvip":true');
            data = data.replace(/"vads":true/g, '"vads":false');
            return data;
        }
    }
});
httpSniffer.register();
