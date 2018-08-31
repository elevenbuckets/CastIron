'use strict';

// CastIron instance
const Wallet = require( __dirname + '/core/CastIron.js');
const WT     = new Wallet(__dirname + '/.local/config.json');

//console.log(WT.web3.net._requestManager.provider);

// Preparation with gasOracle fetch
//let stage = WT.gasPriceEst();

//WT.password('masterpass');
//let stage = WT.validPass();

// MAIN
if (!WT.configured()) {
	console.log("Please configure CastIron!");
	process.exit(1);
}

let retries = 3;
let trial = 0;

/*
const __checker = (resolve, reject) => {
	trial++;
	if (trial < retries) {
		console.log(`No connection, retrying ${trial}/${retries}`)
		setTimeout(() => { WT.connect().then((r) => { resolve(r); }) }, 5000);
	} else {
		console.log("Given up ...");
		reject(false)
	}
}
	
let stage = WT.connect();

const __checkerRun = (stage, rc) => {
	if (rc) {
		WT.password('masterpass');
		return WT.validPass();
	} else {
		stage = stage.then(() => {
			return new Promise(__checker);
		})

		return stage;
	}
}

stage.then((rc) => {
	return __checkerRun(stage, rc);
})
.catch((err) => {
	console.log(err);
	process.exit(1);
})
*/

const __delay = (t, v) => {
	 return new Promise(function(resolve) { 
	          setTimeout(resolve.bind(null, v), t)
         });
}

const __checker = (resolve, reject) => {
	trial++;
	return WT.connect().then((rc) => {
			if (!rc && trial <= retries) {
				console.log(`retrying (${trial}/${retries})`);
				return __delay(5000, rc);
			} else {
				return rc;
			}
		})
		.then((rc) => {
			if (!rc && trial <= retries) {
				return new Promise(__checker);
			} else if (rc) {
				WT.password('masterpass');
				return WT.validPass().then((r) => { resolve(r) });
			} else {
				reject("Please check your geth connection");
			}
	})
	.catch( (err) => { console.log(err); process.exit(1); });
}

let stage = new Promise(__checker);
stage.then( (r) => {
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
.catch( (err) => { console.log(err); console.log(WT.jobQ); process.exit(1); });
