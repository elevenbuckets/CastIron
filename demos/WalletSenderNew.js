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

WT.connect()
.then((rc) => {
	if (rc) {
		WT.password('masterpass');
		return WT.validPass();
	} else {
		throw("no geth connection!")
	}
})
.catch((err) => {
	console.log(err);
	process.exit(1);
})
.then( (r) => 
{
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
