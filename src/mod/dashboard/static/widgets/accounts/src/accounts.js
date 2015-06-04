'use strict';

angular.module('adf.widget.accounts', ['adf.provider', 'highcharts-ng'])
  .config(function(dashboardProvider){
    // template object for github widgets
    var widget = {
      templateUrl: '{widgetsPath}/accounts/src/view.html',
      reload: false,
      edit: {
        templateUrl: '{widgetsPath}/accounts/src/edit.html'
      }
    };

    // register github template by extending the template object
    dashboardProvider
      .widget('accountsGrid', angular.extend({
        title: 'Account Status',
        description: 'Display accounts status list',
        controller: 'accountsGridCtrl'
        }, widget))

  });
