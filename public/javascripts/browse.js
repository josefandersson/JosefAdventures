// Set up event listeners on the toggle buttons.
$('#toggle-preview-image').click((e) =>       { toggleVisibleByClassName('preview-image');       });
$('#toggle-preview-title').click((e) =>       { toggleVisibleByClassName('preview-title');       });
$('#toggle-preview-description').click((e) => { toggleVisibleByClassName('preview-description'); });

// Toggle the visibility of elements with the specified class name.
function toggleVisibleByClassName(className) {
    var preview_elements = $(`.${className}`);
    if (!preview_elements.is(':visible')) {
        preview_elements.show();
    } else {
        preview_elements.hide();
    }
}

// Saves the state of preview toggles in cookies as json.
function saveToggleStates() {
    var classNames = ['preview-image', 'preview-title', 'preview-description'];
    var toggled = [];
    classNames.forEach((d) => {
        var elements = $(`.${d}`);
        if (elements.length && !elements.is(':visible')) {
            toggled.push(d);
        }
    });
    console.log('Saving: ', toggled);
    document.cookie = JSON.stringify({ toggled: toggled });
}

// Loads the state of preview toggles from cookies.
function loadToggleStates() {
    if (document.cookie) {
        var JSONObject = null;
        try { JSONObject = JSON.parse(document.cookie.split(';')[0]); } catch(e) {}
        if (JSONObject && JSONObject.toggled) {
            JSONObject.toggled.forEach((d) => {
                $(`.${d}`).hide();
            });
        }
    }
}


// Load states from cookies.
loadToggleStates();

// When the client is leaving the page we want to save our toggles in the cookies.
window.onbeforeunload = saveToggleStates;
// $(window).unload(saveToggleStates);


// The buttons will only be visible if the client uses javascript.
$('.toggle').show();
