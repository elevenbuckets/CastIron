'use strict';
 
const uuid  = require('uuid/v4');
const Wrap3 = require( __dirname + '/Wrap3.js' );
const bcup  = require('buttercup');
const { createCredentials, FileDatasource } = bcup;
const masterpw = new WeakMap();

// Main Class
class JobQueue extends Wrap3 {
        constructor(cfpath)
        {
                super(cfpath);

	        this.version = '1.0'; // API version
        	this.jobQ = {};	// Should use setter / getter
                this.rcdQ = {};	// Should use setter / getter
	
		this.condition = this.configs.condition || null; // 'sanity' or 'fulfill'
		this.archfile  = this.configs.passVault || null;
	
		if (this.archfile !== null) {
			this.ds = new FileDatasource(this.archfile);
		} else {
			this.ds = {};
		}
		
		masterpw.set(this, {passwd: null});
        }

	password = (value) => { masterpw.get(this).passwd = value };

	// return promise
	validPass = () => 
	{
	       let pw = masterpw.get(this).passwd;
       	       return this.ds.load(createCredentials.fromPassword(pw)).then( (myArchive) => 
		      {
			 return true;
		      })
	              .catch( (err) => 
		      { 
			 return false; 
		      });
	}

	managedAddress = (address) => 
	{
	       let pw = masterpw.get(this).passwd;
       	       return this.ds.load(createCredentials.fromPassword(pw)).then( (myArchive) => 
		      {
			let vaults = myArchive.findGroupsByTitle("ElevenBuckets")[0];
			let passes = undefined;

			try {
				passes = vaults.findEntriesByProperty('username', address)[0].getProperty('password');
			} catch(err) {
				console.log(err);
				passes = undefined;
			}

			return typeof(passes) === 'undefined' ? {[address]: false} : {[address]: true};
		      })
	}

	// JobObj: {type: 'Token', contract: 'TKA', call: 'transfer', args: ['p1', 'p2'], txObj: {from: issuer, gas: 180000}, Q, p1, p2}
	//
	// Type is either "Token" or "Exchange", mind for capital initials; args is an array representing arguments to be passed into smart
	// contract function call (JobObj.call), the array itself are actually filled with string literals with real variables passed in as
	// elsements of JobObj of same names. The args array basically just records the order of vaiables during call. This allows conditional 
	// functions (TBD, see below) to access these variables easily.
	//
	// Conditional functions follows naming conventions of <type>_<call>_<condition>, where "condition" is either "sanity" or "fulfill"
	// for now. these conditional functions will be called with same arguments as enqueue itself (addr, jobObj). Currently, it is not yet decided
	// how to properly pass additional variables into conditional functions, with the exception of 'fulfiller', which is the wallet address to
	// be used to execute any fulfillment transactions as the results of 'fulfill' conditional function calls; This implies that 'fulfill' conditional
	// function may need to add new jobs into the queue, and it does so by prepending jobs to the one being checked.
	//
	// Note 2018.08.30: fulfiller temorarily removed from class. Support TBD. --Jason Lin
	//
	// Before actual conditional function implementation, a simple class similar to order Cast-Iron queue, BEhavior.js will be used to test
	// the basic queue functionalities.
	enqueue = jobObj => addr => {
                let {Q, ...job} = jobObj;

                if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined' || this.condition === null) { 
                        throw new Error("Queue error (enqueue)");
                } else if (typeof(this.jobQ[Q][addr]) === 'undefined') {
                        this.jobQ[Q][addr] = [];
                } 
		
		//conditional function call
		let cfname = `${jobObj.type}_${jobObj.call}_${this.condition}`;

