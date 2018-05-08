'use strict';

// CastIron instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT     = new Wallet(__dirname + '/.local/config.json');

// Preparation with gasOracle fetch
//let stage = WT.gasPriceEst();

let stage = Promise.resolve();
WT.password('masterpass');

// MAIN
stage.then( () => 
{
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
.catch( (err) => { console.log(err); process.exit(1); });

