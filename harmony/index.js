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
	auth.once('auth', function(sessionToken) {
		console.log('Token: '+sessionToken);
		self.sessionToken = sessionToken;
		self.authenticated = true;
		self.emit('auth');
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
		client.end();
	});
	
	client.on('stanza', function(stanza) {
		console.log('Received stanza: ', stanza.toString());
		
		// parse for session token
		if (stanza.is('iq') && ( typeof stanza.getChild('oa') != 'undefined')) {
			var oa = stanza.getChild('oa');
			if (oa.attrs.errorcode == '200') {
				console.log('Return text: ' + oa.getText());
				self.emit('complete', oa.getText());
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
	
	this.once('complete', function(resp) {
		console.log(resp);
		if (activityId != -1) {
			console.log('Activity started...');
		}
		else {
			console.log('Activity stopped...');
		}
	});
};

HarmonyClient.prototype.getCurrentActivity = function() {
	console.log('Getting current activity...');
	
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
	// this.getCurrentActivity();
	this.startActivity(-1);
	
	/*
	this.once('complete', function(currentActivityId) {
		if (currentActivityId != -1) {
			this.startActivity(-1);
		}
	});
	*/
};

module.exports = HarmonyClient;