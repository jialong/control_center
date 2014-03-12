/**
 * New node file
 */

'use strict';

var ltx = require('ltx')
   ,request = require('request')
   ,EventEmitter = require('events').EventEmitter
   ,TcpConfig = require('../conf/tcp.js')
   ,util = require('util');

var tcpHubPath = '/gwr/gop.php';

function TcpConnect() {
	this.rooms = {};
	
	// get config for hub
	this.hubUrl = 'http://' + TcpConfig.hubIp + ':' + TcpConfig.hubPort + tcpHubPath;
	
	this._init_();
};

util.inherits(TcpConnect, EventEmitter);

TcpConnect.prototype._init_ = function() {
	var el = new ltx.Element('gwrcmds')
	        .c('gwrcmd')
			.c('gcmd').t('RoomGetCarousel').up()
			.c('gdata')
			.c('gip')
			.c('version').t('1').up()
			.c('token').t('1234567890').up()
			.c('fields').t('name,image,imageurl,control,power,product,class,realtype,status');
	
	var opts = {};
	opts['cmd'] = 'GWRBatch';
	opts['data'] = el.root().toString();
	opts['fmt'] = 'xml';
	
	this.rooms = {};
	var self = this;
	
	request.post(
			{
				url: self.hubUrl,
				form: opts
			},
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var discoverRes = ltx.parse(body);
					var rooms = discoverRes.getChild('gwrcmd').getChild('gdata').getChild('gip').getChildren('room');
					
					for ( var i=0; i<rooms.length; i++ ) {
						var room = rooms[i];
						
						var roomObj = {};
						var roomId = room.getChild('rid').getText();
						roomObj['name'] = room.getChild('name').getText();
						
						var devices = room.getChildren('device');
						var deviceIds = [];
						for ( var j=0; j<devices.length; j++ ) {
							var device = devices[j];
							deviceIds.push(device.getChild('did').getText());
						}
						roomObj['dids'] = deviceIds;
						
						self.rooms[roomId] = roomObj; 
						
						console.log('Discovered room ' + roomObj['name'] + ' with ' + roomObj['dids'].length + ' bulb(s).');
					}
					
					self.emit('ready');
				}
			}
	);

};

// onOff = 1: on, onOff = 0: off
TcpConnect.prototype.bulbOnOff = function(did, onOff) {
	var el = new ltx.Element('gip')
				.c('version').t('1').up()
				.c('token').t('1234567890').up()
				.c('did').t(did).up()
				.c('value').t(onOff);
	
	var opts = {};
	opts['cmd'] = 'DeviceSendCommand';
	opts['data'] = el.root().toString();
	opts['fmt'] = 'xml';
	
	// console.log(opts);
	
	var self = this;
	request.post(
			{
				url: self.hubUrl,
				form: opts
			},
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var cmdRes = ltx.parse(body);
					var respCode = cmdRes.getChild('rc').getText();
					if (respCode == '200') {
						if (onOff == 1) {
							console.log('Turned on bulb ' + did);
						}
						else {
							console.log('Turned off bulb ' + did);
						}
					}
					
					if (onOff == 1) {
						self.emit('bulb_on');
					}
					else {
						self.emit('bulb_off');
					}
				}
			}
	);
};

// dimLevel: 0-99
TcpConnect.prototype.bulbSetLevel = function(did, dimLevel) {
	var el = new ltx.Element('gip')
	.c('version').t('1').up()
	.c('token').t('1234567890').up()
	.c('did').t(did).up()
	.c('value').t(dimLevel).up()
	.c('type').t('level');

	var opts = {};
	opts['cmd'] = 'DeviceSendCommand';
	opts['data'] = el.root().toString();
	opts['fmt'] = 'xml';
	
	// console.log(opts);
	
	var self = this;
	request.post(
		{
			url: self.hubUrl,
			form: opts
		},
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var cmdRes = ltx.parse(body);
				var respCode = cmdRes.getChild('rc').getText();
				if (respCode == '200') {
					console.log('Set dim level of bulb ' + did + ' to ' + dimLevel);
				}
			}

			self.emit('bulb_dim_set');
		}
	);
};

TcpConnect.prototype.roomOnOff = function (rid, onOff) {
	if ( rid in this.rooms ) {
		var dids = this.rooms[rid]['dids'];
		for ( var i=0; i<dids.length; i++ ) {
			this.bulbOnOff(dids[i], onOff);
		}
		
		var bulbOnOffCount = 0;
		for ( i=0; i<dids.length; i++) {
			
		}
		
		if (onOff == 1) {
			this.emit('room_light_on');
		}
		else {
			this.emit('room_light_off');
		}
	}
	else {
		console.error('Room ' + rid + ' is not valid.');
	}
};

TcpConnect.prototype.roomSetLevel = function (rid, dimLevel) {
	if ( rid in this.rooms ) {
		var dids = this.rooms[rid]['dids'];
		for ( var i=0; i<dids.length; i++ ) {
			this.bulbSetLevel(dids[i], dimLevel);
		}

		this.emit('room_dim_set');
	}
	else {
		console.error('Room ' + rid + ' is not valid.');
	}
	
};

var tcp = new TcpConnect();
tcp.on('ready', function() {
	// tcp.bulbSetLevel('216542398414259727', 80);	
	// tcp.bulbOnOff('216542398414259727', 0);
	tcp.on('room_light_on', function() {
		console.log('Room light on');
		tcp.roomSetLevel('1', 20);
	});
	tcp.on('room_dim_set', function() {
		console.log('Room dim set');
		tcp.roomOnOff('1', 0);
	});
	
	tcp.roomOnOff('1', 1);
});


