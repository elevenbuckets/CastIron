'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet( __dirname + '/.local/config.json');

// variables
let tokenList = Object.keys(WT.TokenList);
let stage = Promise.resolve();

WT.setAccount("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"); // Sorry Vtalik! 

// MAIN
stage.then( () => 
{
	let totalBalance = {}; 
	WT.hotGroups(tokenList);
	
	totalBalance['ETH'] = Number(WT.toEth(WT.addrEtherBalance(WT.userWallet), WT.TokenList['ETH'].decimals).toFixed(9));
	
	tokenList.map( (t) => 
	{
		totalBalance[t] = Number(WT.toEth(WT.addrTokenBalance(t)(WT.userWallet), WT.TokenList[t].decimals).toFixed(9));
	});

	return totalBalance;
})
.then( (totalBalance) => 
{
	console.log(`-|| Account: ${WT.userWallet} ||-`);
	console.log(JSON.stringify(totalBalance,0,2));
	WT.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });

