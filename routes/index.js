var express = require('express');
var router = express.Router();
var r = require('rethinkdb');
var config = {db:'kodapor'};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function topEngagement() {
  return r.connect(config)
    .then(function (conn) {
      return r.table('posts')
        .merge(function(post) {
          return {
            comments: r.table('comments')
              .getAll(post('id'), {index: 'post_id'}).count()
          };
        })
        .orderBy(r.desc('comments'))
        .limit(10)
        .run(conn);
    });
}

router.get('/1', function(req, res, next) {
  topEngagement()
    .then(function (data) {
      res.render('1', { title: 'Top posts', data: data });
    })
    .catch(next);  
});

module.exports = router;
