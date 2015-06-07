/* *
 * The MIT License
 *
 * Copyright (c) 2015, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

angular.module('board-01', ['adf', 'LocalStorageModule'])
.controller('board01Ctrl', function($scope, localStorageService, Session, $location){
  if (!Session.id) {
    $location.path('/home/login');
    return;
  }
  var name = 'sample-01';
  var model = localStorageService.get(name);
  if (!model) {
    // set default model for demo purposes
    model = {
      "title": "Board 1",
      "structure": "4-8",
      "rows": [{
        "columns": [{
          "styleClass": "col-md-4",
          "widgets": [{
            "type": "accountsGrid",
            "config": {

            },
            "title": "Account Status",
            "wid": 1
          },
            {
              "type": "CDRController",
              "config": {
                "title": "Operators",
                "query": "[\n\t{\"$match\": {\"variables.effective_caller_id_name\": {\"$ne\": null}}},\n\t{\"$project\": {\"variables.effective_caller_id_name\": 1, \"variables.billsec\": 1}},\n\t{\"$group\": {\"_id\": \"$variables.effective_caller_id_name\", \"total\": {\"$sum\": \"$variables.billsec\"}}}\n]",
                "chartTitle": "igor",
                "timeUpdate": "2",
                "chartType": "bar"
              },
              "title": "CDR",
              "wid": 1
            }],
          "cid": 1
        },
          {
            "styleClass": "col-md-8",
            "widgets": [{
              "type": "CDRController",
              "config": {
                "query": "[\n\t{\"$match\": {\"variables.effective_caller_id_name\": {\"$ne\": null}}},\n\t{\"$project\": {\"variables.effective_caller_id_name\": 1, \"variables.billsec\": 1}},\n\t{\"$group\": {\"_id\": \"$variables.effective_caller_id_name\", \"total\": {\"$sum\": \"$variables.billsec\"}}}\n]",
                "chartTitle": "dasda",
                "chartType": "pie"
              },
              "title": "CDR",
              "wid": 1
            }],
            "cid": 2
          }]
      }]
    };
  };

  $scope.name = name;
  $scope.model = model;
  $scope.collapsible = true;
  $scope.maximizable = true;

  $scope.$on('adfDashboardChanged', function (event, name, model) {
    localStorageService.set(name, model);
  });
});
