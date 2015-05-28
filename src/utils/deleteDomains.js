/**
 * Created by Admin on 27.05.2015.
 */


var fs = require('fs');
var request = require('request');
var URI = '';
var BASE_AUTH = '';

var domains = [];
var deletedDomain = [];
var notFoundDomain = [];

fs.readFile('./src/util/domains.txt', function (err, data) {
    var str = data.toString();
    ;
    str.split('\n').forEach(function (item) {
        item = item.trim();
        if (item != '') {
           domains.push(item);
        }
    });
    
    var deleteDomain = function (name, cb) {
        request({
            "method": "DELETE",
            "uri": URI + name,
            headers: {
                'authorization': BASE_AUTH
            }
        }, function (err, response, body) {
            if (body && body.indexOf('+OK') == 0) {
                deletedDomain.push(name);
            } else {
                notFoundDomain.push(name);
            };

            cb();
        });
    };

    var i = 0;
    var len = domains.length;
    var processDelete = function () {
        if (i == len){
            console.log('--- END ---');
            console.log(deletedDomain.length);
            console.log(notFoundDomain.length);
            var bigStr = 'DELETED domain:\n';
            deletedDomain.forEach(function(d) {
                bigStr += d + '\n';
            });
            bigStr += '\n\nNOT deleted domain:\n';
            notFoundDomain.forEach(function(d) {
                bigStr += d + '\n';
            });
            fs.writeFile('./src/util/log.txt', bigStr, function (err) {
                if (err) throw err;
                console.log('It\'s saved!');
            });
            return;
        };

        console.log(domains[i] + ' - del');
        deleteDomain(domains[i], processDelete);
        i++;
    };

    processDelete();
    //console.dir(domains);
});