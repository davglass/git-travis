#!/usr/bin/env node

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var travis = require('../lib/');

travis.info((user, repo, branch) => {
    travis.print(user, repo, branch, (err) => {
        if (err) {
            throw(err);
        }
    });
});

