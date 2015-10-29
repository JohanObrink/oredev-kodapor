var express = require('express'),
  router = express.Router(),
  r = require('rethinkdb'),
  queries = require('../services/queries');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/members', function(req, res, next) {
  queries.members()
    .then(function (members) {
      res.render('members', {title: 'Members development', members: members });
    })
    .catch(next);  
});

router.get('/first', function(req, res, next) {
  queries.first()
    .then(function (members) {
      res.render('first', {title: 'First members', members: members });
    })
    .catch(next);  
});

router.get('/active', function(req, res, next) {
  Promise.all([
      queries.topActive(),
      queries.topActive('posts'),
      queries.topActive('comments'),
      queries.topActive('likes'),
      queries.inactive()
    ])
    .then(function (values) {
      res.render('active', {
        title: 'Most active members',
        score: values[0],
        posts: values[1],
        comments: values[2],
        likes: values[3],
        inactive: values[4]
      });
    })
    .catch(next);  
});

module.exports = router;
