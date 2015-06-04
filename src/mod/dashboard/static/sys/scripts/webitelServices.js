angular.module('webitelService', ['adf'])
    .value('WebitelAgentStatus', {
        LoggedOut: "Logged Out", // Cannot receive queue calls.
        Available: "Available", // Ready to receive queue calls.
        AvailableOnDemand: "Available (On Demand)", // State will be set to 'Idle' once the call ends (not automatically set to 'Waiting').
        OnBreak: "On Break" // Still Logged in, but will not receive queue calls.
    })
    .value('WebitelAgentState', {
        Receiving: "Receiving",
        Waiting: "Waiting", // Ready to receive calls.
        Idle: "Idle", // Does nothing, no calls are given.
        InAQueueCall: "In a queue call" // Currently on a queue call.
    })
    .factory('webitelService', function ($rootScope, $location, Session, WebitelAgentStatus, WebitelAgentState) {
        var srv = $location.$$absUrl.split('dashboard')[0].replace(/http(s)?/, 'ws$1');
        if (!this.socket) {
            this.socket = new Webitel({
                server: srv,
                account: Session.userName,
                secret: Session.password,
                //    domain: config.domain,
                //    reconnect: -1,
                debug: true
            });

            this.socket.onServerEvent('USER_STATE', function (user) {
                $rootScope.$emit('USER_STATE', user)
            }, true);

            this.socket.onServerEvent('ACCOUNT_STATUS', function (user) {
                $rootScope.$emit('ACCOUNT_STATUS', user)
            }, true);

            this.socket.onServerEvent('ACCOUNT_OFFLINE', function (user) {
                $rootScope.$emit('ACCOUNT_OFFLINE', user)
            }, true);

            this.socket.onServerEvent('ACCOUNT_ONLINE', function (user) {
                $rootScope.$emit('ACCOUNT_ONLINE', user)
            }, true);

            this.socket.onServerEvent('USER_CREATE', function (user) {
                $rootScope.$emit('USER_CREATE', user)
            }, true);

            this.socket.onServerEvent('USER_DESTROY', function (user) {
                $rootScope.$emit('USER_DESTROY', user)
            }, true);

            this.socket.onServerEvent('CC_AGENT_STATUS', function (user) {
                if ([WebitelAgentStatus.Available, WebitelAgentStatus.AvailableOnDemand,
                        WebitelAgentStatus.LoggedOut].indexOf(user['CC-Agent-Status']) > -1) {
                    user['Account-Status'] = 'NONE'
                } else {
                    user['Account-Status'] = 'DND'
                }
                $rootScope.$emit('ACCOUNT_STATUS', user)
            }, true);

            this.socket.onServerEvent('CC_AGENT_STATE', function (user) {
                if (user['CC-Agent-State'] == WebitelAgentState.Waiting) {
                    user['User-State'] = 'ONHOOK'
                }
                else {
                    user['User-State'] = 'ISBUSY'
                }
                $rootScope.$emit('USER_STATE', user)
            }, true);
            this.socket.connect();
        };

        return this.socket;
    });