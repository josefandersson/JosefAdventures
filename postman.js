/* This file is dedicated to talking with the database */
/* Right now we use MongoDB (because it is great!) */

var mongoose = require('mongoose');    // Mongoose is an ORM for talking with MongoDB
var Schema = mongoose.Schema;          // The schema is used for modelling schemas in the database
var forge = require('node-forge');     // Forge does digest hashing
var crypto = require('crypto');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/josefadventures');

var fs = require('fs');                 // Removing and moving uploaded files
var formidable = require('formidable'); // Handling and parsing incoming forms

/* Mongoose schemas */

// Schema for storing our projects
var projectSchema = new Schema({
    name:        { type: String },
    description: { type: String },
    href:        { type: String },
    image:       { type: String }   // A path to a background image (300px*112px)
});

// Schema for storing our random files
var randomSchema = new Schema({
    name:        { type: String },
    description: { type: String },
    hash:        { type: String },
    upload:      { type: Date, default: Date.now },
    uploader:    { type: Schema.Types.ObjectId, ref: 'user' },
    attached: {
        extension: { type: String },
        filetype:  { type: String },
        file:      { data: Buffer, contentType: String }
    }
});

// Schema for storing a random files' tags
var tagSchema = new Schema({
    name:        { type: String },
    random_file: { type: Schema.Types.ObjectId, ref: 'random' }
});

// Schema for storing our users
var userSchema = new Schema({
    username:     { type: String, required: true, unique: true }, // The username is always converted to lowercase
    displayname:  { type: String, required: true, unique: true }, // The displayname is the name that is seen by others, with upper and lower cased letters
    password:     { type: String, required: true },               // The password will be hashed together with the salt when stored
    salt:         { type: String, required: true },               // The 64 character long salt
    /* The permissions variable contains a json string
    ** with permissions the user has. If the string is
    ** null it means the user has no elevated priveleges.
    ** The json string will contain an array called
    ** permissions with all the permissions that the user
    ** has listed. It will also contain an anti_permissions
    ** array with permissions that the user does not have. */
    permissions: { type: String, default: null },
});

/*
Permissions tree:

administration:
    panel:
        view - view settings in the panel
        edit - edit settings in the panel
    project:
        create - create a project on the home page
        remove - remove a project from the home page
        edit - edit a project on the home page
user:
    self:
        edit:
            username - change their own username
            displayname - change their own username
            password - change their own password
        delete - remove their own account
    others:
        view_information - the others information (displayname, username)
        edit:
            username - change others usernames
            displayname - change others displaynames
            password - change others password
        delete - remove others accounts
random_files:
    upload - upload a file to /b/
    edit - edit a files information on /b/ (tags, description, name)
    remove - remove a file from /b/
api:
    generate_key - is the user allowed to generate a key
*/

