'use strict';

const Web3 = require('web3');
const net  = require('net');
const os   = require('os');
const path = require('path');

// For web3.eth, "CUE" simply pointing to existing web3 functions.
// the reason to place them under "CUE" is to unify the job queue
// interface regardless the transaction is smart contract related 
// or not. Its "CUE" type is called "Web3"; "contract" is called
// "eth".
//
// web3.eth related conditions are imported with default setups, 
// similar to smart contracts.

const web3EthFulfill = require( __dirname + '/conditions/Web3/Fulfill.js' );
const web3EthSanity  = require( __dirname + '/conditions/Web3/Sanity.js' );
const allConditions  = { ...web3EthSanity, ...web3EthFulfill };
const fs = require('fs');

// Main Class
class Wrap3 {
	constructor(cfpath)
	{
		//this.configs = require(cfpath);
		let buffer = fs.readFileSync('./.local/configs.json');
		this.configs = JSON.parse(buffer.toString());


		this.networkID = this.configs.networkID;

		this.rpcAddr = this.configs.rpcAddr;
		this.ipcPath = this.configs.ipcPath;

		this.web3 = new Web3();
                this.web3.setProvider(new Web3.providers.HttpProvider(this.rpcAddr));

		if (this.web3.version.network != this.networkID) throw(`Connected to network with wrong ID: wants: ${this.networkID}; geth: ${this.web3.net.version}`);

    		this.web3.toAddress = address => {
			let addr = String(this.web3.toHex(this.web3.toBigNumber(address)));

        		if (addr.length === 42) {
				return addr
			} else if (addr.length > 42) {
				throw "Not valid address";
			}

        		let pz = 42 - addr.length;
        		addr = addr.replace('0x', '0x' + '0'.repeat(pz));

        		return addr;
		};

    		this.ipc3 = new Web3();
    		this.ipc3.setProvider(new Web3.providers.IpcProvider(this.ipcPath, net));

		// this.CUE[type][contract][call](...args, txObj)
		// Only web3.eth.sendTransaction requires password unlock.
		this.CUE = { 'Web3': { 'ETH': {'sendTransaction': this.web3.eth.sendTransaction } } };

		// ... Thus the conditions should only need to sanity check or fulfill this function
		Object.keys(allConditions).map( (f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] } );
	}

	allAccounts = () => { return this.web3.eth.accounts; }

	ethNetStatus = () => 
	{
		let blockHeight = this.web3.eth.blockNumber;
		let blockTime   = this.web3.eth.getBlock(blockHeight).timestamp;

		return {blockHeight, blockTime};
	}

	


	addrEtherBalance = addr => { return this.web3.eth.getBalance(addr); }

	unlockViaIPC = passwd => addr => 
	{
                const __unlockToExec = (resolve, reject) => {
                        this.ipc3.personal.unlockAccount(addr, passwd, 12, (error, result) => {
                                if (error) {
                                        reject(error);
                                } else if (result != true) {
                                        setTimeout( () => __unlockToExec(resolve, reject), 500 );
                                } else {
                                        resolve(true);
                                }
                        });
                };

                return new Promise(__unlockToExec);
        }

	closeIPC = () => 
	{
                const __closeIPC = (resolve, reject) => {
                        if (this.ipc3 && this.ipc3.hasOwnProperty('net') == true) {
                                console.log("Shutdown ipc connection!!!");
                                resolve(this.ipc3.net._requestManager.provider.connection.destroy());
                        } else if (this.ipc3) {
                                console.log("Still pending to shutdown ipc connection!!!");
                                setTimeout( () => __closeIPC(resolve, reject), 500 );
                        } else {
                                console.log("Uh Oh...... (closeIPC)");
                                reject(false);
                        }
                };

                return new Promise(__closeIPC);
        }

	getReceipt = (txHash, interval) => 
	{
    		const transactionReceiptAsync = (resolve, reject) => {
        		this.web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
            			if (error) {
                			reject(error);
            			} else if (receipt == null) {
                			setTimeout( () => transactionReceiptAsync(resolve, reject), interval ? interval : 500);
            			} else {
                			resolve(receipt);
            			}
        		});
    		};

		if (Array.isArray(txHash)) {
        		return Promise.all( txHash.map(oneTxHash => this.getReceipt(oneTxHash, interval)) );
    		} else if (typeof txHash === "string") {
        		return new Promise(transactionReceiptAsync);
    		} else {
        		throw new Error("Invalid Type: " + txHash);
    		}
	}

	// txObj is just standard txObj in ethereum transaction calls
	gasCostEst = (addr, txObj) => 
	{
		if (
			txObj.hasOwnProperty('gas') == false
		     || txObj.hasOwnProperty('gasPrice') == false
		) { throw new Error("txObj does not contain gas-related information"); }

		let gasBN = this.web3.toBigNumber(txObj.gas);
                let gasPriceBN = this.web3.toBigNumber(txObj.gasPrice);
                let gasCost = gasBN.mul(gasPriceBN);

		return gasCost;
	}

	// Web3.eth.filter related functions are not delegated to external objects.
	// type is either 'pending' or 'latest'
	/*
	getTx = type =>
	{
		if (type != 'pending' && type != 'latest') throw new Error(`Invalid getTx type: ${type}`);

		this.web3.eth.filter(type)
	}
	*/
}

module.exports = Wrap3;
