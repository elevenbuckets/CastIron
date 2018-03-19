'use strict';

// Third party libraries
const BigNumber = require('bignumber.js');
const fetch     = require('node-fetch');

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
	constructor(networkID) {
		super(networkID);

		this.TokenABI  = this.web3.eth.contract(EIP20ABI);
		this.GasOracle = 'https://ethgasstation.info/json/ethgasAPI.json';
		this.TokenList = Tokens;
		this.filterSets = [];
		this.userWallet = undefined;
		this.gasPrice = 50000000000; // 50 GWei, this should become dynamic when integrated with gas price oracle

		// Testing HTML DOM integration
		this.document = undefined;
		this.paused = false;
		this.allocated = {}; // {addr: amount}

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
						   return { 
								low: json.safeLow, 
								mid: json.average, 
							       high: json.fast, 
                                                               fast: json.fastest, 
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
                        let record = this.TokenList[token];

                        this.CUE.Token[token] = this.TokenABI.at(record.addr);
			this.AToken[token] = this.web3.toBigNumber(10).pow(record.decimals);

                        return true;
                });

                return rc.reduce((result, stat) => { return result && (stat === true) });
        }

	toEth = (wei, decimals) => new BigNumber(String(wei)).div(new BigNumber(10 ** decimals));
	toWei = (eth, decimals) => new BigNumber(String(eth)).times(new BigNumber(10 ** decimals)).floor();	

	hookDOM = document => { this.document = document; }

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
		
		return this.prepareQ(tokenList)
			.then( (Q) => 
			{
				console.log(`Queue ID: ${Q}`);

				jobObjList.map( (job) => 
				{
					this.setAccount(job.txObj.from);
					let userBalance = this.web3.eth.getBalance(this.userWallet); 

					console.log(`DEBUG: Account: ${this.userWallet}; Balance: ${userBalance}`);

					let gasCost = new BigNumber(job.txObj.gas).times(this.gasPrice); 

					if (
						job.contract !== 'ETH' 
					     && userBalance.sub(this.allocated[this.userWallet]).gte(gasCost) 
					) {
						console.log(`DEBUG: allocating gas fee from wallet: ${gasCost}`)
						this.allocated[this.userWallet] = this.allocated[this.userWallet].add(gasCost);
					} else if (
						job.contract === 'ETH' 
					     && userBalance.sub(this.allocated[this.userWallet]).sub(job.txObj.value).gte(gasCost) 
					) {
						console.log(`DEBUG: sending Ether, allocating gas fee ${gasCost} and ether ${job.txObj.value} from wallet`)
						this.allocated[this.userWallet] = this.allocated[this.userWallet].add(gasCost).add(job.txObj.value);
					} else {
						console.log(`Insufficient fund in wallet, skipping job ...`);
						return;
					}

					console.log(`DEBUG: Enqueuing ...`)
					this.enqueue({...job, Q})(this.userWallet);
				})

				return Q;
			})
			.then( (Q) => 
			{
				// load passwd.json then processQ
				let passes = require( __dirname + '/configs/passes.json');
		                return this.processQ(Q)(passes);

				// DEBUG:
		                //console.log(JSON.stringify(this.jobQ[Q], 0, 2));
				//process.exit(0);
			})
			.catch( (err) => { console.log(err); } );
	}

	// Here token is single token record from this.TokenList[symbol]
	// This function just create new jobObj without assigning QID...
	// QID will be created and assigned by this.processJobs();
	//
	// Note that if tokenSymbol is 'eth', it means to send Ether
	// using web3.eth.sendTransaction().
	send = tokenSymbol => (toAddress, amount, gasAmount) => 
	{
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