		if (typeof(this[cfname]) === 'undefined') {
			throw new Error(`Invalid jobObj: ${JSON.stringify(jobObj, 0, 2)}`);
		} else if (typeof(this.CUE[jobObj.type]) === 'undefined' || typeof(this.CUE[jobObj.type][jobObj.contract]) === 'undefined') {
			throw new Error(`Invalid or unknown contract ABI: ${JSON.stringify(jobObj, 0, 2)}`);
		} else if (this[cfname](addr, jobObj) == true) {
			let args = job.args.map((e) => 
			{ 
				if (typeof(job[e]) === 'undefined') {
					throw new Error(`jobObj missing element ${e} for ${cfname} action`); 
				}

				return job[e]; 
			});

			this.jobQ[Q][addr].push({...job, args}); // replace 

			return true;
		} else {
			return false;
		}
        }

	// jobObjMap: {addr1: jobObj1, addr2: jobObj2, ...}
	// TODO: improve this so that single address can perform multiple jobs within single batchJobs call.
	batchJobs = Q => jobObjMap =>
	{
                if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined') throw "Queue error (batchJobs)";

		// return promise
		const __atOnce = jobObjMap => (resolve, reject) =>
		{
			let rc = Object.keys(jobObjMap).map( (addr) => { this.enqueue(jobObjMap[addr])(addr) });
			if ( rc.reduce((result, stat) => { return result && (stat === true) }) ) {
				resolve(true);
			} else {
				reject(rc);
			}

		}

	        return new Promise(__atOnce(jobObjMap));
	}

	prepareQ = timeout => 
	{
	        const __initQueue = (resolve, reject) => {
		 	if (Object.keys(this.jobQ).length !== 0) {
		 		setTimeout(() => __initQueue(resolve, reject), timeout);
			} else {
				let myid = uuid();
				this.jobQ[myid] = {};
				this.rcdQ[myid] = [];

				resolve(myid);
			}
	        };

	        return new Promise(__initQueue);
	}

	processQ = Q => {
		let pw = masterpw.get(this).passwd;

		if (Q == undefined) {
			throw "processQ: Invalid QID!!!";
		} else if (typeof(this.jobQ[Q]) === 'undefined' || this.jobQ[Q].length === 0|| pw === null) {
			delete this.jobQ[Q];
			throw "Queue error (processQ), skipping...";
		}

		return this.ds.load(createCredentials.fromPassword(pw)).then( (myArchive) => {
			let vaults = myArchive.findGroupsByTitle("ElevenBuckets")[0];
		        let results = Promise.resolve(); 

	        	Object.keys(this.jobQ[Q]).map((addr) => {
				let passes;

				try {
					passes = vaults.findEntriesByProperty('username', addr)[0].getProperty('password');
				} catch(err) {
					passes = undefined;
				}
	
	                	if (typeof(passes) === 'undefined' || passes.length == 0) {
					delete this.jobQ[Q][addr];
					console.warn("no password provided for address " + addr + ", skipped ...");
	
	                        	return;
	                	}
	
		                results = results.then( () => {
	        	                return this.unlockViaIPC(passes)(addr).then(() => {
	                	                this.jobQ[Q][addr].map((o, id) => 
						{
							try {
		                        	        	let tx = this.CUE[o.type][o.contract][o.call](...o.args, o.txObj);
								console.debug(`QID: ${Q} | ${o.type}: ${addr} doing ${o.call} on ${o.contract}, txhash: ${tx}`);
	
							  	if (typeof(o['amount']) !== 'undefined') {
							    		this.rcdQ[Q].push({id, addr, tx, 
										'type': o.type, 
										'contract': o.contract, 
										'call': o.call, ...o.txObj, 
										'amount': o.amount
									});
							  	} else {
							    		this.rcdQ[Q].push({id, addr, tx, 
										'type': o.type, 
										'contract': o.contract, 
										'call': o.call, ...o.txObj,
									        'amount': null
									});
							  	}
							} catch(error) {
								this.rcdQ[Q].push({id, addr, error,
									'tx': null,
								        'type': o.type, 
								        'contract': o.contract, 
								        'call': o.call, ...o.txObj, 
								        'amount': typeof(o['amount']) !== 'undefined' ? o.amount : null
								});
								throw(error);
							}
	                                	})
		                        }).then( () => {
	        	                        this.ipc3.personal.lockAccount(addr, (error, r) => {
	                        	                if (error) {
								this.rcdQ[Q].push({
								  	'id': null, addr, 
								  	'tx': null, error, 
								  	'type': 'ipc3', 
								  	'contract': 'personal', 
								  	'call': 'lockAccount',
								  	'amount': null
							  	});
								throw(error);
							}
	
	                	                        console.debug(`** account: ${addr} is now locked`);
							delete this.jobQ[Q][addr];
		                                });
	        	                })
	
	                	}).catch( (error) => { console.error(error); delete this.jobQ[Q][addr]; return Promise.resolve(); } );
	        	}); 
		
			results = results.then(() => { return this.closeQ(Q) });

			return results;

		}).catch( (error) => { console.log(error); delete this.jobQ[Q]; return this.closeQ(Q); });
	}

	closeQ = Q => {
		if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined') throw "Queue error (closeQ)";

		const __closeQ = (resolve, reject) => {
			if (Object.keys(this.jobQ[Q]).length == 0) {
				delete this.jobQ[Q];
				resolve(Q);
			} else if (Object.keys(this.jobQ[Q]).length > 0 && this.ipc3 && this.ipc3.hasOwnProperty('net') == true){
				setTimeout( () => __closeQ(resolve, reject), 500 );
			} else {
				console.error("Uh Oh...... (closeQ)");
				reject(false);
			}
		};

		return new Promise(__closeQ);
	};
}

module.exports = JobQueue;
