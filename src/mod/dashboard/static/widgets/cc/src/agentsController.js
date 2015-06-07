'use strict';
angular.module('adf.widget.cc.agents')
  .controller('agentsGridCtrl', function($scope){

  })
    .directive("agents", function (webitelService, $rootScope, $http, Domain) {
        return {
            template:  function (el, attr) {
                return '<table class="display" cellspacing="0" width="100%"></table>';
            },
            replace: true,
            scope: {
            },
            link: function(scope, element, attribute) {
                var $table = $(element[0]),
                    _events = []
                    ;
                scope.$on("$destroy", function () {
                    var _fn;
                    for (var key in _events) {
                        _fn = _events[key];
                        delete _events[key];
                        _fn();
                    };
                });

                $http.get('/api/v2/callcenter/agents?domain=' + Domain).
                    success(function(res, status, headers, config) {
                        if (status === 200) {
                            var result = [];
                            angular.forEach(res.data, function(item){
                                result.push({
                                    "id": item['name'].replace(/@.*/, ''),
                                    "talk_time": item['talk_time'],
                                    "calls_answered": item['calls_answered'],
                                    "status": item['status'],
                                    "state": item['state']
                                });
                            });
                            $table.dataTable({
                                "data": result,
                                "paging": false,
                                "searching": false,
                                "ordering": true,
                                "iTabIndex": 0,
                                "aaSorting": [[0, "desc"]],
                                "aoColumns": [
                                    {
                                        "mDataProp": "id",
                                        "className": "cell-id",
                                        "title": "Agent"
                                    },
                                    {
                                        "mDataProp": "talk_time",
                                        "title": "Talk time"
                                    },
                                    {
                                        "mDataProp": "calls_answered",
                                        "title": "Answered"
                                    },
                                    {
                                        "mDataProp": "state",
                                        "title": "State",
                                        "className": "cell-state",
                                        "sWidth": "10%",
                                        'mRender': function (data, type, row, sett) {
                                            var statusClass = '';
                                            switch (data) {
                                                case "ONHOOK":
                                                    statusClass = 'onhook';
                                                    break;
                                                case "ISBUSY":
                                                    statusClass = 'isbusy';
                                                    break;
                                                case "NONREG":
                                                    statusClass = 'nonreg';
                                                    break;
                                            }
                                            return '<span class="label label-table account-status ' + statusClass + '">' + data + '</span>'
                                        }
                                    },
                                    {
                                        "mDataProp": "status",
                                        "title": "Status",
                                        "className": "cell-status",
                                        "sWidth": "10%",
                                        'mRender': function (data, type, row, sett) {
                                            var statusClass = '';
                                            switch (data) {
                                                case "DND":
                                                    statusClass = 'isbusy';
                                                    break;
                                                case "NONE":
                                                    statusClass = 'nonreg';
                                                    break;
                                            }
                                            return '<span class="label label-table account-status ' + statusClass + '">' + data + '</span>'
                                        }
                                    }
                                ]
                            });

                            var aoColumns = $table.fnSettings().aoColumns,
                                colSett = {}
                                ;

                            for (var key in aoColumns) {
                                colSett[aoColumns[key]['mData']] = key;
                            };

                            var handleUser = function (event, user) {
                                var rowTable = $table.find("td:contains('" + (user['User-ID'] || user['Account-User']) + "')")[0];
                                if (rowTable) {
                                    var colName = '';
                                    var attr = '';
                                    var position = $table.fnGetPosition(rowTable);
                                    switch (event.name) {
                                        case 'USER_STATE':
                                            colName = 'state';
                                            attr = user['User-State'];
                                            break;
                                        case 'ACCOUNT_STATUS':
                                            colName = 'status';
                                            attr = user['Account-Status'];
                                            break;
                                        case 'ACCOUNT_OFFLINE':
                                            colName = 'online';
                                            attr = false;
                                            break;
                                        case 'ACCOUNT_ONLINE':
                                            colName = 'online';
                                            attr = true;
                                            break;
                                        case 'USER_DESTROY':
                                            $table.fnDeleteRow($(rowTable).parent());
                                            return;
                                        default :
                                            return;
                                    };
                                    $table.fnUpdate(attr, position, colSett[colName]);
                                } else if (event.name == 'USER_CREATE') {
                                    $table.fnAddData({
                                        id: user['User-ID'],
                                        online: false,
                                        status: 'NONE',
                                        state: 'NONREG'
                                    })
                                };
                            };
                            _events.push($rootScope.$on('USER_STATE', handleUser));
                            _events.push($rootScope.$on('ACCOUNT_STATUS', handleUser));

                            _events.push($rootScope.$on('ACCOUNT_OFFLINE', handleUser));
                            _events.push($rootScope.$on('ACCOUNT_ONLINE', handleUser));

                            _events.push($rootScope.$on('USER_CREATE', handleUser));
                            _events.push($rootScope.$on('USER_DESTROY', handleUser));
                        } else {
                            // TODO ERROR
                        }
                    }).
                    error(function(data, status, headers, config) {
                        // called asynchronously if an error occurs
                        // or server returns response with an error status.
                    });


                webitelService.userList('10.10.10.144', function (res) {
                    try {
                        var data = JSON.parse(res.response.response),
                            result = [];
                        angular.forEach(data, function(item){
                            if (item['agent'] == 'true')
                                result.push(item);
                        });


                    } catch (e) {

                    }
                });
            }
        }
    });
