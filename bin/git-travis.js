#!/usr/bin/env node

var travis = require('../lib/');

travis.info(function(user, repo, branch) {
    travis.print(user, repo, branch);
});

