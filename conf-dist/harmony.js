/**
 * Configuration parameters for Harmony Smart Control
 */

var harmonyCredential =
	{
		// Harmony smart control log in
		email: '',
		password: ''
	};

// Harmony Smart Control Hub IP. Requires static IP assignment for the Hub to work.
var harmonyHubIp = '';
// XMPP port
var harmonyHubPort = 5222;

exports.harmonyCredential = harmonyCredential;
exports.harmonyHubIp = harmonyHubIp;
exports.harmonyHubPort = harmonyHubPort;