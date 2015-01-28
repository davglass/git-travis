var vows = require('vows'),
    assert = require('assert'),
    mockery = require('mockery');

var index = require('../lib/index.js');

var tests = {
    'should export': {
        topic: function() {
            return index;
        },
        'functions': function(d) {
            assert.isFunction(d.info);
            assert.isFunction(d.print);
            assert.isFunction(d.fetch);
        }
    },
    'should fetch this project': {
        topic: function() {
            index.fetch('davglass', 'git-travis', 'master', this.callback);
        },
        'and return data': function(d) {
            assert.ok(d);
            assert.equal(d.item.repository_id, 285800);
        }
    },
    'if branch is invalid': {
        topic: function() {
            var self = this;
            index.fetch('davglass', 'git-travis', 'masterXXXX', this.callback);
        },
        'and return data': function(d) {
            assert.ok(d);
            assert.equal(d.item.repository_id, 285800);
            assert.equal(d.msg, 'no recent builds on masterXXXX showing latest');
        }
    },
    'should error on invalid project': {
        topic: function() {
            index.isPublicRepository('davglass', 'XxXxXxgit-travis', this.callback);
        },
        'and return data': function(d) {
            assert.isFalse(d);
        }
    },
    'should error on valid repo but invalid build': {
        topic: function() {
            index.fetch('davglass', 'npm', 'master', function(err) {
                this.callback(null, err);
            }.bind(this));
        },
        'and return error': function(d) {
            assert.equal(d, 'Unable to locate a build for davglass/npm:master');
        }
    },
    'should fetch git info': {
        topic: function() {
            var self = this;
            index.info(function(user, repo, branch) {
                self.callback(null, {
                    user: user,
                    repo: repo,
                    branch: branch
                });
            });
        },
        'from this repo': function(d) {
            assert.ok(d);
            assert.equal(d.user, 'davglass');
            assert.equal(d.branch, 'master');
            assert.equal(d.repo, 'git-travis');
        }
    }
};

vows.describe('git-travis').addBatch(tests).export(module);
