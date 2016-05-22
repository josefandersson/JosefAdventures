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
        if (user) {
            if (user.hasPermission('api.key.generate')) {
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
        if (user && user.hasPermission('api.key.destroy')) {
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


/* PUBLIC APIs (no api-key required) */

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
                "view": "View their own API key.",
                "other": {
                    "generate": "Generate a new API key for another user.",
                    "destroy": "Destroy another users' API key.",
                    "view": "View another users' API key."
                }
            }
        },
        "random": {
            "view": {
                "restricted": "View all images that is set to be restricted.",
                "all": "View all images no matter the hidden level."
            },
            "upload": {
                "public": "Upload files that can be viewed by others.",
                "private": "Upload files that cannot be viewed by others.",
                "unlisted": "Make a file unlisted.",
                "restricted": "Upload files that requires the viewer to be logged in.",
                "name": "Set the name of a file.",
                "description": "Set the description of a file.",
                "tag": "Set the tags of a file."
            },
            "edit": {
                "self": {
                    "name": "Change the name of your own files.",
                    "description": "Change the description of your own files.",
                    "tag": "Set the tags of your own files."
                },
                "other": {
                    "name": "Change the name of somebody else's files.",
                    "description": "Change the description of sombody else's files.",
                    "tag": "Set the tags of somebody else's files."
                }
            }
        }
    }));
});


/* Try to login to an account using credentials. Unlike
** the login method in 'hub.js' this will not redirect
** the client but instead return json. This is a part of
** making josef adventures more futuristic and slik with
** client-sided js. */
router.post('/auth/login', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        res.setHeader('content-type', 'text/json'); // Response will be JSON
        var json = { success: false };
        if (!user) {
            if (req.body.username && req.body.password) {
                postman.tryLogin({
                    username: req.body.username,
                    password: req.body.password
                }, req, function( user ) {
                    if (user) {
                        // The user successfully signed in.
                        json = {
                            success: true,
                            message: 'Successfully signed in to the account.'
                        };
                    } else {
                        // The user tried to sign in with the wrong credentials. (either username or password)
                        json.message = 'Attempted login with the wrong credentials.';
                    }
                    res.send(JSON.stringify(json));
                });
                return;
            } else {
                // The user tried to sign in without passing both username and password.
                json.message = 'Attempted login without credentials.';
            }
        } else {
            // The user tried to login when they already are logged in.
            json.message = 'Attempted login when already signed in.';
        }
        res.send(JSON.stringify(json));
    });
});


/* Checks if the user is logged in or not. Returns an object
** with logged_in set to either true or false. */
router.get('/auth/logged', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        res.setHeader('content-type', 'text/json'); // Response will be JSON
        if (user) {
            res.send('{"logged_in":true}');
        } else {
            res.send('{"logged_in":false}');
        }
    });
})


/* LOGIN REQUIRED APIs (no api-key required) */

/* Returns info about their own account. Information
** includes uid, username, displayname and permissions. */
router.get('/users/me', function(req, res, next) {
    req.stop = true;
    postman.validateSession(req, function( user ) {
        res.setHeader('content-type', 'text/json');
        if (user) {
            postman.getKeyFor(user, function( api_key ) {
                if (api_key) {
                    if (!user.hasPermission('api.key.view')) {
                        api_key = api_key.substring(0, 5) + '...';
                    }
                }
                res.send(JSON.stringify({
                    id:          user.id,
                    username:    user.username,
                    displayname: user.displayname,
                    permissions: user.permissions,
                    api_key:     api_key,
                }));
            });
        } else {
            res.send(JSON.stringify({ error: 'no_login' }));
        }
    });
});


/* Logs out of the current user. Returns true if user
** could sign out and false if user could not sign out. */
router.get('/auth/logout', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        res.setHeader('content-type', 'text/json');
        if (user) {
            postman.logout(user, req, function(success) {
                if (success) {
                    res.send('{"success":true}'); // User signed out successfully.
                } else {
                    res.send('{"success":false}'); // Something went wrong.
                }
            });
        } else {
            res.send('{"success":false}'); // User is not singed in.
        }
    });
});


/* PRIVATE APIs (api-key required) */

module.exports = router;
