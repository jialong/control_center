/**
 * New node file
 */

'use strict';

var xmppClient = require('node-xmpp-client'),
	Element = require('ltx').Element,
    HarmonyAuth = require('./auth'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    harmonyConf = require('../conf/harmony');

function HarmonyClient() {
	var auth = new HarmonyAuth();
	
	var self = this;
	this.activities = {};
	auth.once('auth', function(sessionToken) {
		console.log('Token: '+sessionToken);
		self.sessionToken = sessionToken;
		self.authenticated = true;
		self.emit('auth');
		
		self.getHubConfig();
		self.once('config', function(confData) {
			console.log('config done');
			var confObj = JSON.parse(confData);
			
			if (typeof confObj.activity != 'undefined') {
				for (var i=0; i< confObj.activity.length; i++) {
					self.activities[confObj.activity[i].label] = confObj.activity[i].id;
				}
				
				// console.log(self.activities);
			}
		});
	});
	
	auth.auth();
}

util.inherits(HarmonyClient, EventEmitter);

HarmonyClient.prototype.sendCommand = function(command, payload) {
	// console.log ('Session Token: ' + this.sessionToken);
	
	var self = this;
	
	var client = new xmppClient({
	    jid: self.sessionToken + '@connect.logitech.com/gatorade.',
	    password: self.sessionToken,
	    preferred: 'PLAIN',
	    host: harmonyConf.harmonyHubIp,
	    port: harmonyConf.harmonyHubPort
	});

	client.addListener('online', function(data) {
	    console.log('Connected as ' + data.jid.user + '@' + data.jid.domain + '/' + data.jid.resource);
		// build IQ request
		var iq = new Element(
		        'iq',
		        { type: 'get', id: new Date().getTime() }
		    ).c('oa', { xmlns: 'connect.logitech.com', mime: 'vnd.logitech.harmony/vnd.logitech.harmony.engine?' + command });
		
		if (typeof payload != 'undefined') {
			iq.t(payload);
		}
		
		console.log('Stanza: ', iq.root().toString());

		client.send(iq);
		// client.end();
	});
	
	client.addListener('stanza', function(stanza) {
		console.log('Received stanza: ', stanza.toString());
		
		// parse for session token
		if (stanza.is('iq') && ( typeof stanza.getChild('oa') != 'undefined')) {
			var oa = stanza.getChild('oa');
			if (oa.attrs.errorcode == '200') {
				console.log('Return text: ' + oa.getText());
				self.emit('result', oa.getText());
				
				client.end();
			}
			else if (oa.attrs.errorcode == '100') {
				// continue
				// <iq id="1395808914194" type="get" xmlns:stream="http://etherx.jabber.org/streams"><oa xmlns="connect.logitech.com" mime="vnd.logitech.harmony/vnd.logitech.harmony.engine?startactivity" errorcode="100" errorstring="Continue">done=1:total=2:deviceId=17956355</oa></iq>
				var iq = new Element(
				        'iq',
				        { type: 'get', id: new Date().getTime() }
				    ).c('oa', { xmlns: 'connect.logitech.com', mime: 'vnd.logitech.harmony/vnd.logitech.harmony.engine?' + command });
				console.log('Continue stanza: ', iq.root().toString());
				
				client.send(iq);
			}
		}
	});
	
	client.addListener('error', function(e) {
	    console.error(e);
	    process.exit(1);
	});
};

HarmonyClient.prototype.getHubConfig = function() {
	console.log('Getting hub config...');
	
	var self = this;
	this.on('result', function(resp) {
		// console.log('Complete return: ' + resp);
		self.emit('config', resp);
	});
	
	if (this.authenticated) {
		this.sendCommand('config');
	}
	else {
		this.once('auth', function() {
			this.sendCommand('config');		
		});
	}
};

HarmonyClient.prototype.startActivity = function(activityId) {
	console.log('Starting activity ' + activityId + '...');
	
	var payload = 'activityId=' + activityId + ':timestamp=0';
	
	if (this.authenticated) {
		this.sendCommand('startactivity', payload);
	}
	else {
		this.once('auth', function() {
			this.sendCommand('startactivity', payload);		
		});
	}
	
	var self = this;
	
	this.once('result', function(resp) {
		console.log(resp);
		if (activityId != -1) {
			console.log('Activity started...');
			
			self.emit('started', activityId);
		}
		else {
			console.log('Activity stopped...');
			
			self.emit('stopped');
		}
	});
};

HarmonyClient.prototype.getCurrentActivity = function() {
	console.log('Getting current activity...');
	
	var self = this;
	this.on('result', function(resp) {
		var pieces = resp.split('=');
		self.emit('current', pieces[1]);
	});
	
	if (this.authenticated) {
		this.sendCommand('getCurrentActivity');
	}
	else {
		this.once('auth', function() {
			this.sendCommand('getCurrentActivity');		
		});
	}
};

HarmonyClient.prototype.powerOff = function() {
	console.log('Powering off activity...');
	
	// Get current activity
	this.getCurrentActivity();
	
	var self = this;
	this.once('current', function(currentActivityId) {
		if (currentActivityId != -1) {
			self.startActivity(-1);
			self.once('stopped', function() {
				self.emit('poweroff');
			});
		}
		else {
			self.emit('poweroff');
		}
	});
};

module.exports = HarmonyClient;