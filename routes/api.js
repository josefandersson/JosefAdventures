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


/* PUBLIC APIs */

/* Get all projects that is listed on the
** homepage. They are returns in a list of
** objects in JSON. */
router.get('/projects/all', function(req, res, next) {
    postman.getProjects(function( projects ) {
        var output = {
            length: 0,
            projects: []
        };
        if (projects) {
            var host = req.protocol + '://' + req.headers.host;
            var p;
            for (var i in projects) {
                p = projects[i];
                output.projects.push({
                    name:        p.name,
                    description: p.descriotion,
                    url:         p.href.startsWith('/') ? host + p.href : p.href,
                    image_url: host + p.image,
                });
            }
            output.length = output.projects.length;
        }
        res.setHeader('content-type', 'text/json');
        res.send(JSON.stringify(output));
    });
});


/* Return all different permission nodes that is used
** by the application. The permissions are sorted in
** a object tree and returned as JSON. */
router.get('/users/permissions/all', function(req, res, next) {
    res.setHeader('content-type', 'text/json');
    res.send(JSON.stringify({
        "administration": {
            "panel": {
                "view": "View the administration panel.",
                "edit": "Use the administration panel."
            },
            "project": {
                "create": "Create a project to the homepage.",
                "edit": "Edit a project on the homepage.",
                "remove": "Remove a project from the homepage."
            }
        },
        "user": {
            "self": {
                "edit": {
                    "username": "Change their own username.",
                    "displayname": "Change their own displayname.",
                    "password": "Change their own password."
                },
                "delete": "Delete their own account."
            },
            "other": {
                "edit": {
                    "username": "Change someone else's username.",
                    "displayname": "Change someone else's displayname.",
                    "password": "Change someone else's password."
                },
                "view": {
                    "account": {
                        "username": "View someone else's username.",
                        "permissions": "View someone else's permissions."
                    }
                },
                "delete": "Delete someone else's account."
            }
        },
        "api": {
            "key": {
                "generate": "Generate a new API key for themselves.",
                "destroy": "Destroy their own API key.",
                "view": "View their own API key."
            }
        }
    }));
});


/* PRIVATE APIs */



module.exports = router;
