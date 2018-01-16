var express = require('express');
var router = express.Router();
module.exports = router;

// mqtt without security
var mqtt = require('mqtt')
var mclient = mqtt.connect('mqtt://telenet-nbiot.westeurope.cloudapp.azure.com')
var devices = require('./devices.json');
var publisher = 'unknown';

// azure sdk
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
// hardcode device for now
var cs;
var Client = require('azure-iot-device').Client;
// pre-provision and activate all devices via a config file
// need to move this to a dynamic function via probing the iot hub registry
var clients = [];
for (var i = 0; i < devices.length; i++) {
        cs = devices[i].cs
        console.log('device:' + devices[i].DeviceID)
        var client = clientFromConnectionString(cs);
        clients.push({"DeviceID": devices[i].DeviceID, "client": client})
}

var mqtt_msg_counter = 0;
var lastHub = 'unknown';

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Simple NBIOT GW', last: lastHub, mqtt: mqtt_msg_counter, pub: publisher });

});

mclient.on('connect', function () {
    console.log('connect')
    mclient.subscribe('devices/#')
})

mclient.on('message', function (topic, message) {
    // message is Buffer
    mqtt_msg_counter++;

    publisher = topic.split(/[.,\/ -]/)[1];
    console.log('publisher: ' + publisher)

    var msg = message.toString();
    var tid = JSON.parse(msg).tid;
    var timestamp = new Date(JSON.parse(msg).tst);
    console.log('message from: ' + tid + ' at: ' + timestamp)

    for (var i = 0; i < clients.length; i++) { 
        if (clients[i].DeviceID === tid) {  // choose client to send
            var mclient = clients[i].client;
            var hubMsg = new Message(msg)

            mclient.sendEvent(hubMsg, function (err, res) {
                if (err) {
                    console.log('error sending')
                    lastHub = 'some iot hub error: ' + err.toString()
                }
                else {
                    if (res) {
                        lastHub = new Date();
                        console.log('sent at: ' + lastHub)
                        console.log('result: ' + JSON.stringify(res))
                    }
                }
            })
        }
    }
})