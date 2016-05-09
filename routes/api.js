/* The public and private api for various things kappa */

var express = require('express');
var router = express.Router();

var postman = require('../postman');

/* The '/api' page will have a in-depth
** description on how to use the api.
** For logged in users there will also be
** a button for generating a API key if
** they have the permission 'api.generate_key'. */
router.get('/', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        postman.getKeyFor(user, function( api_key ) {
            res.render('api/api', { user: user, api_key: api_key });
        });
    });
});

/* The '/api/generate' page is used to
** generate the actual key. To generate
** the key you will need the permission
** 'api.generate_key'. */
router.get('/generate', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user.hasPermission('api.generate_key')) {
            postman.generateKeyFor(user, function( key ) {
                if (key) {
                    res.render('api/generate', { api_key: key });
                } else {
                    res.render('api/generate' );
                }
            });
        } else {
            res.render('api/generate');
        }
    });
});


/* The '/api/destroy' page is used to
** destroy an API key for a user. If the
** user have an active API key, it will
** be removed. */
router.get('/destroy', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user && user.hasPermission('api.destroy_key')) {
            postman.destroyKeyFor(user, function( success ) {
                if (success) {
                    res.redirect('/api#destroyed_key');
                } else {
                    res.redirect('/api#no_key_to_destroy');
                }
            });
        } else {
            res.redirect('/api');
        }
    });
});

module.exports = router;
