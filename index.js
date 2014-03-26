/**
 * New node file
 */

'use strict';

var HarmonyClient = require('./harmony/index')
   ,lifx = require('../lifxjs')
   ,tcp = require('./tcp_connect/tcp')
   ,express = require('express')
   ;

var app = express();
var harmony = new HarmonyClient();

app.get('/harmony/poweroff', function(req, res) {
	console.log('Turning off current activity with Harmony');
	
	harmony.powerOff();
	
	harmony.once('poweroff', function() {
		console.log('Current activity turned off');
		res.send({status: 'ok'});
	});
});

app.get('/harmony/conf', function(req, res) {
	harmony.getHubConfig();
	
	harmony.once('config', function(resp) {
		console.log('Got remote config');
		res.send(resp);
	});
});

app.get('/harmony/current', function(req, res) {
	harmony.getCurrentActivity();
	
	harmony.once('current', function(resp) {
		console.log('Current activity ' + resp);
		res.send(resp);
	});	
});

app.get('/harmony/start/:activityId', function(req, res) {
	harmony.startActivity(req.params.activityId);
	
	harmony.once('started', function(resp) {
		console.log('Started activity ' + resp);
		res.send(resp);
	});
});

app.get('/harmony', function(req, res) {
	res.send(harmony.activities);
});

app.get('/', function(req, res) {
	res.send('Welcome to Control Center');
});

var server = app.listen(3000, '0.0.0.0', function() {
	console.log('Listening on port %d', server.address().port);
});

