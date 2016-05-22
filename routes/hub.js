var express = require('express');
var router = express.Router();

var fs = require('fs');

var postman = require('../postman.js');
var mime = require('mime-types');       // Mime-types is THE tool for mime types


/* The main page of the site */
/* This is where we get links to everywhere else */
/* It's like google in miniature */
router.get('/', function(req, res, next) {
    postman.getProjects(function(projects) {
        res.render('hub/index', { projects: projects });
    });
});


/* The social page contains links to all my social media */
router.get('/social', function(req, res, next) {
    res.render('hub/social', { title: 'Social - Home of Josef' });
});


/* The page for login into an account. If a user is
** already logged in they are prompted to logout. */
router.get('/login', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (!user) {
            res.render('hub/login/login', { title: 'Login - Home of Josef' });
        } else {
            res.redirect('/me');
        }
    });
});


/* When a user tries to login their request are sent
** here. If they are already logged in, the request
** is denied and they are sent back. */
router.post('/login', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (!user) {
            if (req.body.username && req.body.password) {
                postman.tryLogin({
                    username: req.body.username,
                    password: req.body.password
                }, req, function( user ) {
                    if (user) {
                        res.redirect('/me'); // The user successfully signed in.
                    } else {
                        res.redirect('/login#wrong_credentials'); // The user tried to sign in with the wrong credentials. (either username or password)
                    }
                });
            } else {
                res.redirect('/login#missing_credentials'); // The user tried to sign in without filling in the login form.
            }
        } else {
            res.redirect('/me'); // The user tried to login when they already are logged in.
        }
    });
});


/* The page for registrations. If a user is already
** logged in they will be redirected to their own page. */
router.get('/register', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (!user) {
            res.render('hub/login/register', { title: 'Home of Josef - Register' });
        } else {
            res.redirect('/me');
        }
    });
});


/* When a user tries to register they are sent
** here. */
router.post('/register', function(req, res, next) {
    postman.registerUser({
        username: req.body.username,
        password: req.body.password
    }, req, function(reg) {
        if (!reg.success) {
            res.redirect('/register#' + reg.reason);
        } else {
            res.redirect('/me#welcome');
        }
    });
});


/* To logout, users are sent here. The user will be
** logged out from the current session only. */
router.get('/logout', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            postman.logout(user, req, function(success) {
                if (success) {
                    res.redirect('/');
                } else {
                    res.redirect('/#could_not_logout');
                }
            });
        } else {
            res.redirect('/');
        }
    });
});


/* A page where users can see information about
** themselves and change settings(?). */
router.get('/me', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            postman.getKeyFor(user, function( api_key ) {
                if (api_key) {
                    if (!user.hasPermission('api.key.view')) {
                        api_key = api_key.substring(0, 5) + '...';
                    }
                    res.render('hub/me', { user: user, api_key: api_key ,title: 'Home of Josef - User Info' });
                } else {
                    res.render('hub/me', { user: user, title: 'Home of Josef - User Info'});
                }
            });
        } else {
            res.redirect('/login');
        }
    });
});


/* When a user is changing their own settings
** they send a POST request to '/me'. */
router.post('/me', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            var action = req.body.action;
            if (action) {
                var actions = ['username', 'password', 'displayname'];
                if (actions.indexOf(action) > -1) {
                    if (req.body[action]) {
                        if (user.hasPermission('user.self.edit.' + action)) {
                            if (action == 'username') user[action] = req.body[action].toLowerCase();
                            else                      user[action] = req.body[action];
                            user.save(function() {
                                res.redirect('/me#changes_made');
                            });
                        } else {
                            res.redirect('/me#missing_permissions');
                        }
                    } else {
                        res.redirect('/me#missing_parameters');
                    }
                } else {
                    res.redirect('/me#invalid_form');
                }
            } else {
                res.redirect('/me#invalid_form');
            }
        } else {
            res.redirect('/me');
        }
    });
});


/* View information about another user if the user
** himself has got enough permissions. If not, he's
** redirected to '/me'. */
router.get('/user/:id', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            var otherUserId = req.params.id;
            if (otherUserId) {
                postman.getUserById(otherUserId, function( otherUser ) {
                    if (otherUser) {
                        res.render('hub/user', { user: user, otherUser: otherUser });
                    } else {
                        res.redirect('/me#unknown_user_id');
                    }
                });
            } else {
                res.redirect('/me#missing_user_id');
            }
        } else {
            res.redirect('/me#need_login');
        }
    });
});


