'use strict';
angular.module('adf.widget.accounts')
  .controller('accountsGridCtrl', function($scope){

  })
    .directive("keditor", function (webitelService, $rootScope, Domain) {
        return {
            template:  function (el, attr) {
                return '<table class="display" cellspacing="0" width="100%"></table>';
            },
            replace: true,
            scope: {
            },
            link: function(scope, element, attributes) {
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
                webitelService.userList(Domain, function (res) {
                    try {
                        var data = JSON.parse(res.response.response),
                            result = [];
                        angular.forEach(data, function(item){
                            result.push(item);
                        });
                        $table.dataTable({
                            "data": result,
                            "paging": false,
                            "searching": false,
                            "ordering": true,
                            "iTabIndex": 0,
                            "aaSorting": [[1, "desc"]],
                            "aoColumns": [
                                {
                                    "mDataProp": "id",
                                    "className": "cell-id",
                                    "title": "Number"
                                },
                                {
                                    "mDataProp": "online",
                                    "sWidth": "10%",
                                    "className": "cell-online",
                                    "title": "Online",
                                    'mRender': function (data, type, row, sett) {
                                        return '<span class="label label-table ' + ((data.toString() == 'true')
                                            ? 'account-online'
                                            : 'account-offline')
                                            + '">' + data + '</span>'
                                    }
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

                    } catch (e) {

                    }
                });
            }
        }
    });
