/**
 * New node file
 */

'use strict';

var HarmonyClient = require('./harmony/index');
var lifx = require('../lifxjs');

var client = new HarmonyClient();
client.getCurrentActivity();
//client.getHubConfig();
//client.startActivity(8186139);
//client.powerOff();

