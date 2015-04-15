var amqp = require('amqp');

var connection = amqp.createConnection({
    host: '194.44.216.235'
    , port: 5672
    , login: 'guest'
    , password: 'guest'
});

// Wait for connection to become established.
connection.on('ready', function () {
    // Use the default 'amq.topic' exchange
    connection.queue('my-queue', function (q) {
        // Catch all messages
        q.bind('TAP.Events', function () {
            console.log('BIND OK');
        });

        // Receive messages
        q.subscribe(function (message) {
            // Print messages to stdout
            console.log(message);
        });
    });
});