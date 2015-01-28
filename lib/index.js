#!/usr/bin/env node

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

/*jshint maxlen: 300 */

var which = require('which'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    chalk = require('chalk'),
    https = require('https'),
    prompt = require('prompt'),
    github = require('github-url-from-git'),
    parse = require('url').parse,
    Travis = require('travis-ci'),
    travis,
    good = chalk.green("✔"),
    bad = chalk.red("✖"),
    progress = chalk.yellow("♢");

/*istanbul ignore next windows support*/
if (process.platform === 'win32') {
    good = chalk.green('OK');
    bad = chalk.red('X');
    progress = chalk.yellow('O');
}

exports.good = good;
exports.bad = bad;

var getInfo = function(callback) {
    which('git', function(err, git) {
        /*istanbul ignore next "git not found*/
        if (err) {
            console.error(err);
            process.exit(1);
        }
        var child = spawn(git, ['remote', '-v']),
            user, repo;
        child.stdout.on('data', function(data) {
            data = data.toString().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('origin') === 0 && !user && !repo) {
                    line = line.replace(' (fetch)', '').replace(' (push)', '');
                    var origin;
                    /*istanbul ignore next*/
                    try {
                        origin = parse(github(line.split('\t')[1])).pathname.split('/');
                    } catch (e) {
                        console.error('Invalid Github URL');  
                        process.exit(1);
                    }
                    user = origin[1].trim();
                    repo = origin[2].trim();
                    /*istanbul ignore next "this shouldn't happen"*/
                    if (!user || !repo) {
                        throw('failed to parse git remote');
                    }
                    exec(git + ' status', {
                        cwd: process.cwd()
                    }, function(err, stdout) {
                        var branch = stdout.trim().split('\n')[0];
                        /*istanbul ignore next "only if in a detached HEAD state"*/
                        branch = branch.replace('# On branch ', '').replace('On branch ', '') || 'master';
                        callback(user, repo, branch);
                    });
                }
            });
        });
    });
};

exports.info = getInfo;

var fetch = function(user, repo, branch, callback) {
    isPublicRepository(user, repo, function (err, repositoryIsPublic) {
        /*istanbul ignore next "travis api error"*/
        if (err) {
            return callback(err);
        }

        var travis = getTravis(!repositoryIsPublic);
        if (repositoryIsPublic) {
            fetchData(user, repo, branch, travis, callback);
        } else {
            console.log();
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
            }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                travis.authenticate({
                    username: result.username,
                    password: result.password
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    console.log();
                    fetchData(user, repo, branch, travis, callback);
                });
            });
        }
    });

};

var getTravis = function(priv) {
    var travis = new Travis({
        version: '2.0.0',
        pro: priv
    });
    return travis;
};


var fetchData = function(user, repo, branch, travis, callback) {

    travis.repos.builds({
        owner_name: user,
        name: repo
    }, function (err, res) {
        /*istanbul ignore next "travis api error"*/
        if (err) {
            return callback(err);
        }
        var build = res.builds || res,
            item, other, commit, msg = null;

        /*istanbul ignore next "old travis cruft"*/
        if (build && !build.hasOwnProperty('length')) {
            callback('failed to fetch info for ' +user + '/' + repo);
            return;
        }
        
        res.commits.some(function(i) {
            var ret = (i.branch === branch);
            if (ret) {
                commit = i;
            }
            return ret;
        });
        
        if (commit) {
            res.builds.some(function(i) {
                var ret = (i.commit_id === commit.id);
                if (ret) {
                    item = i;
                }
                return ret;
            });
        }
        
        other = res.builds[0];
        commit = res.commits[0];

        if (!item) {
            msg = 'no recent builds on ' + branch + ' showing latest';
            item = other;
        }

        if (!item) {
            return callback('Unable to locate a build for ' + user + '/' + repo + ':' + branch);
        }

        callback(null, {
            msg: msg,
            item: item,
            commit: commit
        }, travis);
    
    });

};

exports.fetch = fetch;

var isPublicRepository = function (user, repo, callback) {
    https.request({
        method: 'GET',
        host: 'api.github.com',
        path: '/repos/' + user + '/' + repo,
        headers: {
            'user-agent': 'git-travis cli tool'
        }
    }, function (res) {
        var d = '';
        /*istanbul ignore next needed for the req to end*/
        res.on('data', function(c) {
            d += c;
        });
        res.on('end', function() {
            /*istanbul ignore next*/
            if (res.statusCode === 403) {
                var data = JSON.parse(d);
                console.error(res.headers);
                console.error(data.message);
                process.exit(1);
            }
            callback(null, (res.statusCode === 200));
        });
    }).end();
};

exports.isPublicRepository = isPublicRepository;

exports.print = function(user, repo, branch, callback) {
    console.log('Fetching build status for', user + '/' + repo + ':' + branch);

    var onFetch = function(err, data, travis) {
        var status, commit, item;

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

        commit = data.commit;
        item = data.item;

        status = (item.result ? bad : good);

        if (item.status === null) {
            status = progress;
        }

        console.log('   ', status, user + '/' + repo);
        travis.repos.builds({
            owner_name: user,
            name: repo,
            id: item.id
        }, function(err, res) {
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

            jobs.forEach(function(m) {
                var lang = m.config.language;
                console.log('           ', ((m.state === 'failed') ? bad : ((m.finished_at === null) ? progress : good)),
                    m.number, lang, m.config[lang], chalk.white('(' + m.state + ')'));
            });
            if (callback) {
                callback();
            }
        });
    };

    fetch(user, repo, branch, onFetch);
};

