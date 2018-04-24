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
const __APP__  = 'BMart';
const __abidir = path.join(__pkgdir, __APP__, 'ABI');
const __condir = path.join(__pkgdir, __APP__, 'conditions');

// Helper functions
const abiPath = ctrName => { return path.join(__abidir, ctrName + '.json'); }
const condPath = (ctrName, condName) => { return path.join(__condir, ctrName, condName + '.json') };

// Main
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});

let ETHMall = ciapi.CUE[__APP__]['ETHMall'];

//console.log(ETHMall.address);
//console.log(ETHMall.mallOwner());

let jobList = [];

ciapi.setAccount('0xd0edda5bcc34d27781ada7c97965a4ff4ac5530a');
jobList.push(ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(ciapi.web3.toWei(0.085, 'ether').toString(), 1400000, {})) 

//console.log(jobList);
ciapi.processJobs(jobList).then((Q) => 
{ 
	let tx = ciapi.rcdQ[Q].map( (o) => { return o.tx;});

	console.log("tx hash:")
	console.log(tx)

	return ciapi.getReceipt(tx, 15000);
}).then( (results) =>
{
        console.log(`** Batch jobs results: `);
        console.log(JSON.stringify(results, 0, 2));
})
.then( () =>
{
        ciapi.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });
