#!/usr/bin/env node

/*jshint maxlen: 300 */

var request = require('request'),
    which = require('which'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    color = require('ansi-color').set,
    base = 'https://api.travis-ci.org/repos/',
    good = color("✔", 'green'),
    bad = color("✖", 'red'),
    progress = color("♢", 'yellow');


if (process.platform === 'win32') {
    good = color('OK', 'green');
    bad = color('X', 'red');
    progress = color('O', 'yellow');
}

exports.good = good;
exports.bad = bad;

var getInfo = function(callback) {
    which('git', function(err, git) {
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
                    var origin = line.split('\t')[1];
                    if (origin.indexOf('git@') === 0) {
                        //private repo
                        origin = origin.replace('git@github.com:', '').replace('.git', '').split('/');
                    } else {
                        origin = origin.replace('git://github.com/', '').replace('.git', '').split('/');
                    }
                    if (origin && origin.length) {
                        user = origin[0].trim();
                        repo = origin[1].trim();
                    }
                }
            });
        });
        child.on('exit', function() {
            if (!user || !repo) {
                throw('failed to parse git remote');
            }
            exec(git + ' status', {
                cwd: process.cwd()
            }, function(err, stdout) {
                var branch = stdout.trim().split('\n')[0];
                branch = branch.replace('# On branch ', '') || 'master';
                callback(user, repo, branch);
            });
        });
    });
};

exports.info = getInfo;

exports.print = function(user, repo, branch, callback) {
    console.log('Fetching build status for', user + '/' + repo + ':' + branch);
    request({
        url: base + user + '/' + repo + '/builds',
        json: true
    }, function(err, res) {
        var build = res.body.builds || res.body,
            item, commit, status;
        if (res.statusCode !== 200 || (build && !build.length)) {
            console.log('   ', bad, 'failed to fetch info for', user + '/' + repo);
            if (callback) {
                callback();
            }
            return;
        }

        
        if (Array.isArray(res.body)) {
            res.body.some(function(i) {
                var ret = (i.branch === branch);
                if (ret) {
                    item = i;
                }
                return ret;
            });
        } else {
            res.body.commits.some(function(i) {
                var ret = (i.branch === branch);
                if (ret) {
                    commit = i;
                }
                return ret;
            });

            res.body.builds.some(function(i) {
                var ret = (i.commit_id === commit.id);
                if (ret) {
                    item = i;
                }
                return ret;
            });
        }

        status = (item.result ? bad : good);

        if (item.status === null) {
            status = progress;
        }

        console.log('   ', status, user + '/' + repo);
        request({
            url: base + user + '/' + repo + '/builds/' + item.id,
            json: true
        }, function(err, body) {
            if (body.statusCode !== 200) {
                console.log('   ', bad, 'failed to fetch info for', user + '/' + repo);
                if (callback) {
                    callback();
                }
                return;
            }
            var json = body.body,
                message = json.message || json.commit.message,
                sha = json.commit.sha || json.commit,
                url = json.commit.compare_url || json.compare_url,
                status = (('status' in json) ? json.status : json.build.status),
                branch = json.branch || json.commit.branch,
                name = json.author_name || json.commit.author_name,
                email = json.author_email || json.commit.author_email,
                state = json.state || json.commit.state,
                jobs = json.matrix || json.jobs;
            
            message = message.split('\n')[0];
            sha = sha.substring(0, 7);

            console.log('       ', 'Compare: ', url);
            console.log('       ', ((status) ? bad : ((status === null) ? progress : good)), sha, '(' + branch + ')',
                message, '(' + name + ' <' + email + '>)', '(' + state + ')');

            jobs.forEach(function(m) {
                var lang = m.config.language;
                console.log('           ', ((m.result) ? bad : ((m.result === null) ? progress : good)),
                    m.number, lang, m.config[lang]);
            });
            if (callback) {
                callback();
            }
        });
    });
};

