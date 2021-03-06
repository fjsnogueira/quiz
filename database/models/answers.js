var Q = require('q');
var r = require('rethinkdb');
var R = require('ramda');

var utils = require('../utils');

module.exports = function(conn) {
  return {
    initialize: initialize,
    insert: insert,
    insertGameAnswer: insertGameAnswer,
    update: update,
    findByParams: findByParams,
    deleteAll: deleteAll,
  };

  function initialize() {
    return utils.containsOrCreateTable(conn, 'answers');
  }

  function insertGameAnswer(params) {
    return findByParams(R.omit(['answerId'], params))
      .then(function(answers) {
        if (answers.length === 0) {
          return insert(params);
        } else {
          return update(answers[0].id, params);
        }
      });
  }

  function insert(params) {
    params = R.pick(['answerId', 'questionId', 'userId'], params);

    return insert(conn, params);
  }

  function update(id, params) {
    return Q.Promise(function(resolve) {
      var query = r.table('answers').get(id)
        .update(params, { returnChanges: true });

      query.run(conn, function(err, res) {
        if (err) throw err;

        resolve(params);
      });
    });
  }

  function findByParams(params) {
    return Q.Promise(function(resolve) {
      var query = r.table('answers')
        .filter(params)
        .eqJoin('userId', r.table('users'))
        .zip();

      query.run(conn, function(err, cursor) {
        if (err) throw err;

        cursor.toArray(function(err, users) {
          if (err) throw err;

          resolve(users);
        });
      });
    });
  }

  function insert(params) {
    return Q.Promise(function(resolve) {
      var query = r.table('answers').insert(params, { returnChanges: true });

      query.run(conn, function(err, result) {
        if (err)
          throw err;

        resolve(result.changes[0].new_val);
      });
    });
  }

  function deleteAll() {
    return Q.Promise(function(resolve) {
      var query = r.table('answers').delete();

      query.run(conn, function(err, result) {
        if (err)
          throw err;

        resolve();
      });
    });
  }
};
