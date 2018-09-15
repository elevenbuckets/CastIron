'use strict';

// CastIron instance
const Wallet = require( __dirname + '/core/CastIron.js');
const WT     = new Wallet(__dirname + '/.local/config.json');

// Preparation with gasOracle fetch
//let stage = WT.gasPriceEst();

const __delay = (t, v) => { return new Promise((resolve) => { setTimeout(resolve.bind(null, v), t) }); }
const __reconnect = (p, ciapi, trial, retries) => { // p: promise, ciapi: castiron instance, trial: current retry, retries: max retry times
	return p
	.then(() => { return ciapi.connect(); })
	.then((rc) => {
		if (!rc && trial < retries) {
			trial++;
			console.log(`retrying (${trial}/${retries})`);
			return __delay(5000, null).then(() => { return __reconnect(p, ciapi, trial, retries); });
		} else if (!rc && trial >= retries) {
			throw("Please check your geth connection");
		} else if (rc) {
			return p;
		}

	})
	.catch( (err) => { console.log(err); process.exit(1); });
}
const __reconfig = (p, ciapi) => {
	return p
	.then(() => { return ciapi.configured() })
	.then((rc) => {
		console.log("config:");
		console.log(ciapi.configs);
		console.log("networkID:" + ciapi.networkID);
		if (!rc) {
			console.log("CastIron will only continue when instance is configured ...");
			return __delay(5000, null).then(() => { return __reconfig(p, ciapi); });
		} else if (rc) {
			return p;
		}
	})
}
const __checkAddress = (p, ciapi, result) => {
	
	 ciapi.allAccounts().map((addr) => 
		{
			console.log(`checking address ${addr}`);
		 	p = p.then(() => ciapi.managedAddress(addr))
		 	     .then((obj) => { result = {...result, ...obj }; return result; })
		});

	 return p;
}

// MAIN
const retries = 3;
let trial = 0;
let stage = Promise.resolve();

stage = __reconfig(stage, WT);
stage = __reconnect(stage, WT, trial, retries);
stage.then( () => {
	console.log("connected ... checking password ...")
	WT.password('masterpass');
	return WT.validPass();
})
.then( (r) => {
	console.log("Main Action")
	if (r === false) throw "wrong master password";
	let result = {};
	stage = __checkAddress(stage, WT, result);

	return stage;
})
.then( (r) =>
{
	console.log(`results:`);
	console.log(JSON.stringify(r,0,2));
	WT.closeIPC();
})
.catch( (err) => { console.log(err); process.exit(1); });
