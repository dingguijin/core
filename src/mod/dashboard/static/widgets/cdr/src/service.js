'use strict';

angular.module('adf.widget.cdr')
    .service('cdrPost', function ($q, $http, Session) {
        return {
            postAggregate: function (query) {
                var deferred = $q.defer()
                    ;
                query = eval(query);
                var postData = {
                    "aggr": query,
                    "x_key": Session.id, // "da8feb13-a9c4-48fd-b60a-f5e156197cd7"
                    "access_token": Session.token //"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE0MzQxMTY4OTUxNjl9.NUvwZfrcu8zLNV3BfBigkMrmjfAKAFv8cpxAjWePNpU" //
                };
                postData = JSON.stringify(postData);
                $http
                    .post('http://10.10.10.25:10021/api/v2/cdr/aggregates ', postData)
                    //.post('/api/v2/cdr/aggregates', postData)
                    .then(function (res) {
                        deferred.resolve(res.data);
                    });
                return deferred.promise;
            }
        }
    })
    .service('cdrSrvice', function($q, cdrPost, Session){
        return {
            getData: function(series){
                var deferred = $q.defer()
                    ;

                if (series && series.length > 0) {
                    var q = [];
                    angular.forEach(series, function (item) {
                        q.push(cdrPost.postAggregate(item.query));
                    });

                    $q.all(q)
                        .then(function (res) {
                            angular.forEach(series, function (item, inx) {
                                item.srvData = res[inx];
                            });
                            deferred.resolve(res);
                        });//the error case is handled automatically
                } else {

                };

                return deferred.promise;
            }
        };
    });