/* Takes unsaltedPassword and hashes it with the user's
** salt to see if it is the correct password. Returns
** true if true, else, false. */
userSchema.virtual('isPassword').get(function() {
    return function(unsaltedPassword) {
        if (unsaltedPassword) {
            var pw = Postman.saltPassword(unsaltedPassword, this.salt);
            if (pw == this.password) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };
});

/* Checks to see if the user has the permission 'permission'.
** Permissions can be stored as category.* for all category.example1,
** category.example2 and category.example3 istead of individual
** checks. */
userSchema.virtual('hasPermission').get(function() {
    return function(permission) {
        if (this.permissions) {
            if (Postman.isPermissionFormat(permission)) {
                var splitPerms = permission.split('.');
                var json = JSON.parse(this.permissions);

                // Check if there's any anti_permissions for the permission
                var section, noAntiPerm = false, part = json.anti_permissions;
                if (part == '*') return false;
                for (var i in splitPerms) {
                    if (!part) {
                        noAntiPerm = true;
                        break;
                    } else {
                        section = splitPerms[i];
                        if (section == '*') {
                            return false; // Shieet
                        } else {
                            part = part[section];
                            if (!part) {
                                noAntiPerm = true;
                            }
                        }

                    }
                }

                // If there were no anti_permissions for the permission we will see if there are any permissions for the permission
                if (noAntiPerm) {
                    part = json.permissions;
                    if (part == '*') return true;
                    for (var i in splitPerms) {
                        if (!part) {
                            return false; // User hasn't got the permission
                        } else {
                            section = splitPerms[i];
                            if (part === true) {
                                return true; // User has got the permission
                            }
                            part = part[section];
                        }
                    }
                }
            }
        }

        // If we come all the way here it means that the user has no elevated perms
        return false;
    };
});

// Schema for storing our sessions
var sessionSchema = new Schema({
    session_id:  { type: String, unique: true },
    user:        { type: Schema.Types.ObjectId, ref: 'user' },
    last_active: { type: Date, default: Date.now, index: { expires: 60 * 60 * 24 * 2 }}, // Sessions should be valid for two days of being inactive
});

/* When a session is saved we update
** their last_active for easier
** management. */
sessionSchema.pre("save", function(next) {
    this.last_active = new Date();
    next();
});

// Schema for storing our API-keys and requests
// There can only be one API-key per user
var apiKeySchema = new Schema({
    user:         { type: Schema.Types.ObjectId, ref: 'user', unique: true, required: true },
    api_key:      { type: String, unique: true, required: true },
    requests:     { type: Number, default: 0 },
    last_request: { type: Date, default: Date.now, index: { expires: 60 * 60 * 24 * 3 }}, // The API key will expire after three days of not being used
});

/* Call this every time the api-key is used
** to update the database with statistics.
** The numbers are important to reconginze
** abuse. */
apiKeySchema.virtual('onRequest').get(function() {
    return function() {
        this.requests    += 1;
        this.last_request = new Date();
        this.save();
    };
});


/* Mongoose models */
var Project         = mongoose.model('project',      projectSchema);
var Random          = mongoose.model('random',       randomSchema);
var Tag             = mongoose.model('tag',          tagSchema);
var User            = mongoose.model('user',         userSchema);
var Session         = mongoose.model('user_session', sessionSchema);
var ApiKey          = mongoose.model('api_key',      apiKeySchema);

/* Insert project (don't do it here...) */
// new Project({ name: 'Social', description: 'Here you can find links to my social pages.', href: '/social/', image: '/images/social.png' }).save();
// new Project({ name: 'KissMAL', description: 'A greasemonkey/tampermonkey userscript for myanimelist.net.', href: 'https://greasyfork.org/sv/scripts/15747-kissmal', image: '/images/kissmal.png' }).save();


/* The postman object will be
** exported and will contain all
** our functions and variables
** that needs to be shared across
** different files. */
var Postman = {};

/* We store our mongoose models
** in the exported object to just
** in case we want to use them in
** another file. */
Postman.models = {
    project:         Project,
    random:          Random,
    tag:             Tag,
    user:            User,
    session:         Session,
};

/*  Passes a list of mongodb objects
**  as an argument for callback. */
Postman.getProjects = function(cb) {
        Project.find({ }).exec(function(err, docs) {
            if (err) {
                cb(null);
            } else {
                cb(docs);
            }
        });
};


/* Inserts a new project into the
** database with 'name', 'description',
** 'href' and 'image' as arguments.
** Passed TRUE to callback if all
** arguments where passed, passes
** FALSE if one or more are missing. */
Postman.insertProject = function(project, cb) {
    if (project.name && project.description && project.href && project.image) {
        new Postman.models.project({ name: project.name, description: project.description, href: project.href, image: project.image }).save();
        cb(true);
    } else {
        cb(false);
    }
};


/* Remove all projects with names's matching
** 'projectName from the database.' */
Postman.removeProjectByName = function(projectName, cb) {
    Postman.models.project.remove({ name: projectName }).exec(function(err, count) {
        if (err) {
            cb(null);
        } else {
            if (count > 0) {
                cb(true);
            } else {
                cb(false);
            }
        }
    });
};


/* Remove all projects with id's matching
** 'projectId from the database.' */
Postman.removeProjectById = function(projectId, cb) {
    Postman.models.project.remove({ _id: projectId }).exec(function(err, docs) {
        if (err) {
            cb(null);
        } else {
            if (docs.result.n > 0) {
                cb(true);
            } else {
                cb(false);
            }
        }
    });
};


/* Parses a request's form using
** formidable. */
Postman.parseForm = function(req, cb) {
    if (req && cb) {
        // Create a new formidable incoming form and set it up with default parsing settings
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = "./tmp_upload";
        form.multiples = false;
        form.keepExtensions = true;
        form.on('end', function(e) {
            console.log('END!!');
        });

        // Parse the form and run callback
        form.parse(req, function(err, fields, files) {
            cb(err, fields, files, form);
        });
    } else {
        return false;
    }
};


/* Checks if the request's session_id
** is currently associated with a user.
** If so, pass the User object to the
** callback, else, pass false to callback. */
Postman.validateSession = function(req, cb) {
    var session = req.sessionID;
    if (session) {
        Session.findOne({ session_id: session }).populate('user').exec(function(err, doc) {
            if (!err) {
                if (doc) {
                    doc.save(); // Updates the last_active for session
                    cb(doc.user);
                    return;
                } else {
                    cb(false);
                }
            } else {
                cb(false);
            }
        });
    } else {
        cb(false);
    }
};


/* Try to login with the credentials in
** the passed object. (cred.username,
** cred.password) If successful, pass
** User object to callback, else, pass
** false to callback. */
Postman.tryLogin = function(cred, req, cb) {
    if (cred.username && cred.password && req) {
        cred.username = cred.username.toLowerCase();
        Postman.validateSession(req, function(validatedUser) {
            if (!validatedUser) {
                User.findOne({ username: cred.username }).exec(function(err, user) {
                    if (!err) {
                        if (user) {
                            if (user.isPassword(cred.password)) {
                                Postman.updateSession(user, req, function(success) {
                                    if (success) {
                                        console.log('Updated the session for user %s.', user.username);
                                        console.log('The user %s signed in.', user.username)
                                        cb(user);   // The user successfully signed in with the correct credentials
                                    } else {
                                        console.log('Something went wrong with updating/creating a session...');
                                        cb(false);
                                    }
                                });
                            } else {
                                cb(false);
                            }
                        } else {
                            cb(false);
                        }
                    } else {
                        cb(false);
                    }
                });
            } else {
                Postman.updateSession(validatedUser, req, function(success) {
                    if (success) {
                        console.log('A user has registered with the username "%s".', validatedUser.username);
                    } else {
                        console.log('Something went wrong with creatign a session...');
                    }
                });
                cb(validatedUser);
            }
        });
    } else {
        cb(false);
    }
}


/* Logout from a user. If the user is associated with the
** session, the session will be removed, keeping other
** sessions for the same users logged in. To remove all
** sessions for the user, use logoutAll. */
Postman.logout = function(user, req, cb) {
    Session.findOne({ user: user, session_id: req.sessionID }).remove(function(err) {
        if (!err) {
            cb(true);
        } else {
            cb(false);
        }
    });
};


/* Logout from a user from all session he is logged in
** on. */
Postman.logoutAll = function(user, cb) {
    Session.find({ user: user }).remove(function(err) {
        if (!err) {
            cb(true);
        } else {
            cb(false);
        }
    });
};


/* Try to register a user with credentials in
** object. (cred.username, cred.password) A user
** can not register if they are already signed
** in. A user cannot register if the username is
** already taken. A username cannot register if
** the password is too short or is not using
** uppercase, lowercase and numbers. Callback is
** passed a object containing 'success', 'reason'
** and 'user'.
** 'success' - boolean, will be true if registration
** was successful, else, false.
** 'reason' - undefined if registration were
** successful, else, will be the reason why the
** registration failed.
** 'user' - the user object if the registration
** was successful or if already signed in, else
** it will be null. */
Postman.registerUser = function(cred, req, cb) {
    if (cred.username && cred.password && req) {
        Postman.userExists(cred.username, function(existingUser) {
            if (!existingUser) {
                Postman.validateSession(req, function(user) {
                    if (!user) {
                        if (Postman.isValidPassword(cred.password)) {
                            var salt = Postman.generateSalt();
                            var saltedPassword = Postman.saltPassword(cred.password, salt);
                            var registeredUser = new User({ username: cred.username.toLowerCase(), displayname: cred.username, password: saltedPassword, salt: salt });
                            registeredUser.save(function() {
                                Postman.updateSession(registeredUser, req, function(success) {
                                    if (success) {
                                        console.log('A user has registered with the username "%s".', cred.username);
                                        cb({ success: true, reason: null, user: registeredUser }); // The registration was successful.
                                    } else {
                                        console.log('Something went wrong with creatign a session...');
                                        cb({ success: false, reason: 'i_do_not_know_why_it_failed', user: null }); // The registration was successful but not the session creation.
                                    }
                                });
                            });
                        } else {
                            cb({ success: false, reason: 'password_too_simple', user: null }); // The password did not have uppercase and lowercase letters, numbers or was not long enough.
                        }
                    } else {
                        cb({ success: false, reason: 'already_signed_in', user: user }); // You can't register an account when you are already signed in, redirect them to their users page.
                    }
                });
            } else {
                cb({ success: false, reason: 'username_already_in_use', user: null }); // The username is already in use.
            }
        });
    } else {
        cb({ success: false, reason: 'missing_credentials', user: null }); // Either the username or password were not supplied.
    }
};


/* Updates the session's date if found, if not
** found, create a new session for session_id
** and user. Callback gets passed true if
** successful, false if error. */
Postman.updateSession = function(user, req, cb) {
    if (user && req) {
        Session.findOne({ user: user._id, session_id: req.sessionID }).exec(function(err, session) {
            if (!err) {
                if (session) {
                    session.save(function() {
                        cb(true);
                    });
                } else {
                    new Session({ user: user._id, session_id: req.sessionID }).save(function() {
                        cb(true);
                    });
                }
            } else {
                cb(false);
            }
        });
    } else {
        cb(false);
    }
};


/* Checks to see if a user with the username
** 'username' exists in the database. If the
** user exists, pass true to callback, else
** pass false. */
Postman.userExists = function(username, cb) {
    User.findOne({ username: username }).exec(function(err, user) {
        if (!err) {
            if (user) {
                cb(user);
            } else {
                cb(false);
            }
        } else {
            cb(false);
        }
    });
};


/* Returns true or false, whether or not the
** password 'password' contains at least one
** uppercase letter, one lowercase letter and
** one number, thus being a valid password or
** not. */
Postman.isValidPassword = function(password) {
    return true;    // This has to be changed.....
};


/* Takes an unsalted sha256 encrypted password
** string and hashes it again with salt. Returns
** the new hash. */
Postman.saltPassword = function(unsaltedPassword, salt) {
    var sha256_md = forge.md.sha256.create();
    var serverSalt = '8TGhbSv8ACZkAxUXsOdS';    // To confuse potential crackers even more we use this server salt to hash all passwords too (I am aware that this is a bit silly when the source code is public)
    sha256_md.update(salt + unsaltedPassword + serverSalt);
    return sha256_md.digest().toHex();
};


/* Generates a random 64 character long salt
** and returns it. */
Postman.generateSalt = function() {
    return crypto.randomBytes(32).toString('hex');
};


/* Checks to see if 'permission' is formatted
** correctly as a permission should be. */
Postman.isPermissionFormat = function(permission) {
    if (/^(\w(\.|))*([^\.]|\*)$/.test(permission)) {
        return true;
    } else {
        return false;
    }
};


/* Generate a new API key for a user. If the
** user already has one API key it will be
** overwritten with a new one. Callback is
** passed the next API key as an argument. */
Postman.generateKeyFor = function(user, cb) {
    ApiKey.findOne({ user: user._id }).exec(function(err, doc) {
        if (!err) {
            var key = Postman.saltPassword(user.displayName, Postman.generateSalt()); // Why not just be lazy and use the same function we use for hashing passwords
            console.log('NEW KEY:',key);
            var saveCallback = function(err) {
                if (err) {
                    cb(null);
                } else {
                    cb(key);
                }
            };
            if (doc) {
                doc.api_key = key;
                doc.requests = 0;
                doc.last_request = null;
                doc.save(saveCallback);
            } else {
                new ApiKey({ user: user, api_key: key }).save(saveCallback);
            }
        } else {
            cb(null);
        }
    });
};


/* Destroy any API keys that is associated
** with the user. Callback is passed either
** true or false, true for success, false
** for error or no key destroyed. */
Postman.destroyKeyFor = function(user, cb) {
    ApiKey.remove({ user: user._id }).exec(function(err) {
        if (!err) {
            cb(true);
        } else {
            cb(false);
        }
    });
};


/* Get the API key for a user. Warning, API
** keys can do much damage if they are in the
** wrong hands so don't use this method too
** much. Never print the key to the page. */
Postman.getKeyFor = function(user, cb) {
    ApiKey.findOne({ user: user._id }).exec(function(err, doc) {
        if (!err) {
            if (doc) {
                cb(doc.api_key);
            } else {
                cb(null);
            }
        } else {
            cb(null);
        }
    });
}

module.exports = Postman;
