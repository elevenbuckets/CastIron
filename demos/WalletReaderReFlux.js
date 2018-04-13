'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');
const WT = new Wallet( __dirname + '/.local/configs.json');

// Reflux
const Reflux = require('reflux');

// variables
//let tokenList = Object.keys(WT.TokenList);
let tokenList = ['BCPT','ZIL','SNGLS','RHOC','MANA','LEND','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];
let stage = Promise.resolve();

WT.setAccount("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"); // Sorry Vitalik! 
WT.hotGroups(tokenList);

let statusUpdate = Reflux.createAction();

class StatusStore extends Reflux.Store
{
    constructor()
    {
        super();
        this.state = {'ETH': 0}; // <- set store's default state much like in React
	this._count = 0;
    }

    onStatusUpdate(status)
    {
	this._count++;
	this.state = {...this.state, ...status};
	if (this._count == Object.keys(this.state).length) { 
		console.log(status);
		console.log('--------------');
		console.log(JSON.stringify(this.state, 0 ,2));
		this._count = 0;
	} else {
		console.log(status);
	}
    }
}

let s = new StatusStore;

s.listenTo(statusUpdate, s.onStatusUpdate); // listen to the statusUpdate action

console.log(`-|| Account: ${WT.userWallet} ||-`);	

tokenList.map( (t) =>
{ 
	statusUpdate({[t]: Number(WT.toEth(WT.addrTokenBalance(t)(WT.userWallet), WT.TokenList[t].decimals).toFixed(9))}); 
});
statusUpdate({'ETH': Number(WT.toEth(WT.addrEtherBalance(WT.userWallet), WT.TokenList['ETH'].decimals).toFixed(9))}); 


process.exit(0);
