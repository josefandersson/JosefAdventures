// This will eventually hold our users information
var user_info = {};
var href = window.location.href;


/* When a user clicks on the man in the bottom left corner of the screen
** we want a window to popup with a users information or a sign in window
** if they are not singed in. */
$('#user_button').click(function(e) {
    /* If the link was clicked with left or right click we want to prevent the
    ** browser from refering to the href page. We do not want to prevent that
    ** from happening if the middle button is clicked. */
    if (e && e.which == 0 || e.which == 1) {
        e.preventDefault();

        // Depending on if we are logged in or not we will display different windows.
        isLoggedIn(function(logged_in) {
            if (logged_in) {
                // We are logged in and will display the '/me' page
                makeUserInfoPopup(function() {  // Make sure the current popup has the info screen elements.
                    history.pushState(null, 'user_info', '/me');
                    displayPopupWindow();       // Make the whole popup visible.
                });
            } else {
                // We are not logged in and will display the '/login' page
                makeLoginPopup(function() {  // Make sure the current popup has the login form and elements.
                    history.pushState(null, 'login', '/login');
                    displayPopupWindow();    // Make the whole popup visible.
                });
            }
        });

        // Fake the history to make it look like we have switched pages
    }
});


/* This is the event listener used on the login form to login using AJAX. */
$('#login_form').submit(function(e) {
    // Prevent the browser from submitting the form as usual
    e.preventDefault();

    // Get the form that is submitted
    var f = e.target;

    // Attempt to sign in to the account
    attemptLogin(f.username.value, f.password.value, function(res) {
        if (res === true) {
            // Signed in successfully!
            closePopupWindow();
            makeUserInfoPopup();
            history.pushState(null, 'user_info', '/me');
            displayPopupWindow();
        } else {
            // Failed to sign in.
            alert(res);
            makeLoginPopup();
        }
    });
});

/* This is the event lsitener used on the logout button to logout using AJAX. */
$('a[href="/logout"]').click(function(e) {
    // Prevent the browser from refering to the page.
    e.preventDefault();

    // Try to logout.
    logout(function(success) {
        if (success) {
            // Successfully logged out of the account.
            closePopupWindow();
        } else {
            // Could not logout.
            alert('Attempted logout failed.');
        }
    });
});


/* When the black background of the popup is clicked the popup will close. */
$('#popup').click(function(e) {
    // Only close if it is the background itself that is clicked.
    if (e.target == this) {
        // Close the popup.
        closePopupWindow();
    }
});

/* When the 'X' at the top right of the popup window is clicked the popup will close. */
$('#popup > .popup_window > .close').click(function(e) {
    // Close the popup.
    closePopupWindow();
});


/* ====================
** === POPUP WINDOW ===
** ==================== */

/* Close the popup window from the screen. */
function closePopupWindow() {
    // Alter the history to make it look like we are back on the original page
    history.pushState(null, 'home', href);
    $('div#popup').css('display', 'none');
    $('div#popup .popup_content').attr('hidden', true); // Make all popup content hidden.
}

/* Displays the popup window on the screen. */
function displayPopupWindow() {
    $('div#popup').css('display', 'inherit');
}


/* Check if the current popup is matching to the elements we need for
** user info. If they are, update the elements with valid userdata. If
** not, create new elements and populate them with valid userdata. When
** we are done, pass true to callback. If anything failed(?) pass false to
** callback. */
function makeUserInfoPopup( callback ) {
    getUserInformation(function( userData ) {
        // We need to create new elements and add them to the popup container.
        var popupContainer = $('div#user_information');

        // Update the information elements.
        popupContainer.find('#info_displayname').text(userData.displayname);
        popupContainer.find('#info_username')   .text(userData.username);
        popupContainer.find('#info_permissions').text(userData.permissions || '-no permissions-');
        popupContainer.find('#info_api_key')    .text(userData.api_key || '-no api key-');

        // Display the popup content.
        popupContainer.attr('hidden', false);

        // Call the callback. Later we have to check for error and return false then.
        callback(true);
    });
}

function makeLoginPopup( callback ) {
    // We need to create new elements and add them to the popup container.
    var popupContainer = $('div#login_popup');

    // Update the information elements.
    popupContainer.find('#username').val('');
    popupContainer.find('#password').val('');

    // Display the popup content.
    popupContainer.attr('hidden', false);

    // Call the callback. Later we have to check for error and return false then.
    callback(true);
}

function makeRegisterPopup( callback ) {
    // We need to create new elements and add them to the popup container.
    var popupContainer = $('div#register_popup');

    // Update the information elements.
    popupContainer.find('#username').val('');
    popupContainer.find('#password').val('');

    // Display the popup content.
    popupContainer.attr('hidden', false);

    // Call the callback. Later we have to check for error and return false then.
    callback(true);
}



/* ====================
** ===     AJAX     ===
** ==================== */

/* Sends an ajax request to the server to check if we are signed in or
** not. Callback is passed either true or false. */
function isLoggedIn(callback) {
    $.getJSON('/api/auth/logged').done(function(data) {
        if (data.logged_in) {
            // The server responded that we are signed in.
            console.log('The user is signed in.');
            callback(true);
        } else {
            // The server responded that we are not singed in.
            console.log('The user is not signed in.');
            callback(false);
        }
    });
}

/* Fetch information about the user from the server. The information is
** stored inside variable user_info aswell as passed to callback. */
function getUserInformation(callback) {
    $.getJSON('/api/users/me').done(function(data) {
        if (!data.error) {
            // No errors occured.
            user_info = data;
            callback(data);
        } else {
            if (data.error === 'no_login') {
                // The user is not logged in and no information could be fetched.
                callback(false);
            } else {
                // wat
                callback(null);
            }
        }
    });
}

/* Try to login to an account using username and password. Note that
** supplying the incorrect credentials too many times will block your
** ip for 5 minutes and notify the user. Callback is passed either true
** or an error message or false if the ajax failed. */
function attemptLogin(username, password, callback) {
    $.ajax('/api/auth/login', {
        dataType: 'json',
        method:   'post',
        data:     { username: username, password: password }
    }).done(function( data ) {
        if (!data.success) {
            // Attempted login failed
            callback(data.message);
        } else {
            // Successfully signed in to the site!
            callback(true);
        }
    }).fail(function(err) { console.log('Something went wrong when trying to sign in.', err); callback(false); });
}


/* Logout from the account. Passes true to callback if user was logged out
** or false if user was not logged out. (Not signed in in the first place.) */
function logout(callback) {
    $.getJSON('/api/auth/logout').done(function(data) {
        if (data.success) {
            // We signed out!
            callback(true);
        } else {
            // We couldn't sign out. Probably because we weren't signed in.
            callback(false);
        }
    });
}
