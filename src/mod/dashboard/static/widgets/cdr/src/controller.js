'use strict';

angular.module('adf.widget.cdr')
  .controller('CDRCtrl', function($scope, config, CDRData){

      function getArrayFromAttribute(attr) {
        var res = [];
        angular.forEach(CDRData, function (data) {
          if (data[attr]) {
            res.push(data[attr]);
          };
        });
        return res;
      };

      var _chart = $scope.chartConfig = {
        options: {
          chart: {
            type: config.chartType
          },
          plotOptions: {
            series: {
              stacking: config.chartStack
            },
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              startAngle: -180,
              endAngle: 90,
              dataLabels: {
                //enabled: false,
                //format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                //style: {
                //  color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                //},
                //connectorColor: 'silver'
              }
            }
          }
        },
        yAxis: config['_c_yAxis'],
        xAxis: {
          categories: []
        },
        series: config.chartSeries,
        title: {
          text: config.chartTitle
        }
      };

      angular.forEach(config.chartSeries, function (ser) {
        ser.data = [];
        var xDM = ser['_c_xAxis'] && ser['_c_xAxis'].dataMarker;
        var yDM = ser['_c_yAxis'] && ser['_c_yAxis'].dataMarker;

        if (ser.type == 'pie') {
          var currentX = '';
          var currentY = '';
          //ser.center = [100, 0];
          //ser.size = 100;
          angular.forEach(ser.srvData, function (point) {
            currentX = point;
            xDM.split('.').forEach(function(token) {
              currentX = currentX && currentX[token];
            });

            currentY = point;
            yDM.split('.').forEach(function(token) {
              currentY = currentY && currentY[token];
            });

            ser.data.push({
              "name": currentX,
              "y": currentY
            });
          });
        } else {
          var currentX = '';
          var currentY = '';

          angular.forEach(ser.srvData, function (point) {
            currentX = point;
            xDM.split('.').forEach(function(token) {
              currentX = currentX && currentX[token];
            });

            currentY = point;
            yDM.split('.').forEach(function(token) {
              currentY = currentY && currentY[token];
            });

            ser.data.push(currentX);
            _chart.xAxis.categories.push(currentY)
          });
        }

      });

      $scope.updateData = function () {
        //_chart.series[0].data[0]++;
        $scope.chartConfig = _chart;
      };

      console.log(_chart)

      //setInterval(function () {
      //
      //}, 1000)

  })
    .controller('selectCHartTypeCtrl', function ($scope) {
      $scope.chartTypes = [
        {"id": "line", "title": "Line"},
        {"id": "spline", "title": "Smooth line"},
        {"id": "area", "title": "Area"},
        {"id": "areaspline", "title": "Smooth area"},
        {"id": "column", "title": "Column"},
        {"id": "bar", "title": "Bar"},
        {"id": "pie", "title": "Pie"},
        {"id": "scatter", "title": "Scatter"}
      ];

      $scope.chartStack = [
        {"id": '', "title": "No"},
        {"id": "normal", "title": "Normal"},
        {"id": "percent", "title": "Percent"}
      ];

      $scope.dashStyles = [
        {"id": "Solid", "title": "Solid"},
        {"id": "ShortDash", "title": "ShortDash"},
        {"id": "ShortDot", "title": "ShortDot"},
        {"id": "ShortDashDot", "title": "ShortDashDot"},
        {"id": "ShortDashDotDot", "title": "ShortDashDotDot"},
        {"id": "Dot", "title": "Dot"},
        {"id": "Dash", "title": "Dash"},
        {"id": "LongDash", "title": "LongDash"},
        {"id": "DashDot", "title": "DashDot"},
        {"id": "LongDashDot", "title": "LongDashDot"},
        {"id": "LongDashDotDot", "title": "LongDashDotDot"}
      ];

      $scope.removeSeries = function (id) {
        var seriesArray = $scope.$parent.config.chartSeries;
        seriesArray.splice(id, 1)
      };
      
      $scope.addSeries = function () {
        var seriesArray = $scope.$parent.config.chartSeries;
        seriesArray.push({"name": "Series " + seriesArray.length, "data": [], type: ""})
      };
    })
;
