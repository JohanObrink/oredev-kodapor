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
      res.render('members', {title: 'Members', members: members });
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

router.get('/liked', function(req, res, next) {
  Promise.all([
      queries.topLiked(),
      queries.topLiked(true, true),
      queries.topLiked(true)
    ])
    .then(function (values) {
      res.render('liked', {
        title: 'Most liked members',
        likedNominal: values[0],
        likedActive: values[1],
        liked: values[2]
      });
    })
    .catch(next);  
});

router.get('/links', function(req, res, next) {
  Promise.all([
      queries.topLinks(),
      queries.topLinks(true),
      queries.topLinks(false, true),
      queries.topLinks(true, true)
    ])
    .then(function (values) {
      res.render('links', {
        title: 'Most posted links',
        links: values[0],
        domains: values[1],
        likedLinks: values[2],
        likedDomains: values[3]
      });
    })
    .catch(next);  
});

router.get('/companies', function(req, res, next) {
  Promise.all([
      queries.companies(),
      queries.companies(true)
    ])
    .then(function (values) {
      res.render('companies', {
        title: 'Companies',
        companies: values[0],
        active: values[1]
      });
    })
    .catch(next);  
});

module.exports = router;
