module.exports.WebitelCommandTypes = {
    Call: {
        name: 'call',
        perm: 0
    }, //+
    Hangup: {
        name: 'hangup',
        perm: 0
    }, //+
    Park: {
        name: '//api uuid_park',
        perm: 0
    },
    ToggleHold: {
        name: 'toggle_hold',
        perm: 0
    }, //+
    Hold: {
        name: 'hold',
        perm: 0
    }, //+
    UnHold: {
        name: 'unhold',
        perm: 0
    }, //+
    Transfer: {
        name: 'transfer',
        perm: 0
    }, //+
    AttendedTransfer: {
        name: 'attended_transfer',
        perm: 0
    }, //+
    Bridge: {
        name: 'bridge',
        perm: 0
    }, //+
    Dtmf: {
        name: 'dtmf',
        perm: 0
    }, //+
    Broadcast: {
        name: 'broadcast',
        perm: 0
    }, //+
    AttXfer: {
        name: 'att_xfer',
        perm: 0
    }, //+
    AttXfer2: {
        name: 'att_xfer2',
        perm: 0
    },
    AttXferBridge: {
        name: 'att_xfer_bridge',
        perm: 0
    },
    AttXferCancel: {
        name: 'att_xfer_cancel',
        perm: 0
    },
    Auth: {
        name: 'auth',
        perm: 0
    }, // +-
    GetVar: {
        name: 'getvar',
        perm: 0
    }, // +-
    SetVar: {
        name: 'setvar',
        perm: 0
    }, // +-

    // SYS Api
    Domain: {
        List: {
            name: 'api domain list',
            perm: 2
        }, //+
        Create: {
            name: 'api domain create',
            perm: 2
        }, //+
        Remove: {
            name: 'api domain remove',
            perm: 2
        } //+
    },
    Account: {
        List: {
            name: 'api account list',
            perm: 0
        }, //+
        Create: {
            name: 'api account create',
            perm: 1
        }, //+
        Change: {
            name: 'api account change',
            perm: 0
        }, // +
        Remove: {
            name: 'api account remove',
            perm: 1
        } // +
    },
    Device: {
        List: {
            name: 'api device list',
            perm: 0
        }, //+
        Create: {
            name: 'api device create',
            perm: 1
        }, //+
        Change: {
            name: 'api device change',
            perm: 0
        }, //+
        Remove: {
            name: 'api device remove',
            perm: 0
        } //+
    },
    ListUsers: {
        name: 'api list_users',
        perm: 0
    },
    SendCommandWebitel: {
        name: 'sendCommandWebitel',
        perm: 0
    },

    // Users
    Login: {
        name: 'login',
        perm: 0
    },
    Logout: {
        name: 'logout',
        perm: 0
    },
    ReloadAgents: {
        name: 'reloadAgents',
        perm: 1
    },
    Rawapi: {
        name: 'rawapi',
        perm: 0
    },
    Eavesdrop: {
        name: 'eavesdrop',
        perm: 0
    },
    Displace: {
        name: 'displace',
        perm: 0
    },
    Dump: {
        name: 'channel_dump',
        perm: 0
    },

    SipProfile: {
        List: {
            name: 'sip_profile_list',
            perm: 2
        }
    }
};

module.exports.RootName = 'root';

module.exports.ACCOUNT_EVENTS = {
    ONLINE: 'ACCOUNT_ONLINE',
    OFFLINE: 'ACCOUNT_OFFLINE'
};

var ACCOUNT_ROLE = module.exports.ACCOUNT_ROLE = {
    ROOT: {
        name: 'root',
        val: 2
    },
    ADMIN: {
        name: 'admin',
        val: 1
    },
    USER: {
        name: 'user',
        val: 0
    }
};

ACCOUNT_ROLE.getRoleFromName = function (name) {
    switch (name.toLowerCase()) {
        case this.USER.name:
            return this.USER;
        case this.ADMIN.name:
            return this.ADMIN;
        case this.ROOT.name:
            return this.ROOT;
        default:
            return null;
    }
};