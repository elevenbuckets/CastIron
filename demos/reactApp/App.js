'use strict';

import Wallet from './core/Wallet';

import Reflux from 'reflux';
import React from 'react';
import ReactDOM from 'react-dom';
import Dropdown from 'react-dropdown';

// Reflux Actions
let Actions = Reflux.createActions(['startUpdate', 'statusUpdate', 'finishUpdate']);

// Reflux Store
class StatusStore extends Reflux.Store
{
    constructor()
    {
        super();
        this.state = { balances: {'ETH': 0}, address: '' }; // <- set store's default state much like in React
	this.tokenList = ['TTT'];
	this._count;
	this._target;
	this.WT = new Wallet( __dirname + '/.local/configs.json');
	this.state.accounts = this.WT.web3.eth.accounts;

	this.listenables = Actions;
    }

    _create = (canvas) => {
        // The random number is a js implementation of the Xorshift PRNG
	let randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values

	let seedrand = (seed) => {
		for (var i = 0; i < randseed.length; i++) {
			randseed[i] = 0;
		}
		for (var i = 0; i < seed.length; i++) {
			randseed[i%4] = ((randseed[i%4] << 5) - randseed[i%4]) + seed.charCodeAt(i);
		}
	}

	let rand = () => {
		// based on Java's String.hashCode(), expanded to 4 32bit values
		var t = randseed[0] ^ (randseed[0] << 11);

		randseed[0] = randseed[1];
		randseed[1] = randseed[2];
		randseed[2] = randseed[3];
		randseed[3] = (randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8));

		return (randseed[3]>>>0) / ((1 << 31)>>>0);
	}

	let createColor = () => {
		//saturation is the whole color spectrum
		var h = Math.floor(rand() * 360);
		//saturation goes from 40 to 100, it avoids greyish colors
		var s = ((rand() * 60) + 40) + '%';
		//lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
		var l = ((rand()+rand()+rand()+rand()) * 25) + '%';

		var color = 'hsl(' + h + ',' + s + ',' + l + ')';
		return color;
	}

	let createImageData = (size) => {
		var width = size; // Only support square icons for now
		var height = size;

		var dataWidth = Math.ceil(width / 2);
		var mirrorWidth = width - dataWidth;

		var data = [];
		for(var y = 0; y < height; y++) {
			var row = [];
			for(var x = 0; x < dataWidth; x++) {
				// this makes foreground and background color to have a 43% (1/2.3) probability
				// spot color has 13% chance
				row[x] = Math.floor(rand()*2.3);
			}
			var r = row.slice(0, mirrorWidth);
			r.reverse();
			row = row.concat(r);

			for(var i = 0; i < row.length; i++) {
				data.push(row[i]);
			}
		}

		return data;
	}

	let buildOpts = (address) => {
		var newOpts = {};

		newOpts.seed = address;
		seedrand(newOpts.seed);

		newOpts.size = 11;
		newOpts.scale = 6;
		newOpts.color = createColor();
		newOpts.bgcolor = createColor();
		newOpts.spotcolor = createColor();

		return newOpts;
	}

	let renderIcon = (opts, canvas) => {
		var imageData = createImageData(opts.size);
		var width = Math.sqrt(imageData.length);
		var cc = canvas.getContext('2d');

		canvas.width = canvas.height = opts.size * opts.scale;

		cc.clearRect(0,0, canvas.width, canvas.height);
		cc.fillStyle = opts.bgcolor;
		cc.fillRect(0, 0, canvas.width, canvas.height);
		cc.fillStyle = opts.color;

		for(var i = 0; i < imageData.length; i++) {

			// if data is 0, leave the background
			if(imageData[i]) {
				var row = Math.floor(i / width);
				var col = i % width;

				// if data is 2, choose spot color, if 1 choose foreground
				cc.fillStyle = (imageData[i] == 1) ? opts.color : opts.spotcolor;

				cc.fillRect(col * opts.scale, row * opts.scale, opts.scale, opts.scale);
			}
		}

		return canvas;
	}

