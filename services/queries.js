var r = require('rethinkdb'),
  httpUtil = require('./httpUtil');

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

function first() {
  return connect()
    .then(function (conn) {
      return r.table('members')
        .orderBy('joined')
        .limit(10)
        .run(conn);
    });
}

function topActive(by) {
  var query = r.table('members')
    .filter(function (m) {
      return m.hasFields('appId');
    });
  if(!by) {
    query = query
      .merge(function (m) {
        return {
          score: r.expr([m('posts'), m('comments').mul(0.5), m('likes').mul(0.1)]).sum()
        };
      });
  }
  query = query.orderBy(r.desc(by || 'score'))
    .limit(10);

  return connect()
    .then(function (conn) {
      return query.run(conn);
    });
}

function topLiked(relative, active) {
  var orderBy = relative ? 'pLikedBy' : 'likedBy';
  var limit = active ? 200 : 0;
  return connect()
    .then(function (conn) {
      return r.table('members')
        .filter(function (m) {
          return r.expr([m('posts'), m('comments')]).sum().gt(limit);
        })
        .merge(function (m) {
          return {
            likedPosts: r.db('kodapor')
              .table('posts')
              .getAll(m('appId'), {index: 'fromId'})
              .sum('like_count'),
            likedComments: r.db('kodapor')
              .table('posts')
              .getAll(m('appId'), {index: 'fromId'})
              .sum('comment_like_count')
          };
        })
        .merge(function (m) {
          return {
            likedBy: r.expr([m('likedPosts'), m('likedComments')]).sum(),
            pLikedPosts: r.branch(m('posts').gt(0), m('likedPosts').div(m('posts')), 0),
            pLikedComments: r.branch(m('comments').gt(0), m('likedComments').div(m('comments')), 0),
            pLikedBy: r.expr([m('likedPosts'), m('likedComments')]).sum()
              .div(r.expr([m('posts'), m('comments')]).sum())
          };
        })
        .orderBy(r.desc(orderBy))
        .limit(20)
        .run(conn)
        .map(function (member) {
          member.pLikedPosts = Math.round(100 * member.pLikedPosts);
          member.pLikedComments = Math.round(100 * member.pLikedComments);
          member.pLikedBy = Math.round(100 * member.pLikedBy);
          return member;
        });
    });
}

function inactive() {
  return connect()
    .then(function (conn) {
      return r.table('members')
        .filter(function (m) {
          return r.expr([m('posts'), m('comments'), m('likes')]).sum().eq(0)
        })
        .count()
        .run(conn);
    });
}

function companies(active) {
  return connect()
    .then(function (conn) {
      var query = r.table('members');
      if(active) {
        query = query
          .filter(function (m) {
            return r.expr([m('posts'), m('comments'), m('likes')]).sum().gt(0);
          });
      }
      query = query
        .group('company')
        .count()
        .ungroup()
        .orderBy(r.desc('reduction'))
        .limit(20);
      return query.run(conn)
        .then(function (groups) {
          return groups.map(function (g) {
            return {
              name: g.group || '-',
              members: g.reduction
            };
          });
        });
    });
}

function topLinks(byDomain, byLikes) {
  var query = r.table('posts')
    .filter(function (p) {
      return p.hasFields('link')
    });

  if(byDomain) {
    query = query.merge(function (p) {
      return {
        domain: p('link').split('/').slice(0,3).toJsonString()
      }
    });
  }
  
  query = query
    .group(byDomain ? 'domain' : 'link');
  
  if(byLikes) {
    query = query.sum('like_count');
  } else {
    query = query.count();
  }

  query = query
    .ungroup()
    .orderBy(r.desc('reduction'))
    .limit(10)
    .map(function (g) {
      return {
        link: g('group'),
        count: g('reduction')
      }
    });

  return connect()
    .then(function (conn) {
      return query.run(conn);
    })
    .then(function (links) {
      return links.map(function (link) {
        link.link = link.link.replace(/[\[\"\]]/g, '').replace(':,,', '://');
        return link;
      });
    })
    /*.then(function (links) {
      return Promise.all(links.map(function (link) {
        return httpUtil.loadSummary(link);
      }));
    })*/;
}

module.exports = {
  first: first,
  members: members,
  topActive: topActive,
  topLiked: topLiked,
  inactive: inactive,
  companies: companies,
  topLinks: topLinks
};