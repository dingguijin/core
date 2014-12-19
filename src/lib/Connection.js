var Connection = module.exports = function(id, ws) {
    var ws = ws;
    var id = id;

    var that = this;
    this.getJsonObj = function () {
        return {
            'ws': ws,
            'id': id
        };
    };
    return this.getJsonObj();
};