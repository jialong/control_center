/**
 * New node file
 */

'use strict';

var request = require('request'),
    harmonyConf = require('../conf/harmony'),
    xmppClient = require('node-xmpp-client'),
    ltx = require('ltx'),
    EventEmitter = require('events').EventEmitter,
    util = require('util');

var myHarmonyUrl = 'https://svcs.myharmony.com/CompositeSecurityServices/Security.svc/json/GetUserAuthToken';

function HarmonyAuth() {
	var self = this;
	this.userToken = undefined;
	this.sessionToken = undefined;
};

util.inherits(HarmonyAuth, EventEmitter);

HarmonyAuth.prototype.getSessionToken = function() {
	var self = this;
	
	var client = new xmppClient({
		jid: 'guest@connect.logitech.com/gatorade.',
		password: 'gatorade.',
		preferred: 'PLAIN',
		host: harmonyConf.harmonyHubIp,
		port: 5222
	});

	client.addListener('online', function(data) {
		console.log('Connected as ' + data.jid.user + '@' + data.jid.domain + '/' + data.jid.resource);
		// build IQ request
		var iq = new ltx.Element(
				'iq',
				{ type: 'get', id: new Date().getTime() }
		).c('oa', { xmlns: 'connect.logitech.com', mime: 'vnd.logitech.connect/vnd.logitech.pair' })
		.t('token='+self.userToken+':name=foo#iOS6.0.1#iPhone').up();
		
		console.log('Sending IQ: '+iq.toString());

		client.send(iq);
		client.end();
	});

	client.on('stanza', function(stanza) {
		// console.log('Received stanza: ', stanza.toString());

		// parse for session token
		if (stanza.is('iq') && ( typeof stanza.getChild('oa') != 'undefined')) {
			var oa = stanza.getChild('oa');
			if (oa.attrs.errorcode == '200') {
				var ret = {};
				oa.getText().replace(/(\b[^:]+)=(\b[^:]+)/g, function ($0, param, value) {
					ret[param] = value;
				});

				console.log(ret);

				if ( 'identity' in ret ) {
					console.log('Identity: '+ret['identity']);
					self.sessionToken = ret['identity'];

					self.emit('auth', self.sessionToken);
				}
			}
		}
	});

	client.addListener('error', function(e) {
		console.error(e);
		process.exit(1);
	});	
};

HarmonyAuth.prototype.auth = function(resetToken) {
	if (resetToken) {
		this.userToken = undefined;
		this.sessionToken = undefined;
	}

	if (typeof this.sessionToken != 'undefined') {
		console.log('Session Token already available');
		this.emit('auth', this.sessionToken);
		return false;
	}

	if (typeof this.userToken != 'undefined') {
		this.getSessionToken(this.userToken);
		return false;
	}

	var self = this;
	
	request.post(
			{
				url: myHarmonyUrl,
				method: 'POST',
				json: harmonyConf.harmonyCredential
			},
			function (error, response, body) {
				var token = null;

				if (!error && response.statusCode == 200) {
					if (body.hasOwnProperty('GetUserAuthTokenResult')) {
						var tokenResult = body.GetUserAuthTokenResult;
						if (tokenResult.hasOwnProperty('UserAuthToken')) {
							token = tokenResult.UserAuthToken;
						}
					}
				}
				
				console.log('User token: '+token);

				self.userToken = token;
				self.getSessionToken();
			}
	);

};

module.exports = HarmonyAuth;

//exports.auth = auth;
//getSessionToken('KI/Grijj7S4qbdrOyWUfhn26sFVkHUOs/mGkEj4MfvuO9xDj+jQRkWT+NuFWyQ88');
