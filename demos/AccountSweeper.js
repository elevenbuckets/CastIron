'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet( __dirname + '/.local/configs.json'); // mainnet id = 1;

// variables
let tokenList = ['BCPT','ZIL','SNGLS','RHOC','MANA','LEND','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];
let stage = Promise.resolve();

// MAIN
stage.then( () => 
{
	let totalBalance = {}; 
        [...tokenList, 'ETH'].map((c) => {totalBalance[c] = 0});

	let skips = []; // get a list of wallet address to skip here
	let myAccounts = WT.web3.eth.accounts.filter((a) => { if (skips.includes(a) == false) return a});

	myAccounts.map( (acct) => 
	{
		WT.userWallet = acct;
		console.log(`-| Account: ${WT.userWallet} |------------------------------------------------`);
		
		let EtherBalance = WT.addrEtherBalance(WT.userWallet);
		totalBalance['ETH'] = totalBalance['ETH'] + Number(WT.toEth(EtherBalance, 18).toFixed(9));
		console.log(`\t\t\t\t\t\t\t\t has Ether (ETH) \t ${WT.toEth(EtherBalance, 18).toFixed(9)}`);
		
		WT.hotGroups(tokenList);
		
		tokenList.map( (t) => 
		{
			let tokenBalance = WT.addrTokenBalance(t)(WT.userWallet);
			let decimals = WT.TokenList[t].decimals;
			totalBalance[t] = totalBalance[t] + Number(WT.toEth(tokenBalance, decimals).toFixed(9));
			if (tokenBalance.gt(0)) console.log(`\t\t\t\t\t\t\t\t has Token (${t}) \t ${WT.toEth(tokenBalance, decimals).toFixed(9)}`);
		});
	})

	return totalBalance;
})
.then( (totalBalance) => 
{
	console.log(JSON.stringify(totalBalance,0,2));
	WT.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });

