var r = require('rethinkdb');

function connect() {
  return r.connect({db: 'kodapor'});
}

function members() {
  return connect()
    .then(function (conn) {
      return r.table('members')
        .map(function (m) {
          return {
            month: r.expr([m('joined').year().mul(100), m('joined').month()]).sum(),
            members: 1
          }
        })
        .group('month')
        .sum('members')
        .run(conn);
    })
    .then(function (cursor) { return cursor.toArray(); })
    .then(function (members) {
      var total = members.reduce(function (tot, month) {
        return tot + month.reduction;
      }, 0);

      var maxIncrease = members.reduce(function (max, month) {
        return Math.max(max, month.reduction);
      }, 0);

      return members.map(function (m, ix, arr) {
        var ym = m.group.toString();

        m.year = ym.substring(0, 4);
        m.month = ym.substring(4);
        m.increase = m.reduction;

        m.total = arr.slice(0, ix+1).reduce(function (tot, month) {
          return tot + month.increase;
        }, 0);

        m.pIncrease = Math.round(100 * m.increase / maxIncrease);
        m.pTotal = Math.round(100 * m.total / total);

        return m;
      });
    });
}

function topActive() {
  return r.connect(config)
    .then(function (conn) {
      return r.table('members')
        .filter(function (m) {
          return m.hasFields('appId');
        })
        .merge(function (m) {
          return {
            posts: r.db('kodapor').table('posts').getAll(m('appId'), {index: 'fromId'}).count(),
            comments: r.db('kodapor').table('comments').getAll(m('appId'), {index: 'fromId'}).count(),
            likes: r.db('kodapor').table('likes').getAll(m('appId'), {index: 'user_id'}).count()
          };
        })
        .merge(function (m) {
          return {
            score: r.expr([m('posts'), m('comments').mul(0.3), m('likes').mul(0.1)]).sum()
          };
        })
        .orderBy(r.desc('score'))
        .limit(20);
    });
}

function topLikers() {
  return r.connect(config)
    .then(function (conn) {
      return r.table('members')
        .filter(function (m) {
          return m.hasFields('appId');
        })
        .merge(function (m) {
          return {
            posts: r.db('kodapor').table('posts').getAll(m('appId'), {index: 'fromId'}).count(),
            comments: r.db('kodapor').table('comments').getAll(m('appId'), {index: 'fromId'}).count(),
            likes: r.db('kodapor').table('likes').getAll(m('appId'), {index: 'user_id'}).count()
          };
        })
        .merge(function (m) {
          return {
            score: r.expr([m('posts'), m('comments').mul(0.3), m('likes').mul(0.1)]).sum()
          };
        })
        .orderBy(r.desc('likes'))
        .limit(20);
    });
}

module.exports = {
  members: members,
  topActive: topActive,
  topLikers: topLikers
};