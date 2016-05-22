var express = require('express');
var router = express.Router();

var postman = require('../postman.js');


/* The home page will just have an introduction for
** the project and links to other sites. */
router.get('/', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        res.render('random/random', { user: user });
    });
});


/* To browse listed files, we use /browse.
** Here, previews of files are displayed
** (if they are images) aswell as names
** and descriptions. Previews are also
** links to a fiels /view page. */
router.get('/browse', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        var search = { };
        if (user && user.hasPermission('random.view.all')) {
        } else {
            search.visibility = {
                unlisted: false
            };
            if (user && user.hasPermission('random.view.restricted')) {
                search.visibility.level = { $lt: 2 };
            } else {
                search.visibility.level = 0;
            }
        }
        postman.models.random.find(search).exec(function(err, docs) {
            res.render('random/browse', { user: user, randoms: docs });
        });
    });
});


/* The page for viewing specific uploads. This
** will display the file in the raw format it
** was uploaded as meaning no html. This may
** also be the link used when sourcing the image
** on another site. */
router.get('/view/raw/:hash', function(req, res, next) {
    postman.getRandomByHash(req.params.hash, function( random ) {
        if (random) {
            var displayFile = function() {
                res.contentType(random.file.contentType);
                res.send(random.file.data);
            };

            if (random.visibility.level == 0) {
                // Can be viewed without login
                displayFile();
            } else {
                postman.validateSession(req, function( user ) {
                    if (user) {
                        if (random.canBeViewedBy(user)) {
                            // The user has permission to view this file
                            displayFile();
                        } else {
                            res.send('You cannot view this file.');
                        }
                    } else {
                        res.send('You cannot view this file.');
                    }
                });
            }
        } else {
            res.send('/b/#unknown_id');
        }
    });
});


/* The page for viewing the 200x200 preview of specific uploads. For random uploads that is not images (and therefore do not have a preview image) we'll just display a default image. */
router.get('/view/preview/:hash', function(req, res, next) {
    postman.getRandomByHash(req.params.hash, function( random ) {
        if (random) {
            var displayFile = function() {
                if (random.preview && random.preview.contentType) {
                    // There exists a preview files.
                    res.contentType(random.preview.contentType);
                    res.send(random.preview.data);
                } else {
                    // There exists no preview file.. :/
                    res.send('No preview.');
                }
            };

            if (random.visibility.level == 0) {
                // Can be viewed without login
                displayFile();
            } else {
                postman.validateSession(req, function( user ) {
                    if (user) {
                        if (random.canBeViewedBy(user)) {
                            // The user has permission to view this file
                            displayFile();
                        } else {
                            res.send('You cannot view this file.');
                        }
                    } else {
                        res.send('You cannot view this file.');
                    }
                });
            }
        } else {
            res.send('Unknown ID.');
        }
    });
});


/* A file can also be viewed as not raw. Then
** you'll also see things like name, description,
** tags, uploader, time uploaded and links to
** other files. */
router.get('/view/:hash', function(req, res, next) {
    postman.getRandomByHash(req.params.hash, function( random ) {
        if (random) {
            // The random was found.
            postman.get
            res.render('random/view', { random: random });
        } else {
            // The hash does not exist.
            res.redirect('/b#unknown_hash');
        }
    });
});


/* If someone is trying to view a file without specifying
** the hash of the image they are redirected. */
router.get('/view', function(req, res, next) {
    res.redirect('/b/#no_id');
});


/* An interface for uploading images to the server. Images
** will also be easier to upload by dropping them on the
** screen later on using JavaScript. */
router.get('/upload', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            res.render('random/upload', { title: 'Upload' });
        } else {
            res.redirect('/b/#no_login');
        }
    })
});


/* When an image is to be uploaded it is sent here. If the
** upload was successful the client is redirected to
** /view/<random_id>. To upload an image the user needs the
** permission random. */
router.post('/upload', function(req, res, next) {
    postman.validateSession(req, function( user ) {
        if (user) {
            postman.uploadRandom(user, {
                visibility: req.body.private ? 'private' : 'public',
                unlisted: req.body.unlisted,
                restricted: req.body.restricted,
                name: req.body.name,
                description: req.body.description,
                file: req.body.file
            }, function(data) {
                if (data.success) {
                    res.redirect('/b/view/' + data.object.hash);
                } else {
                    res.redirect('/b/#' + data.error + "_" + data.missing);
                }

                // Make sure to remove uploaded files from the tmp folder.
                req.stop = true;
                next();
            });
        } else {
            res.redirect('/b/#no_login');
        }
    });
});

module.exports = router;
