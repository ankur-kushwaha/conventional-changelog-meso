
var gufg = require('github-url-from-git');
var compareFunc = require('compare-func');
var path = require('path');
var pkgJson = {};

try {
  pkgJson = require(path.resolve(
    process.cwd(),
    './package.json'
  ));
} catch (err) {
  console.error('no root package.json found');
}

var parserOpts = {
    headerPattern: /^(\w*)(?:\((.*)\))?\: (.*)$/,
    headerCorrespondence: [
      'type',
      'scope',
      'subject'
    ],
    noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
    revertPattern: /^revert:\s([\s\S]*?)\s*This reverts commit (\w*)\./,
    revertCorrespondence: ['header', 'hash']
  };
  
  function issueUrl() {
    if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {
      var gitUrl = gufg(pkgJson.repository.url);
  
      if (gitUrl) {
        return gitUrl + '/issues/';
      }
    }
  }
  
  var writerOpts = {
    transform: function(commit) {
      var discard = true;
      var issues = [];
  
      commit.notes.forEach(function(note) {
        note.title = 'BREAKING CHANGES';
        discard = false;
      });
  
      if (commit.type === 'feat') {
        commit.type = 'Features';
      } else if (commit.type === 'fix') {
        commit.type = 'Bug Fixes';
      } else if (commit.type === 'perf') {
        commit.type = 'Performance Improvements';
      } else if (commit.type === 'revert') {
        commit.type = 'Reverts';
      } else if (discard) {
        return;
      } else if (commit.type === 'docs') {
        commit.type = 'Documentation';
      } else if (commit.type === 'style') {
        commit.type = 'Styles';
      } else if (commit.type === 'refactor') {
        commit.type = 'Code Refactoring';
      } else if (commit.type === 'test') {
        commit.type = 'Tests';
      } else if (commit.type === 'chore') {
        commit.type = 'Chores';
      }
  
      if (commit.scope === '*') {
        commit.scope = '';
      }
  
      if (typeof commit.hash === 'string') {
        commit.hash = commit.hash.substring(0, 7);
      }
  
      if (typeof commit.subject === 'string') {
        var url = issueUrl();
        if (url) {
          // GitHub issue URLs.
          commit.subject = commit.subject.replace(/#([0-9]+)/g, function(_, issue) {
            issues.push(issue);
            return '[#' + issue + '](' + url + issue + ')';
          });
        }
        // GitHub user URLs.
        commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
        commit.subject = commit.subject;
      }
  
      // remove references that already appear in the subject
      commit.references = commit.references.filter(function(reference) {
        if (issues.indexOf(reference.issue) === -1) {
          return true;
        }
  
        return false;
      });
  
      return commit;
    },
    groupBy: 'type',
    commitGroupsSort: 'title',
    commitsSort: ['scope', 'subject'],
    noteGroupsSort: 'title',
    notesSort: compareFunc
  };
  
  var whatBump=function(commits) {
    var level = 2;
    var breakings = 0;
    var features = 0;
  
    commits.forEach(function(commit) {
      if (commit.notes.length > 0) {
        breakings += commit.notes.length;
        level = 0;
      } else if (commit.type === 'feat') {
        features += 1;
        if (level === 2) {
          level = 1;
        }
      }
    });
  
    return {
      level: level,
      reason: 'There are ' + breakings + ' BREAKING CHANGES and ' + features + ' features'
    };
  };

  module.exports={
      parserOpts:parserOpts,
      writerOpts:writerOpts,
      whatBump:whatBump
  };