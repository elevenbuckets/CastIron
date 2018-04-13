'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet( __dirname + '/.local/configs.json');

// variables
//let tokenList = Object.keys(WT.TokenList);
let tokenList = ['BCPT','ZIL','SNGLS','RHOC','MANA','LEND','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];
let stage = Promise.resolve();

WT.setAccount("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"); // Sorry Vitalik! 
WT.hotGroups(tokenList);

async function _balance(tokenList) {
  let totalBalance = {};

  totalBalance['ETH'] = Number(WT.toEth(WT.addrEtherBalance(WT.userWallet), WT.TokenList['ETH'].decimals).toFixed(9));

  await Promise.all( tokenList.map( async (t) =>
        {
		totalBalance[t] = Number(WT.toEth(WT.addrTokenBalance(t)(WT.userWallet), WT.TokenList[t].decimals).toFixed(9));
        })
  );

  return totalBalance;
}

// MAIN
stage.then( () => 
{
	console.log(`-|| Account: ${WT.userWallet} ||-`);
	return _balance(tokenList);
})
.then( (totalBalance) => 
{
	console.log(JSON.stringify(totalBalance, 0, 2));
	WT.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });

