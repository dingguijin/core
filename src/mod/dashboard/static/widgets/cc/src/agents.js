'use strict';

angular.module('adf.widget.cc.agents', ['adf.provider'])
  .config(function(dashboardProvider){
    // template object for github widgets
    var widget = {
      templateUrl: '{widgetsPath}/cc/src/view.html',
      reload: false,
      edit: {
        templateUrl: '{widgetsPath}/cc/src/edit.html'
      }
    };

    // register github template by extending the template object
    dashboardProvider
      .widget('agentsGrid', angular.extend({
        title: 'Agents Status',
        description: 'Display agents status list',
        controller: 'agentsGridCtrl'
        }, widget))

  });
