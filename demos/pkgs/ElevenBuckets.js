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

// Address specific ABI
let buffer = fs.readFileSync(abiPath('PoSIMS'));
let artifact = JSON.parse(buffer.toString());

const PoSIMS = ciapi.web3.eth.contract(artifact.abi);

let TKRAddr = ciapi.TokenList['TKR'].address;
let ERC20 = ciapi.TokenABI.at(TKRAddr);

// Main
ciapi.newApp(__APP__)('0.2', 'ETHMall', abiPath('ETHMall'), {'Sanity': condPath('ETHMall', 'Sanity')});
let ETHMall = ciapi.CUE[__APP__]['ETHMall'];

let accounts = ciapi.web3.eth.accounts.splice(1,ciapi.web3.eth.accounts.length); // remove eth.account[0], which is mall owner.

console.log("Mall Entrance: " + ETHMall.address);

let jobList = accounts.map((addr) => {
	ciapi.setAccount(addr);
	return ciapi.enqueueTk('BMart','ETHMall','NewStoreFront', [])(ciapi.web3.toWei(0.085, 'ether').toString(), 2000000, {}); 
});

/*
let AirDrop = accounts.map((addr) => {
	ciapi.setAccount(ciapi.web3.eth.accounts[0]);
	return ciapi.enqueueTx('TKR')(addr, 3000000000000000, 250000);
});

jobList = [...AirDrop, ...jobList];
*/

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
	console.log(`** BMart Shop Addresses:`);
	accounts.map((addr) => {
		console.log(`Owner: ${addr}: Shop Address: ${ETHMall.getStoreInfo(addr)}`);
	});
        ciapi.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });
