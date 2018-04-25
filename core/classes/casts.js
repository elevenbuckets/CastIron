'use strict';

// Third party libraries
const fs     = require('fs');

// Cast-Iron Core
const Wallet = require( __dirname + '/Wallet.js');

//Main class
class CastIron extends Wallet {
	constructor(cfpath) {
		super(cfpath);

		/*
		  This is the most derived class in CastIron, which also means it's the closest to app developers and users.
		  CUE object here will, in additional to those defined in super(). add more objects maps to each loaded app.
		  For example:
		
		  11BE app, once installed (preloaded in this case), will add 
		 
		  	this.CUE['11BE'] 
		
		  object to this.CUE. Regarding how the app is packaged, please refer to the "apps" folder in CastIron_UI.
		
		  Also notice that each app will have to define at least one condition (usually "sanity"). Which is loaded
		  like this:
		
		        Object.keys(allConditions).map((f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] });
		
		  Of course, here we will offer functions to allow doing both in one go.
		**/

	}

	// QID will be created and assigned by this.processJobs();
	//
	// For smart contract call 
	// 	funcName(argname1, argname2, argname3)
	//
	// 'args' is an Array in the format of: 
	//      ["argname1", "argname2", "argname3"]
	// and in your txObj, you will put:
	// 	{'argname1': argvalue1, 'argname2': argvalue2, 'argname3': argvalue3};
	//
	// the actual txObj will be prepared using 'amount', 'gasAmount', 'this.gasPrice', and 'this.userWallet'
	//
	// In above example, 'call' is 'funcName'; 'type' is the name assigned to CUE object during package loading. For example:
	// 11BE app is installed into this.CUE as this.CUE['11BE'] = {...}, the 'type' of 11be app is '11BE' (case sensitive)
	//
	// There can be multiple contracts in single app, that's why we need 'contract'. For example, 11BE will either has 'contract' 
	// equals 'Entrance', 'PoSIMS', 'TokenPool', or 'Buckets', which maps to different contracts 11BE has. These names were defined
	// by dApp developers during newApp() call.
	//
	// 'amount' should be null when calling functions that are not payable. 
	// 
	// Finally, notice that ERC20 contract is treated specially and is partially handled by enqueueTx() for token transfer.
	// Other features of ERC20, such as 'approve' function call, are still processed through enqueueTk(). hotGroup() is needed 
	// when performing that latter. Thus we have newToken() here to do it for you.
	//
	enqueueTk = (type, contract, call, args) => (amount, gasAmount, tkObj) => 
	{
		let txObj = {};

		// txObj field checks.
                // While CastIron has conditions to perform final checks before send, basic checks here will allow 
                // caller to drop invalid txObj even before entering promise chain.
		//
		// Note: for enqueueTk, it is the caller's duty to verify elements in tkObj.
                if (
                        this.web3.toAddress(this.userWallet) !== this.userWallet
                     || Number(gasAmount) <= 0
                     || isNaN(Number(gasAmount))
                ){
                        throw "enqueueTk: Invalid element in txObj";
                };

		if (amount === null) {
			txObj = { from: this.userWallet, gas: gasAmount, gasPrice: this.gasPrice } 
		} else if (amount > 0) {
			txObj = { from: this.userWallet, value: amount, gas: gasAmount, gasPrice: this.gasPrice }
		}

		return { Q: undefined, type, contract, call, args, ...tkObj, txObj };
	}

	verifyApp = appSymbol => (version, contract, abiPath, conditions) => 
	{
		// placeholder to call on-chain package meta for verification
		// This should generate all checksums and verify against the records on pkg manager smart contract
		// Smart contract ABI binding to pkg manager should happen during constructor call!
		return true;
	}

	newApp = appSymbol => (version, contract, abiPath, conditions) => 
	{
		if (this.verifyApp(appSymbol)(version, contract, abiPath, conditions) === false) throw 'Invalid dApp info';

		let buffer = fs.readFileSync(abiPath);
		let artifact = JSON.parse(buffer.toString());

		if (typeof(this.CUE[appSymbol] === 'undefined')) this.CUE[appSymbol] = {};

		// appSymbol contains the string which becomes the 'type' keywords of the app
		// contract is the name of the contract
		let abi  = this.web3.eth.contract(artifact.abi);
		let addr = artifact.networks[this.networkID].address;

		this.CUE[appSymbol][contract] = abi.at(addr);

		// conditions is objects of {'condition_name1': condPath1, 'condition_name2': condPath2 ...}
		let allConditions = {};

		Object.keys(conditions).map((cond) => 
		{
			let condbuf = fs.readFileSync(conditions[cond]); 
			let thiscond = eval(JSON.parse(condbuf.toString()));
			allConditions = { ...allConditions, ...thiscond };
		});

		// loading conditions. there names needs to follow CastIron conventions to be recognized by queue, otherwise job will fail.
		Object.keys(allConditions).map((f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] });
	}

	// ERC20 only
	newToken = tokenSymbol => { return this.hotGroup([tokenSymbol]); }
}

module.exports = CastIron;
