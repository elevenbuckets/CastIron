'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet(1100); // mainnet id = 1;

// variables
let ethGasAPI = 'https://ethgasstation.info/json/ethgasAPI.json';
let tokenList = ['TTT'];
let stage = Promise.resolve();

// MAIN
stage.then( () => 
{
	WT.web3.eth.accounts.map( (acct) => 
	{
		WT.userWallet = acct;
		console.log(`Wallet: ${WT.userWallet}`);
		
		let EtherBalance = WT.addrEtherBalance(WT.userWallet);
		console.log(`Ether: ${WT.toEth(EtherBalance, 18).toFixed(9)}`);
		
		WT.hotGroups(tokenList);
		
		tokenList.map( (t) => 
		{
			let tokenBalance = WT.addrTokenBalance(t)(WT.userWallet);
			let decimals = WT.TokenList[t].decimals;
			console.log(`Token (${t}) Balance: ${WT.toEth(tokenBalance, decimals).toFixed(9)}`);
		});
		console.log('-------------------------------------------------------------------')
	})
})
.then( () => 
{
	WT.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });

