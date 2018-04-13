'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');

// Reflux
const Reflux = require('reflux');

// Reflux Actions
let Actions = Reflux.createActions(['startUpdate', 'statusUpdate', 'finishUpdate']);
Actions.startUpdate.preEmit = (address) => { console.log(`-|| Account: ${address} ||-`) };

// Store
class StatusStore extends Reflux.Store
{
    constructor(tokenList)
    {
        super();
        this.state = {'ETH': 0}; // <- set store's default state much like in React
	this.tokenList = tokenList;
	this._count;
	this._target;
	this.WT = new Wallet( __dirname + '/.local/configs.json');

	// listenTo
	this.listenTo(Actions.startUpdate, this.onStartUpdate); // listen to the statusUpdate action
	this.listenTo(Actions.statusUpdate, this.onStatusUpdate); // listen to the statusUpdate action
	this.listenTo(Actions.finishUpdate, this.onFinishUpdate); // listen to the statusUpdate action
    }

    onStartUpdate(address)
    {
	this._count = 0;
	this._target = this.tokenList.length + 1;

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
	if (this._count == this._target) Actions.finishUpdate();
    }

    onFinishUpdate() 
    {
	console.log(JSON.stringify(this.state, 0 ,2));
	console.log(`--------------------`);
	// we can perhaps store a copy of the state on disk?
    }
}

// MAIN
let address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"; // Sorry Vitalik! 
let tokenList = ['BCPT','ZIL','SNGLS','RHOC','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];
let s = new StatusStore(tokenList);

Actions.startUpdate(address);
