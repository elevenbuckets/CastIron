'use strict';

// loading everything we need
const bcup = require('buttercup');
const { Workspace, createCredentials, FileDatasource } = bcup;

// CasrIron
const CastIron = require( __dirname + '/core/CastIron.js');
const ciapi = new CastIron( __dirname + '/.local/config.json');

// create archive
const myArchive = new bcup.Archive();
// create pw group
const myGroup = myArchive.createGroup("ElevenBuckets");
// create entries in group

let batch = {};
ciapi.allAccounts().map( (addr) => {
    myGroup.createEntry(addr)
	.setProperty("username", addr)
	.setProperty("password", "dc384ZU@b9lab");
})

const ds = new FileDatasource("./myArchive.bcup");
ds.save(myArchive, createCredentials.fromPassword("masterpass")).then(function() {
    console.log("Saved!");
    ciapi.closeIPC();
});
