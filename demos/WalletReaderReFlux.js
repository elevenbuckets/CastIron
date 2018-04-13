'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');

// Reflux
const Reflux = require('reflux');

// variables
let Actions = Reflux.createActions(['startUpdate', 'statusUpdate']);
Actions.startUpdate.preEmit = (address) => { console.log(`-|| Account: ${address} ||-`) };

class StatusStore extends Reflux.Store
{
    constructor()
    {
        super();
        this.state = {'ETH': 0}; // <- set store's default state much like in React
	this.tokenList = ['BCPT','ZIL','SNGLS','RHOC','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];
	this._count;
	this._target;
	this.WT = new Wallet( __dirname + '/.local/configs.json');
    }

    onStartUpdate(address)
    {
	this._count = 0;
	this._target = this.tokenList.length;

	this.WT.setAccount(address);
	this.WT.hotGroups(this.tokenList);
	
	this.tokenList.map( (t) =>
	{ 
		Actions.statusUpdate({[t]: Number(this.WT.toEth(this.WT.addrTokenBalance(t)(this.WT.userWallet), this.WT.TokenList[t].decimals).toFixed(9))}); 
	});
	Actions.statusUpdate({'ETH': Number(this.WT.toEth(this.WT.addrEtherBalance(this.WT.userWallet), this.WT.TokenList['ETH'].decimals).toFixed(9))}); 
    }

    onStatusUpdate(status)
    {
	this._count++;
	this.state = {...this.state, ...status};

	//console.log(status);

	if (this._count == this._target) { 
		console.log(JSON.stringify(this.state, 0 ,2));
		console.log('--------------');
	}
    }
}

// MAIN
let s = new StatusStore;
let address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"; // Sorry Vitalik! 

s.listenTo(Actions.startUpdate, s.onStartUpdate); // listen to the statusUpdate action
s.listenTo(Actions.statusUpdate, s.onStatusUpdate); // listen to the statusUpdate action

Actions.startUpdate(address);
