module.exports.WebitelCommandTypes = {
    Call: 'call', //+
    Hangup: 'hangup', //+
    Park: '//api uuid_park',
    ToggleHold: 'toggle_hold', //+
    Hold: 'hold', //+
    UnHold: 'unhold', //+
    Transfer: 'transfer', //+
    AttendedTransfer: 'attended_transfer', //+
    Bridge: 'bridge', //+
    Dtmf: 'dtmf', //+
    Broadcast: 'broadcast', //+
    AttXfer: 'att_xfer', //+
    AttXfer2: 'att_xfer2',
    AttXferBridge: 'att_xfer_bridge',
    AttXferCancel: 'att_xfer_cancel',
    Auth: 'auth', // +-
    GetVar: 'getvar', // +-
    SetVar: 'setvar', // +-

    // SYS Api
    Domain: {
        List: 'api domain list', //+
        Create: 'api domain create', //+
        Remove: 'api domain remove' //+
    },
    Account: {
        List: 'api account list', //+
        Create: 'api account create', //+
        Change: 'api account change', // +
        Remove: 'api account remove' // +
    },
    Device: {
        List: 'api device list', //+
        Create: 'api device create', //+
        Change: 'api device change', //+
        Remove: 'api device remove' //+
    },
    ListUsers: 'api list_users',
    SendCommandWebitel: 'sendCommandWebitel',

    // Favbet
    Login: 'login',
    Logout: 'logout',
    ReloadAgents: 'reloadAgents'
};

module.exports.RootName = 'root';