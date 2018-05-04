'use strict';

// loading everything we need
const bcup = require('buttercup');
const { Workspace, createCredentials, FileDatasource, EntryFinder } = bcup;

const ds = new FileDatasource("./myArchive.bcup");
ds.load(createCredentials.fromPassword("masterpass")).then(function(myArchive) {
    console.log("Loaded");
    let group = myArchive.findGroupsByTitle("ElevenBuckets");
    let out = group[0].findEntriesByProperty('username', '0xd0edda5bcc34d27781ada7c97965a4ff4ac5530a');
    console.log(out[0].getProperty('password'));
});
