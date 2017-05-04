#!/usr/bin/env node
'use strict';

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

/*jshint maxlen: 300 */

const which = require('which'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    chalk = require('chalk'),
    https = require('https'),
    prompt = require('prompt'),
    Travis = require('travis-ci');

let good = chalk.green("✔"),
    bad = chalk.red("✖"),
    progress = chalk.yellow("♢");

/*istanbul ignore next*/
if (process.platform === 'win32') {
    good = chalk.green('OK');
    bad = chalk.red('X');
    progress = chalk.yellow('O');
}

let travis;

exports.good = good;
exports.bad = bad;

const parseRepo = (data, callback) => {
    let user, repo, called;
    data = data.toString().split('\n');
    data.forEach(function(line) {
        if (line.indexOf('origin') === 0 && !user && !repo) {
            line = line.replace(' (fetch)', '').replace(' (push)', '');
            var origin = line.split('\t')[1];
            if (origin.indexOf('git@') === 0) {
                //private repo
                origin = origin.replace('git@github.com:', '').replace('.git', '').split('/');
            } else if (origin.indexOf('git://') === 0) {
                origin = origin.replace('git://github.com/', '').replace('.git', '').split('/');
            } else if (origin.indexOf('https://') === 0) {
                origin = origin.replace('https://github.com/', '').replace('.git', '').split('/');
            }
            if (origin && Array.isArray(origin) && origin.length) {
                user = origin[0].trim();
                repo = origin[1].trim();
                if (!user || !repo) {
                    throw('failed to parse git remote');
                }
                called = true;
                callback(user, repo);
            }
        }
    });
    if (!called) {
        throw('failed to parse git remote');
    }
};

exports.parseRepo = parseRepo;

const getInfo = (callback) => {
    which('git', (err, git) => {
        /*istanbul ignore if*/
        if (err) {
            console.error(err);
            process.exit(1);
        }
        var child = spawn(git, ['remote', '-v']);
        child.stdout.on('data', (data) => {
            parseRepo(data, (user, repo) => {
                exec(git + ' status', {
                    cwd: process.cwd()
                }, (err, stdout) => {
                    var branch = stdout.trim().split('\n')[0];
                    /*istanbul ignore next*/
                    branch = branch.replace('# On branch ', '').replace('On branch ', '') || 'master';
                    callback(user, repo, branch);
                });
            });
        });
    });
};

exports.info = getInfo;

const fetch = (user, repo, branch, _t, callback) => {
    /*istanbul ignore next*/
    if (typeof callback === 'undefined') {
        callback = _t;
        _t = null;
    }
    /*istanbul ignore next*/
    const t = _t || travis;
    t.repos(user, repo).builds().get((err, res) => {
        /*istanbul ignore if*/
        if (err) {
            return callback(err);
        }
        /*istanbul ignore next*/
        var build = res.builds || res,
            item, other, commit, msg = null;

        /*istanbul ignore if*/
        if (build && !build.hasOwnProperty('length')) {
            callback('failed to fetch info for ' +user + '/' + repo);
            return;
        }
        
        /*istanbul ignore if - Old API */
        if (Array.isArray(res)) {
            res.some((i) => {
                var ret = (i.branch === branch);
                if (ret) {
                    item = i;
                }
                return ret;
            });
            other = res[0];
        } else {
            res.commits.some((i) => {
                var ret = (i.branch === branch);
                if (ret) {
                    commit = i;
                }
                return ret;
            });
            
            commit && res.builds.some((i) => {
                var ret = (i.commit_id === commit.id);
                /*istanbul ignore next*/
                if (ret) {
                    item = i;
                }
                return ret;
            });

            other = res.builds[0];
            commit = res.commits[0];
        }

        if (!item) {
            msg = 'no recent builds on ' + branch + ' showing latest';
            item = other;
        }

        if (!item) {
            return callback('no item found');
        }

        callback(null, {
            msg: msg,
            item: item,
            commit: commit
        });
    });

};

exports.fetch = fetch;

var isPublicRepository = (user, repo, callback) => {
    https.request({
        method: 'HEAD',
        host: 'api.github.com',
        path: '/repos/' + user + '/' + repo,
        headers: {
            'user-agent': 'git-travis cli tool'
        }
    }, (res) => {
        //Empty Data listener
        res.on('data', () => {});
        if (res.statusCode === 200) {
            return callback(null, true);
        } else if (res.statusCode === 404) {
            return callback(null, false);
        } else {
            return callback('unknown');
        }
    }).end();
};

exports.print = (user, repo, branch, callback) => {
    console.log('Fetching build status for', user + '/' + repo + ':' + branch);

    var onFetch = (err, data) => {
            var status, item;

            if (err) {
                if (callback) {
                    return callback(err);
                } else {
                    throw err;
                }
            }

            if (data.msg) {
                console.log('  ', data.msg);
            }

            item = data.item;

            status = (item.result ? bad : good);

            if (item.status === null) {
                status = progress;
            }

            console.log('   ', status, user + '/' + repo);
            travis.repos(user, repo).builds(item.id).get((err, res) => {
                if (err) {
                    console.log('   ', bad, 'failed to fetch info for', user + '/' + repo);
                    if (callback) {
                        callback();
                    }
                    return;
                }
                var json = res,
                    message = json.message || json.commit.message,
                    sha = json.commit.sha || json.commit,
                    url = json.commit.compare_url || json.compare_url,
                    branch = json.branch || json.commit.branch,
                    name = json.author_name || json.commit.author_name,
                    email = json.author_email || json.commit.author_email,
                    state = json.state || json.build.state,
                    jobs = json.matrix || json.jobs;

                message = message.split('\n')[0];
                sha = sha.substring(0, 7);

                console.log('       ', 'Compare: ', url);
                console.log('       ', ((state === 'failed') ? bad : ((state === 'passed') ? good: progress)), sha, '(' + branch + ')',
                message, '(' + name + ' <' + email + '>)', chalk.white('(' + state + ')'));

                jobs.forEach((m) => {
                    var lang = m.config.language;
                    console.log('           ', ((m.state === 'failed') ? bad : ((m.finished_at === null) ? progress : good)),
                    m.number, lang, m.config[lang], chalk.white('(' + m.state + ')'));
                });
                if (callback) {
                    callback();
                }
            });
        },
        travisAuthWithUsernamePassword = (callback) => {
            prompt.start();
            prompt.get({
                properties: {
                    username: {
                        required: true
                    },
                    password: {
                        required: true,
                        hidden: true
                    }
                }
            }, (err, result) => {
                if (err) {
                    return callback(err);
                }

                var auth = {
                    username: result.username,
                    password: result.password
                };
                callback(null, auth);
            });
        },
        getGHToken = () => {
            return process.env.GITHUB_ACCESS_TOKEN;
        },
        travisAuthWithToken = (callback) => {
    // https://www.npmjs.com/package/travis-ci#authentication
            var auth = {
                github_token: getGHToken()
            };
            callback(null, auth);
        },
        hasToken = !!getGHToken();

    isPublicRepository(user, repo, (err, repositoryIsPublic) => {
        if (err) {
            return callback(err);
        }

        travis = new Travis({
            version: '2.0.0',
            pro: !repositoryIsPublic
        });

        if (repositoryIsPublic) {
            fetch(user, repo, branch, onFetch);
        } else {
            var travisAuthMethod = hasToken ?
                travisAuthWithToken :
                travisAuthWithUsernamePassword;

            travisAuthMethod((err, authMethod) => {
                if (err) {
                    return callback(err);
                }

                travis.authenticate(authMethod, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    console.log();
                    fetch(user, repo, branch, onFetch);
                });
            });
        }
    });
};
