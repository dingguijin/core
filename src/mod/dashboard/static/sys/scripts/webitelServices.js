angular.module('webitelService', ['adf'])
    .service('webitelService', function ($location, Session) {
        var srv = $location.$$absUrl.split('dashboard')[0].replace(/http(s)?/, 'ws$1');

        this.socket = new Webitel({
            server: srv,
            account: Session.userName,
            secret: Session.password,
        //    domain: config.domain,
        //    reconnect: -1,
            debug: true
        });

        this.socket.connect();

        return this;
    });