'use strict';

// Third party libraries
const BigNumber = require('bignumber.js');
const fetch     = require('node-fetch');
const fs        = require('fs');

// Cast-Iron Core
const JobQueue = require( __dirname + '/JobQueue.js');

// EIP20 standard ABI
const EIP20ABI = require( __dirname + '/ABI/StandardToken.json' );

// EIP20 standard contract ABI conditions
const TokenSanity = require( __dirname + '/conditions/Token/Sanity.js' ); // auto mapping from contract ABI

// App specific object combines all conditions
const allConditions = { ...TokenSanity };

// token list (taken from https://balanceof.me)
const Tokens = require( __dirname + '/configs/Tokens.json' );

//Main class
class Wallet extends JobQueue {
	constructor(cfpath) {
		super(cfpath);

		this.TokenABI  = this.web3.eth.contract(EIP20ABI);
		this.GasOracle = this.configs.gasOracleAPI || undefined;
		this.TokenList = Tokens;
		this.filterSets = [];
		this.userWallet = undefined;
		this.gasPrice = this.configs.defaultGasPrice || 50000000000; // 50 GWei, this should become dynamic when integrated with gas price oracle
		this.allocated = {}; // {addr: amount}
		this.qTimeout  = this.configs.queueInterval || 5000;

		// This app only need 'Token' ABI type for EIP20, the rest is provided by Wrap3.
		// and these are to be initialized with hotgroups
		this.CUE['Token'] = {}; this.AToken = {}; 

		Object.keys(allConditions).map((f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] });
	}

	gasPriceEst = () => 
	{
		let results = Promise.resolve();

		results = results.then(() => 
		{
			return fetch(this.GasOracle)
	                        .then( (r) => { return r.json(); })
        	                .then( (json) => { 
						   return {   // ethGasStation returns unit is 10GWei, hence 10 ** 8
								low: String(Number(json.safeLow)*(10 ** 8)), 
								mid: String(Number(json.average)*(10 ** 8)), 
							       high: String(Number(json.fast)*(10 ** 8)), 
                                                               fast: String(Number(json.fastest)*(10 ** 8)), 
                                                            onblock: json.blockNum
							  }; 
				                 })
                	        .catch( (e) => { throw(e); })
		})

		return results;
	}

	hotGroups = tokenList =>
        {
                let rc = tokenList.map( (token) =>
                {
			if (typeof(this.TokenList[token]) === 'undefined') return false;

                        let record = this.TokenList[token];

                        this.CUE.Token[token] = this.TokenABI.at(record.addr);
			this.AToken[token] = this.web3.toBigNumber(10).pow(record.decimals);

                        return true;
                });

                return rc.reduce((result, stat) => { return result && (stat === true) });
        }

	toEth = (wei, decimals) => new BigNumber(String(wei)).div(new BigNumber(10 ** decimals));
	toWei = (eth, decimals) => new BigNumber(String(eth)).times(new BigNumber(10 ** decimals)).floor();	
	hex2num = (hex) => new BigNumber(String(hex)).toString();

	setAccount = addr => 
	{
		this.userWallet = addr;
		if (typeof(this.allocated[addr]) === 'undefined') this.allocated[addr] = new BigNumber(0);

		return true;
	}

	// the jobObj list input here will be jobObj in a list *WITHOUT* QID!
	processJobs = jobObjList => 
	{
		let tokenList = jobObjList
			.map( (job) => { return job.contract; } )
			.filter( (value, index, self) => 
			{ 
				return self.indexOf(value) === index; 
			});

		let txOnly = this.hotGroups(tokenList);
		
		return this.prepareQ(this.qTimeout)
			.then( (Q) => 
			{
				console.debug(`Queue ID: ${Q}, Enqueuing ...`);

				jobObjList.map( (job) => 
				{
					this.setAccount(job.txObj.from);
					let userBalance = this.web3.eth.getBalance(this.userWallet); 

					console.debug(` - Account: ${this.userWallet}; Balance: ${userBalance} ETH`);

					let gasCost = new BigNumber(job.txObj.gas).times(this.gasPrice); 

					if (
					        typeof(this.TokenList[job.contract]) === 'undefined'
					     && typeof(job.type) !== 'undefined' 
					     && job.type === 'Token'
					     && userBalance.sub(this.allocated[this.userWallet]).gte(gasCost)
					) {
						console.debug(`WARN: Unknown token ${job.contract}, skipping job ...`);
						return;
					} else if (
				     	        typeof(this.CUE[job.type]) === 'undefined'
				     	     || typeof(this.CUE[job.type][job.contract]) === 'undefined'
					) {
						console.warn(`WARN: Invalid call ${job.type}.${job.contract}.${job.call}, skipping job ...`);
						return;
					} else if (
						job.type !== 'Web3' 
					     && userBalance.sub(this.allocated[this.userWallet]).gte(gasCost) 
					) {
						console.debug(`INFO: calling ${job.type}.${job.contract}.${job.call}, allocating gas fee from wallet: ${gasCost}`);
						this.allocated[this.userWallet] = this.allocated[this.userWallet].add(gasCost);
					} else if (
						job.type === 'Web3' 
					     && userBalance.sub(this.allocated[this.userWallet]).sub(job.txObj.value).gte(gasCost) 
					) {
						console.debug(`INFO: sending Ether, allocating gas fee ${gasCost} and ether ${job.txObj.value} from wallet`);
						this.allocated[this.userWallet] = this.allocated[this.userWallet].add(gasCost).add(job.txObj.value);
					} else {
						console.warn(`WARN: Insufficient fund in wallet, skipping job ...`);
						return;
					}

					this.enqueue({...job, Q})(this.userWallet);
				})

				return Q;
			})
			.then( (Q) => { return this.processQ(Q); })
			.catch( (err) => { console.error(err); throw "ProcessJob failed, skipping QID..."; } );
	}

	// Here token is single token record from this.TokenList[symbol]
	// This function just create new jobObj without assigning QID...
	// QID will be created and assigned by this.processJobs();
	//
	// Note that if tokenSymbol is 'ETH', it means to send Ether
	// using web3.eth.sendTransaction().
	enqueueTx = tokenSymbol => (toAddress, amount, gasAmount) => 
	{
		// txObj field checks.
		// While CastIron has conditions to perform final checks before send, basic checks here will allow 
		// caller to drop invalid txObj even before entering promise chain.
		if (
			this.web3.toAddress(this.userWallet) !== this.userWallet
		     || this.web3.toAddress(toAddress) !== toAddress
		     || Number(amount) <= 0
		     || isNaN(Number(amount))
		     || Number(gasAmount) <= 0
		     || isNaN(Number(gasAmount))
		){
			throw "enqueueTx: Invalid element in txObj";
		};

		if (tokenSymbol === 'ETH') {
			return {
				Q: undefined,
				type: 'Web3',
				contract: 'ETH',
				call: 'sendTransaction',
				args: [],
				txObj: { from: this.userWallet, to: toAddress, value: amount, gas: gasAmount, gasPrice: this.gasPrice } 
			}
		} else {
			return {
				Q: undefined,
				type: 'Token',
				contract: tokenSymbol,
				call: 'transfer',	
				args: ['toAddress', 'amount'],
				toAddress,
				amount,
				txObj: { from: this.userWallet, gas: gasAmount, gasPrice: this.gasPrice }
			}
		}
	}

        addrTokenBalance = tokenSymbol => walletAddr =>
        {
                if (typeof(this.CUE.Token[tokenSymbol]) === 'undefined') throw new Error(`Token ${tokenSymbol} is not part of current hot group`);
                return this.CUE.Token[tokenSymbol].balanceOf(walletAddr);
        }
}

module.exports = Wallet;