router.post('/user/:id', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            var action = req.body.action;
            if (action) {
                var actions = ['displayname', 'username', 'password'];
                if (actions.indexOf(action) > -1) {
                    var otherUserId = req.params.id;
                    if (req.body[action]) {
                        if (otherUserId) {
                            postman.getUserById(otherUserId, function( otherUser ) {
                                if (otherUser) {
                                    if (user.hasPermission('user.other.edit.' + action)) {
                                        if (action == 'username') otherUser[action] = req.body[action].toLowerCase();
                                        else                      otherUser[action] = req.body[action];
                                        otherUser.save(function() {
                                            res.redirect(req.path + '#changes_made');
                                        });
                                    } else {
                                        res.redirect(req.path + '#missing_permissions');
                                    }
                                }
                            });
                        } else {

                        }
                    } else {
                        res.redirect(req.path + '#missing_parameters');
                    }
                } else {
                    res.redirect(req.path + '#invalid_form');
                }
            } else {
                res.redirect(req.path + '#invalid_form');
            }
        } else {
            res.redirect('/me');
        }
    });
});


/* The admin page for uploading projects and
** links to the hub as well as managing users.
** Someone that do not have access to the page
** will be greeted the same way as with a 404
** page. */
router.get('/admin', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user && user.hasPermission('administration.panel.view')) {
            // We want to list all projects so that we can either edit them or remove them
            postman.getProjects(function(projects) {
                postman.getUsers(function(users) {
                    res.render('hub/admin', { user: user, users: users, projects: projects, title: 'Home of Josef - Admin Panel' });
                });
            });
        } else {
            // Don't send no headers yo!
            next();
        }
    });
});


/* When something is administrated in /admin it
** gets sent here for server-side change */
router.post('/admin', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user && user.hasPermission('administration.panel.edit')) {
            var action = req.body.action;
            var image = req.body.image;
            if (action) {
                if (action == 'create') {
                    if (user.hasPermission('administration.project.create')) {
                        if (req.body.name && req.body.description && req.body.href && image) {
                            var publicImagePath = '/ul/' + image.hash + '.' + (mime.extension(image.type) || '');
                            postman.insertProject({ name: req.body.name, description: req.body.description, href: req.body.href, image: publicImagePath }, function(success) {
                                if (success) {
                                    fs.rename(image.path, './public' + publicImagePath);
                                    res.redirect('/admin#created_project');
                                } else {
                                    fs.unlink(image.path);
                                    res.redirect('/admin#could_not_create_project');
                                }
                            });
                        } else {
                            if (image) { fs.unlink(image.path); }
                            res.redirect('/admin#missing_parameters');
                        }
                    } else {
                        if (image) { fs.unlink(image.path); }
                        res.redirect('/admin#no_permission');
                    }
                } else if (action == 'remove') {
                    if (user.hasPermission('administration.project.remove')) {
                        if (req.body.project) {
                            postman.removeProjectById(req.body.project, function(success) {
                                if (success === false) {
                                    res.redirect('/admin#invalid_project');
                                } else if (success === null) {
                                    res.redirect('/admin#could_not_remove_project');
                                } else {
                                    res.redirect('/admin#removed_project');
                                }
                            });
                        } else {
                            res.redirect('/admin#missing_parameters');
                        }
                    } else {
                        res.redirect('/admin#no_permission');
                    }
                } else if (action == 'manage_user') {
                    if (req.body.user) {
                        postman.getUserById(req.body.user, function( otherUser ) {
                            if (otherUser) {
                                if (req.body.permissions) {
                                    // if (user.hasPermissions('user.others.edit.permissions')) {
                                    if (req.body.permissions == 'null') {
                                        otherUser.permissions = null;
                                    } else {
                                        otherUser.permissions = req.body.permissions;
                                    }
                                    // }
                                }
                                if (req.body.displayname) {
                                    // if (user.hasPermissions('user.others.edit.displayname')) {
                                        otherUser.displayname = req.body.displayname;
                                    // }
                                }
                                otherUser.save(function() {
                                    res.redirect('/admin#user_updated');
                                });
                            } else {
                                res.redirect('/admin#unknown_user_id');
                            }
                        });
                    }
                    if (user.hasPermission('user.others.edit.displayname')) {

                    }
                } else {
                    if (image) { fs.unlink(image.path); }
                    res.redirect('/admin#invalid_form');
                }
            } else {
                if (image) { fs.unlink(image.path); }
                res.redirect('/admin#invalid_form');
            }
        } else {
            // Don't send no headers yo!
            next();
        }
    });
});



module.exports = router;
