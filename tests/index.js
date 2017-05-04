
const assert = require('assert');

const gt = require('../lib/');

describe('git-travis', () => {
    it('should be present', () => {
        assert.ok(gt);
        assert.ok(gt.good);
        assert.ok(gt.bad);
        assert.equal(typeof gt.info, 'function');
        assert.equal(typeof gt.print, 'function');
        assert.equal(typeof gt.fetch, 'function');
    });
});

describe('getInfo', () => {
    it('should return data about repo', (done) => {
        gt.info((user, repo) => {
            assert.equal(user, 'davglass');
            assert.equal(repo, 'git-travis');
            done();
        });
    });

    it('should parse git://', () => {
        const str = `origin	git://github.com/davglass/git-travis.git (fetch)`;
        gt.parseRepo(str, (user, repo) => {
            assert.equal(user, 'davglass');
            assert.equal(repo, 'git-travis');
        });
    });

    it('should parse https://', () => {
        const str = `origin	https://github.com/davglass/git-travis.git (fetch)`;
        gt.parseRepo(str, (user, repo) => {
            assert.equal(user, 'davglass');
            assert.equal(repo, 'git-travis');
        });
    });

    it('should throw on bad info', () => {
        const str = `origin	http://github.com:davglass/git-travis.git (fetch)`;
        assert.throws(() => {
            gt.parseRepo(str);
        }, /failed to parse git remote/);
    });

    it('should throw on bad info for user/repo', () => {
        const str = `origin	https://github.com:davglass/git-travis.git (fetch)`;
        assert.throws(() => {
            gt.parseRepo(str);
        }, /failed to parse git remote/);
    });
});

describe('fetch', () => {
    const Travis = require('travis-ci');
    const travis = new Travis({
        version: '2.0.0'
    });

    it('should error on bad repo', (done) => {
        gt.fetch('davglass', 'foobar', 'baz', travis, (err) => {
            assert.equal(err, 'no item found');
            done();
        });
    });

    it('should return info for bad branch', (done) => {
        gt.fetch('davglass', 'git-travis', 'baz', travis, (err, info) => {
            assert.ok(info);
            assert.ok('msg' in info);
            assert.ok('commit' in info);
            assert.ok('item' in info);
            done();
        });
    });

    it('should return repo info', (done) => {
        gt.fetch('davglass', 'git-travis', 'master', travis, (err, info) => {
            assert.ok(info);
            assert.ok('msg' in info);
            assert.ok('commit' in info);
            assert.ok('item' in info);
            done();
        });
    });
});

describe('print', () => {
    it('should print error', (done) => {
        gt.print('davglass', 'st-logger', 'master', () => {
            done();
        });
    });

    it('should print', (done) => {
        gt.print('davglass', 'git-travis', 'master', () => {
            done();
        });
    });
});
