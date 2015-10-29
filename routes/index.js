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
      res.render('members', {title: 'Earliest members', members: members });
    })
    .catch(next);  
});

router.get('/active', function(req, res, next) {
  Promise.all([queries.topActive(), queries.topLikers()])
    .spread()
    .then(function (active, likers) {
      res.render('active', {title: 'Earliest members', active: active, likers: likers});
    })
    .catch(next);  
});

module.exports = router;
