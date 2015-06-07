'use strict';

angular.module('adf.widget.cdr', ['adf.provider', 'highcharts-ng'])
  .config(function(dashboardProvider){
    // template object for github widgets
    var widget = {
      templateUrl: '{widgetsPath}/cdr/src/view.html',
      reload: true,
      resolve: {

      },
      edit: {
        templateUrl: '{widgetsPath}/cdr/src/edit.html'
      }
    };

    // register github template by extending the template object
    dashboardProvider
      .widget('CDRController', angular.extend({
        title: 'CDR',
        description: 'CDR',
        controller: 'CDRCtrl'
        }, widget));

  });
