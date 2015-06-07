'use strict';

angular.module('adf.widget.cdr', ['adf.provider', 'highcharts-ng', 'colorpicker.module', 'toggle-switch'])
  .config(function(dashboardProvider){
    var widget = {
      templateUrl: '{widgetsPath}/cdr/src/view.html',
      reload: true,
      resolve: {
        /* @ngInject */
        CDRData: function(cdrSrvice, config){
          if (config.chartSeries){
            return cdrSrvice.getData(config.chartSeries);
          }
        }
      },
      edit: {
        templateUrl: '{widgetsPath}/cdr/src/edit.html'
      }
    };

    dashboardProvider
      .widget('CDRController', angular.extend({
        title: 'CDR',
        description: 'CDR',
        controller: 'CDRCtrl'
        }, widget));

  });
