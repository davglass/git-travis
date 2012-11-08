Git Travis-CI integration
-------------------------

Simple git subcommand to display the current build status for the project you are in.

Install
-------

    npm -g install git-travis


Usage
-----

Change into a git repo that has builds on [Travis-CI](https://travis-ci.org/).

Then issue: `git travis` to display the latest build.


Examples
--------

Using my fork of YUI3

```
$ cd yui3
$ git travis
Fetching build status for davglass/yui3
    ✔ davglass/yui3
        Compare:  https://github.com/davglass/yui3/compare/1d1ad391f2d0...5b8b97fac95d
        ✔ 5b8b97f (3.x) Merge branch 'master' into 3.x (Dav Glass <davglass@gmail.com>) (finished)
            ✔ 446.1 node_js 0.6
            ✔ 446.2 node_js 0.8
            ✔ 446.3 node_js 0.9
```

Using the lodash repo

```
$ cd lodash
$ git travis
Fetching build status for bestiejs/lodash
    ✔ bestiejs/lodash
        Compare:  https://github.com/bestiejs/lodash/compare/33441e1b246c...28d505658407
        ✔ 28d5056 (master) Add json3.js, remove json2 and jslitmus from vendors. (John-David Dalton <john.david.dalton@gmail.com>) (finished)
            ✔ 56.1 node_js 0.6
            ✔ 56.2 node_js 0.8
```


It also supports your current working branch. It will try to locate the latest build from your current active branch and show that to you.

```
[yeti][grover (0.1.0)] ➔ git travis
Fetching build status for davglass/grover:0.1.0
    ✔ davglass/grover
        Compare:  https://github.com/davglass/grover/compare/5cbde21f2ede...13206b8df73a
        ✔ 13206b8 (0.1.0) Change for travis (Dav Glass <davglass@gmail.com>) (finished)
            ✔ 61.1 node_js 0.8
            ✔ 61.2 node_js 0.9
[yeti][grover (0.1.0)] ➔ git co master
Switched to branch 'master'
[yeti][grover (master)] ➔ git travis
Fetching build status for davglass/grover:master
    ✔ davglass/grover
        Compare:  https://github.com/davglass/grover/compare/fd8838853944...7295735b5528
        ✔ 7295735 (master) Removed deprecated 0.4 node build (Dav Glass <davglass@gmail.com>) (finished)
            ✔ 60.1 node_js 0.8
            ✔ 60.2 node_js 0.9
```

Notes
-----

This was a simple script because I liked it, I'll add some configuration to it in the future.

Build Status
------------

[![Build Status](https://secure.travis-ci.org/davglass/git-travis.png?branch=master)](https://travis-ci.org/davglass/git-travis)
