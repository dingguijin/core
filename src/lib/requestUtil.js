/**
 * Created by i.navrotskyj on 26.02.2015.
 */

module.exports = {
    getRequestObject: function (status, info, description) {
        return {
            "status": status,
            "info": info,
            "more info": description
        }
    }
};