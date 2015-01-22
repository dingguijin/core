// Load the TCP Library
net = require('net');

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
net.createServer(function (socket) {

    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort

    // Put this new client in the list
    clients.push(socket);

    // Send a nice welcome message and announce
    //socket.write("Welcome " + socket.name + "\n");
    //broadcast(socket.name + " joined the chat\n", socket);

    // Handle incoming messages from clients.
    socket.on('data', function (data) {
        //broadcast(socket.name + "> " + data, socket);
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        clients.splice(clients.indexOf(socket), 1);
        //broadcast(socket.name + " left the chat.\n");
    });
    var e = new Buffer('{"Event-Name":"CHANNEL_CALLSTATE","Core-UUID":"248209aa-50fd-4651-8b40-f273052571cc","FreeSWITCH-Hostname":"core","FreeSWITCH-Switchname":"webitel","FreeSWITCH-IPv4":"194.44.216.235","FreeSWITCH-IPv6":"::1","Event-Date-Local":"2015-01-22 15:24:19","Event-Date-GMT":"Thu, 22 Jan 2015 15:24:19 GMT","Event-Date-Timestamp":"1421940259081575","Event-Calling-File":"switch_channel.c","Event-Calling-Function":"switch_channel_perform_set_callstate","Event-Calling-Line-Number":"285","Event-Sequence":"1653","Original-Channel-Call-State":"RINGING","Channel-Call-State-Number":"3","Channel-State":"CS_EXECUTE","Channel-Call-State":"EARLY","Channel-State-Number":"4","Channel-Name":"sofia/internal/102@10.10.10.144:5060","Unique-ID":"0746074f-861e-4470-abda-e83062d4ee13","Call-Direction":"inbound","Presence-Call-Direction":"inbound","Channel-HIT-Dialplan":"true","Channel-Presence-ID":"102@10.10.10.144","Channel-Call-UUID":"0746074f-861e-4470-abda-e83062d4ee13","Answer-State":"early","Channel-Read-Codec-Name":"PCMU","Channel-Read-Codec-Rate":"8000","Channel-Read-Codec-Bit-Rate":"64000","Channel-Write-Codec-Name":"PCMU","Channel-Write-Codec-Rate":"8000","Channel-Write-Codec-Bit-Rate":"64000","Caller-Direction":"inbound","Caller-Logical-Direction":"inbound","Caller-Username":"102","Caller-Dialplan":"XML","Caller-Caller-ID-Name":"102","Caller-Caller-ID-Number":"102","Caller-Orig-Caller-ID-Name":"102","Caller-Orig-Caller-ID-Number":"102","Caller-Network-Addr":"10.10.10.25","Caller-ANI":"102","Caller-Destination-Number":"00","Caller-Unique-ID":"0746074f-861e-4470-abda-e83062d4ee13","Caller-Source":"mod_sofia","Caller-Context":"default","Caller-Channel-Name":"sofia/internal/102@10.10.10.144:5060","Caller-Profile-Index":"1","Caller-Profile-Created-Time":"1421940259061595","Caller-Channel-Created-Time":"1421940259061595","Caller-Channel-Answered-Time":"0","Caller-Channel-Progress-Time":"0","Caller-Channel-Progress-Media-Time":"1421940259081575","Caller-Channel-Hangup-Time":"0","Caller-Channel-Transfer-Time":"0","Caller-Channel-Resurrect-Time":"0","Caller-Channel-Bridged-Time":"0","Caller-Channel-Last-Hold":"0","Caller-Channel-Hold-Accum":"0","Caller-Screen-Bit":"true","Caller-Privacy-Hide-Name":"false","Caller-Privacy-Hide-Number":"false"}');
    setInterval(function() {
        socket.write(new Buffer('Content-Length: '+ e.length +'\n' +
                     'Content-Type: text/event-json\n\n'));

        socket.write(e);
        socket.write(new Buffer('\n\n'));
    }, 0);



    // Send a message to all clients
    function broadcast(message, sender) {
        clients.forEach(function (client) {
            // Don't want to send it to sender
            if (client === sender) return;
            client.write(message);
        });
        // Log it to the server output too
        process.stdout.write(message)
    }

}).listen(5000);