	let hex_address = this.state.address.replace('x', '0');
	if (hex_address.match(/[0-9a-f]{42}/ig)) {
		let opts = buildOpts(this.state.address);
		return renderIcon(opts, canvas);
	}
    }

    onStartUpdate(address, canvas)
    {
	this._count = 0;
	this._target = this.tokenList.length + 1;

	this.WT.setAccount(address); 
	this.setState({ address: address });
	this.WT.hotGroups(this.tokenList);
	
	this.tokenList.map( (t) =>
	{ 
		Actions.statusUpdate({[t]: Number(this.WT.toEth(this.WT.addrTokenBalance(t)(this.WT.userWallet), this.WT.TokenList[t].decimals).toFixed(9))}); 
	});

	Actions.statusUpdate({'ETH': Number(this.WT.toEth(this.WT.addrEtherBalance(this.WT.userWallet), this.WT.TokenList['ETH'].decimals).toFixed(9))});

	this._create(canvas);
    }

    onStatusUpdate(status)
    {
	this._count++;

	this.setState( {balances: {...this.state.balances, ...status} });

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

// Reflux components

class GenSheets extends Reflux.Component {
  constructor(props) {
    super(props);
    this.store = StatusStore;
  }

  render = () => 
  {
    if (this.state.address == '') return (<p/>);

    const balanceSheet = Object.keys(this.state.balances).map((b) =>
    { 
	if (b == 'ETH') {
	return (
	<tr key={b} className="balance-sheet">
          <td className="balance-sheet" width='185'>{b}:</td>
	  <td className="balance-sheet">{this.state.balances[b]}</td>
	  <td className="balance-sheet"><input type="button" className="button" value="send"/></td>
	  <td className="balance-sheet"><input type="button" className="button" value="buy" disabled/></td>
	  <td className="balance-sheet"><input type="button" className="button" value="sell" disabled/></td>
	</tr> );
	} else {
	return (
	<tr key={b} className="balance-sheet">
          <td className="balance-sheet" width='185'>{b}:</td>
	  <td className="balance-sheet">{this.state.balances[b]}</td>
	  <td className="balance-sheet"><input type="button" className="button" value="send"/></td>
	  <td className="balance-sheet"><input type="button" className="button" value="buy"/></td>
	  <td className="balance-sheet"><input type="button" className="button" value="sell"/></td>
	</tr> );
	}
    });

    return (
		    <table className="balance-sheet">
		    <tbody>
		    <tr>
		      <th className="balance-sheet">Types</th>
		      <th className="balance-sheet">Amount</th>
		      <th className="balance-sheet" colSpan="3">Actions</th>
		    </tr>
		    {balanceSheet}
    		    </tbody>
		    </table>);
  }
}

class QueryForm extends Reflux.Component {
  constructor(props) {
    super(props);
    this.store = StatusStore;
  }

  handleChange = (event) => 
  {
    Actions.startUpdate(event.value, this.refs.canvas);
  }

  render = () => 
  {
    return (
      <div>
	<table>
	<tbody>
	<tr>
          <td className="avatar" width={201}>
	    <canvas ref='canvas' width={66} height={66} style= 
	        {
		    { 
		  	border: "3px solid #ccc",
			borderBottomLeftRadius: "2.8em", 
			borderBottomRightRadius: "2.8em", 
			borderTopRightRadius: "2.8em", 
			borderTopLeftRadius: "2.8em" 
		    }
	        }
	    /></td>
          <td>
           <label>
	     Address:
	     <Dropdown ref='addrlist' options={this.state.accounts} onChange={this.handleChange} value={this.state.address} placeholder="Select an option" />
	   </label>
	  </td>
        </tr>
	<tr><td colSpan="2"><GenSheets /></td></tr>
	</tbody>
	</table>
      </div>
    );
  }
}

ReactDOM.render
(
	<QueryForm/>,
	document.querySelector('#root')
);
