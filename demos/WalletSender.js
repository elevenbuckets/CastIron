'use strict';

// CastIron instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT     = new Wallet(__dirname + '/.local/configs.json');

// Preparation with gasOracle fetch
let stage = WT.gasPriceEst();

// MAIN
stage.then( (gpmx) => 
{
	console.log(gpmx);
	WT.gasPrice = gpmx.fast;

	// could have more than one tx
	// here the values are token or ether counts
	let SRCWallets = 
	{
		'0x7cbfb383074f77ad8b65b885a3f915cff1852a69': 100
	};

	let TargetWallet = '0x0fd89c6cc7a15310fc944338f2aba16b3b63cb46'; 

	// enqueue loop
	let jobList =
	  Object.keys(SRCWallets).map( (addr) => 
	  {
		// DO NOT forget!!!!!!!!!
	  	WT.userWallet = addr;

		// swap unit according to decimals
		let amount = WT.toWei(SRCWallets[addr], WT.TokenList['TTT'].decimals).toString();

		// enqueue
		return WT.enqueueTx('TTT')(TargetWallet, amount, 250000);
	  });

	// return promise
	return WT.processJobs(jobList);	
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

