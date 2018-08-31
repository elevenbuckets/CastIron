'use strict';

// CastIron instance
const Wallet = require( __dirname + '/core/CastIron.js');
const WT     = new Wallet(__dirname + '/.local/config.json');

// Preparation with gasOracle fetch
//let stage = WT.gasPriceEst();

const __delay = (t, v) => { return new Promise((resolve) => { setTimeout(resolve.bind(null, v), t) }); }
const __reconnect = (p, ciapi, trial, retries) => { // p: promise, ciapi: castiron instance, trial: current retry, retries: max retry times
	return p
	.then(() => { return ciapi.connect(); })
	.then((rc) => {
		if (!rc && trial < retries) {
			trial++;
			console.log(`retrying (${trial}/${retries})`);
			return __delay(5000, null).then(() => { return __reconnect(p, ciapi, trial, retries); });
		} else if (!rc && trial >= retries) {
			throw("Please check your geth connection");
		} else if (rc) {
			return p;
		}

	})
	.catch( (err) => { console.log(err); process.exit(1); });
}

// MAIN
if (!WT.configured()) {
	console.log("Please configure CastIron!");
	process.exit(1);
}

const retries = 3;
let trial = 0;
let stage = Promise.resolve();

stage = __reconnect(stage, WT, trial, retries);
stage.then( (r) => {
	console.log("connected ... checking password ...")
	WT.password('masterpass');
	return WT.validPass();
})
.then( (r) => {
	console.log("Main Action")
	if (r === false) throw "wrong master password";

	//console.log(gpmx);
	WT.gasPrice = 20000000000;

	// could have more than one tx
	// here the values are token or ether counts

	// DO NOT forget!!!!!!!!!
  	WT.userWallet = WT.web3.eth.accounts[0];

	// swap unit according to decimals
	let amount = WT.toWei(100, WT.TokenList['TKA'].decimals).toString();

	// enqueue
	let jobList = WT.enqueueTx('TKA')(WT.web3.eth.accounts[1], amount, 250000);

	// return promise
	return WT.processJobs([jobList]);	
})
.then( (Q) =>
{
        let batchTxHash = WT.rcdQ[Q].map( (o) => { return o.tx; } );
        console.log(batchTxHash);

        return WT.getReceipt(batchTxHash, 30000);
}).then( (results) =>
{
        console.log(`** Batch jobs results: `);
        console.log(JSON.stringify(results, 0, 2));
})
.then( () =>
{
	WT.closeIPC();
})
//.catch( (err) => { console.log(err); console.log(WT.jobQ); process.exit(1); });
