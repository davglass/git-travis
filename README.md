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


Notes
-----

This was a simple script because I liked it, I'll add some configuration to it in the future.


