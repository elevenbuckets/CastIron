'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet(1100); // mainnet id = 1;

// setup
WT.condition = 'sanity';
WT.gasPrice = 20000000000; // 20 GWei

// variables
let stage = Promise.resolve();

// MAIN
stage.then( () => 
{
	let SRCWallets = 
	{
		'0x7cbfb383074f77ad8b65b885a3f915cff1852a69': 100
	};

	let TargetWallet = '0x0fd89c6cc7a15310fc944338f2aba16b3b63cb46'; 

	// enqueue loop
	let jobList =
	  Object.keys(SRCWallets).map( (addr) => 
	  {
	  	WT.userWallet = addr;
		let amount = WT.toWei(SRCWallets[addr], WT.TokenList['TTT'].decimals).toString();
		return WT.send('TTT')(TargetWallet, amount, 250000);
	  });

	//console.log(jobList);

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

