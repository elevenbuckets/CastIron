'use strict';

// Cast-Iron sub-class and instance
const Wallet = require( __dirname + '/core/Wallet.js');

// Reflux
const Reflux = require('reflux');
import React from 'react';
import ReactDOM from 'react-dom';

// Store
class StatusStore extends Reflux.Store
{
    constructor(tokenList, Actions)
    {
        super();
        this.state = { balances: {'ETH': 0}, address: '0x' }; // <- set store's default state much like in React
	this.tokenList = tokenList;
	this._count;
	this._target;
	this.WT = new Wallet( __dirname + '/.local/configs.json');

	// listenTo
	this.listenables = Actions;
    }

    onStartUpdate(address)
    {
	this._count = 0;
	this._target = this.tokenList.length + 1;

	this.WT.setAccount(address); 
	this.state.address = address;
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
	this.state.balances = {...this.state.balances, ...status};

	//console.log(status);
	if (this._count == this._target) Actions.finishUpdate();
    }

    onFinishUpdate() 
    {
	console.log(`-|| Account: ${this.state.address} ||-`);
	console.log(JSON.stringify(this.state.balances, 0 ,2));
	console.log(`--------------------`);
	// we can perhaps store a copy of the state on disk?
    }
}

// MAIN

// Reflux Actions
let Actions = Reflux.createActions(['startUpdate', 'statusUpdate', 'finishUpdate']);
//Actions.startUpdate.preEmit = (address) => { console.log(`-|| Account: ${address} ||-`) };

let address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"; // Sorry Vitalik! 
let tokenList = ['BCPT','ZIL','SNGLS','RHOC','DATA','GUP','LINK','OMG','QSP','REQ','RLC','ANT','BAT','OPT','SALT','WINGS','KIN','LST','GNT','GLA','DAT'];

// Reflux components
class QueryForm extends Reflux.Component {
  constructor(props) {
    super(props);
    this.store = new StatusStore(tokenList, Actions);

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({address: event.target.address});
  }

  handleSubmit(event) {
    event.preventDefault();
    Actions.startUpdate(address);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          Address:
          <input type="text" value={this.state.address} onChange={this.handleChange} />
        </label>
        <input type="submit" value="Submit" />
      </form>
    );
  }
}

ReactDOM.render
(
	<QueryForm/>,
	document.querySelector('#root')
);
