var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');           // We need sessions for login management
var MongoStore = require('connect-mongo')(session); // MongoStore is used for the session manager to be able to save data in mongodb instead of sqlite3

// var formidable = require('express-formidable'); // For parsing multipart forms
var formparse = require('express-formparse'); // For parsing multipart forms

var fs = require('fs');

var api = require('./routes/api');
var hub = require('./routes/hub');
var random = require('./routes/random');

var color = require('./routes/color');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// We use express-session to handle users sessions (sessions are needed to be logged in but not if you are not logging in)
app.use(session({
    secret: 'cTI4GQVrq5iQMxjObzNl',
    name: 'dank_sesh',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: 'mongodb://localhost:27017/josefadventures',
        ttl: 60 * 60 * 24 * 7, // let's store sessions for 7 days
    })
}));

// All uploaded files goes to ./tmp_upload before they are processed
app.use(formparse.parse({
    encoding: 'utf8',
    uploadDir: './tmp_upload',
    keepExtensions: true,
    hash: 'md5',
    multiples: true,
    matching: [
        '/b/upload',
        '/admin',
    ],
}));


/* The color page will display
** the wanted color in full screen.
** The color will be /color/<css color>. */
app.use('/color', color);

/* The api is both private and
** public. All requests require
** an api-key that is obtained
** via filling in the form on
** '/api'. Generating an api-key
** requires an account. */
app.use('/api/', api);

/* The 'b' is our image board
** application for hosting random
** images, files and webms. */
app.use('/b/', random);

/* All requests to the main page
** go through our custom middleware
** 'hub'. */
app.use('/', hub);


/* To prevent or harddrive and tmp_upload folder filling
** up we remove all uploaded files here. */
app.use(function(req, res, next) {
    // Remove files.
    if (req.body) {
        // There might be files.
        if (req.body.file) {
            // There were file(s).
            if (req.body.file.path) {
                // There is only one file.
                fs.unlink(req.body.file.path);
            } else {
                // There are multiple files.
                var file, counter;
                for (var i in req.body.file) {
                    file = req.body.file[i];
                    if (file.path) {
                        counter++;
                        fs.unlink(file.path);
                    }
                }
                console.log('Removed a total of %s files that had been uploaded.', counter);
            }
        }
    }

    // If 'req.stop' is true, we will not go on to the next middleware. (using 'next()')
    if (req.stop === true) {
        // We'll stop right here!
    } else {
        // Go on to 404.
        next();
    }
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {

    /* In the future, maybe we can use subdomains for different projects
    ** instead of different base routes. It would be much cooler, but may
    ** require us to do some express haxing... :/ */
    // console.log(req.headers.host); // <-- with this, we can see the domain and subdomain

    /* Instead of a 404 page we'll just send them to the home page and tell them to stop spying on our shit */
    res.redirect('/#stop_spying_on_my_shit');
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

console.log('Done initializing.');

module.exports = app;
