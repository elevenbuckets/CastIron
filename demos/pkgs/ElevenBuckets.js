"use strict";

// Third party modules
const fs = require('fs');
const path = require('path');

// CastIron API
const CastIron = require( __dirname + '/core/CastIron.js');

// paths
const __pkgdir = __dirname + '/dapps';
const __cfpath = __dirname + '/.local/config.json';

// CastIron Instance
const ciapi = new CastIron(__cfpath);

// dApp specific info
const __APP__  = '11BE';
const __abidir = path.join(__pkgdir, __APP__, 'ABI');
const __condir = path.join(__pkgdir, __APP__, 'conditions');

// Helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.js') };

// Main
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});

let ETHMall = ciapi.CUE[__APP__]['ETHMall'];

console.log(ETHMall.address);
console.log(ETHMall.mallOwner());
