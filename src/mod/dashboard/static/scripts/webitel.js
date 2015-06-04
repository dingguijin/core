'use strict';

angular.module('webitel', [
  'adf', 'adf.structures.base', 'adf.widget.news',
  /*'adf.widget.randommsg',*/ 'adf.widget.weather',
  'adf.widget.markdown', 'adf.widget.linklist',
  'adf.widget.github', 'adf.widget.accounts',
  'adf.widget.clock', 'LocalStorageModule',
  'board-01', 'board-02', 'board-03',
  'board-04', 'ngRoute' , 'auth', 'webitelService'
])
.config(function(dashboardProvider, $routeProvider, localStorageServiceProvider, USER_ROLES){
  dashboardProvider.widgetsPath('widgets/');
  localStorageServiceProvider.setPrefix('adf');

  $routeProvider.when('/home/login', {
    templateUrl: 'partials/auth.html',
    controller: 'authCtrl'
  }).when('/home/01', {
    templateUrl: 'partials/sample.html',
    controller: 'board01Ctrl'
  })
  .when('/home/02', {
    templateUrl: 'partials/sample.html',
    controller: 'sample02Ctrl'
  })
  .when('/home/03', {
    templateUrl: 'partials/sampleWithFilter.html',
    controller: 'sample03Ctrl'
  })
  .when('/home/04', {
    templateUrl: 'partials/sample.html',
    controller: 'sample04Ctrl'
  });

  $routeProvider.otherwise({
    redirectTo: '/home/01'
  });

})
.controller('ApplicationController', function (localStorageService, $location, Session) {
      var session = localStorageService.get('session');
      if (session && session['expires'] > new Date().getTime()) {
        Session.create(session);
      } else {
        $location.path('/home/login')
      }
})
.controller('navigationCtrl', function($scope, $location, AuthService, webitelService){

  $scope.navCollapsed = true;

  $scope.toggleNav = function(){
    $scope.navCollapsed = !$scope.navCollapsed;
  };

  $scope.logout = function () {
    AuthService.logout();
  };

  $scope.$on('$routeChangeStart', function() {
    $scope.navCollapsed = true;
  });

  $scope.navClass = function(page) {
    var currentRoute = $location.path().substring(1) || 'Sample 01';
    return page === currentRoute || new RegExp(page).test(currentRoute) ? 'active' : '';
  };

})
.factory('AuthService', function ($http, Session, localStorageService) {
  return {
    login: function (credentials) {
      return $http
          .post('/login', credentials)
          .then(function (res) {
            res.data['password'] = credentials.password;
            Session.create(res.data);
            localStorageService.set('session', {
              key: Session.id,
              username: Session.userName,
              expires: Session.expires,
              role: Session.userRole,
              token: Session.token,
              password: Session.password
            });
          });
    },
    
    logout: function () {
      return $http
          .post('/logout', {
            x_key: Session.id,
            access_token: Session.token
          })
          .then(function (res) {
            Session.destroy();
          });
    },
    isAuthenticated: function () {
      return !!Session.userId;
    },
    isAuthorized: function (authorizedRoles) {
      if (!angular.isArray(authorizedRoles)) {
        authorizedRoles = [authorizedRoles];
      }
      return (this.isAuthenticated() &&
      authorizedRoles.indexOf(Session.userRole) !== -1);
    }
  };
})
.service('Session', function ($location, localStorageService) {
  this.create = function (option) {
    this.id = option['key'];
    this.expires = option['expires'];
    this.userId = option['key'];
    this.userRole = option['role'];
    this.token = option['token'];
    this.userName = option['username'];
    this.password = option['password'];

    var path = $location.$$url;
    if (path == "/home/login") {
      path = '/home/01';
    };
    $location.path(path);
  };
  this.destroy = function () {
    this.id = null;
    this.userId = null;
    this.userRole = null;
    this.expires = null;
    this.token = null;
    this.userName = null;
    this.password = null;
    $location.path("/home/login");
    localStorageService.remove('session')
  };
  return this;
});
