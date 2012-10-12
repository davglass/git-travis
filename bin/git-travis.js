#!/usr/bin/env node

var request = require('request'),
    which = require('which'),
    spawn = require('child_process').spawn,
    color = require('ansi-color').set,
    base = 'https://travis-ci.org/',
    good = color("✔", 'green'),
    bad = color("✖", 'red'),
    progress = color("♢", 'yellow'),
    count = 0,
    max = 2,
    git;


if (process.platform === 'win32') {
    good = color('OK', 'green');
    bad = color('X', 'red');
    progress = color('O', 'yellow');
}


var getInfo = function(callback) {
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
        callback(user, repo);
    });
};

which('git', function(err, gitBin) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    git = gitBin;
    getInfo(function(user, repo) {
        console.log('Fetching build status for', user + '/' + repo);
        request({
            url: base + user + '/' + repo + '/builds.json',
            json: true
        }, function(err, res) {
            if (res.statusCode !== 200 || (res.body && !res.body.length)) {
                console.log('   ', bad, 'failed to fetch info for', user + '/' + repo);
                return;
            }
            var item = res.body.shift(),
                status = (item.status ? bad : good);
            if (item.status === null) {
                status = progress;
            }
            console.log('   ', status, user + '/' + repo);
            request({
                url: base + user + '/' + repo + '/builds/' + item.id + '.json',
                json: true
            }, function(err, body) {
                if (body.statusCode !== 200) {
                    console.log('   ', bad, 'failed to fetch info for', user + '/' + repo);
                    return;
                }
                var json = body.body,
                    message = json.message.split('\n')[0],
                    sha = json.commit.substring(0, 7);

                console.log('       ', 'Compare: ', json.compare_url);
                console.log('       ', ((json.status) ? bad : ((json.status === null) ? progress : good)), sha, '(' + json.branch + ')',
                    message, '(' + json.author_name + ' <' + json.author_email + '>)', '(' + json.state + ')');
                json.matrix.forEach(function(m) {
                    var lang = m.config.language;
                    console.log('           ', ((m.result) ? bad : ((m.result === null) ? progress : good)),
                        m.number, lang, m.config[lang]);
                });
            });
        });
    });
});
