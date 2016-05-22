var formidable = require('formidable');

/* This method returns a middleware function for parsing multi-part
** forms. The options are formidable options plus a list 'matching'
** of which will be a list of either regexps or strings that the request
** path has to match to prevent files from being uploaded everywhere. */
exports.parse = function( options ) {
    // If no options are defined, we will just set options to an empty object.
    if (options === undefined) { options = { }; }

    // Return the middleware function.
    return function(req, res, next) {
        // We have to make sure the request is of content-type multipart form.
        var contentType = req.headers['content-type'];
        if (contentType && contentType.indexOf('multipart/form-data') >= 0) {
            // The form was of corrent content-type.

            var matching = false;
            if (options.matching instanceof Array) {
                // We have to check with the options to see if we are supposed to parse this form or not.
                matching = options.matching.some(function( match ) {
                    if (typeof match === 'string') {
                        if (req.path == match) {
                            // The request path is equal to match rule and we will therefore parse the form.
                            return true;
                        }
                    } else if (match instanceof RegExp) {
                        if (match.test(req.path)) {
                            // The request path tested true and we will therefore parse the form.
                            return true;
                        }
                    }
                });
            } else {
                // Since no matching rules were sent we'll allow all forms to go through.
                matching = true;
            }

            if (matching) {
                // We are going to parse the form.
                var form = new formidable.IncomingForm();

                // Add the passed options to formidable.
                Object.keys(options).forEach(function(key) {
                    form[key] = options[key];
                });

                // This will hold all the fields that was recieved in the form.
                var fields = {};

                // Add data to fields.
                var setOrAppend = function(key, value) {
                    if (fields[key] === undefined) {
                        // Data has not yet been added to this key, will add now.
                        fields[key] = value;
                    } else {
                        // The key already exists, we will therefore add the data to the already existing key instead of creating a new key.
                        if (!(fields[key] instanceof Array)) {
                            // The field is not an array and we will therefore make it into an array with the current value in it.
                            fields[key] = [ fields[key] ];
                        }

                        // Append the value to the array of key.
                        fields[key].push(value);
                    }
                };

                // Setup the event listeners for the formidable form.
                form.on('field', setOrAppend)
                    .on('file', setOrAppend)
                    .on('error', next)
                    .on('end', function() {
                        // The form is done parsing and we will add the fields to the request object and then continue to the next middleware.
                        req.body = fields;
                        next();
                    });

                // Start parsing the incoming form.
                form.parse(req);
            } else {
                // We are not going to parse the form.
                next();
            }
        } else {
            // The request is not a form.
            next();
        }
    };
};
