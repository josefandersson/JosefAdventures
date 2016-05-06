
var Tool = function(name, description, inputFields, callback) {
    this.name = name;
    this.description = description;
    this.inputFields = inputFields;
    this.callback = callback;

    this.DOM = {
        container: document.createElement('div'),
        title: document.createElement('h3'),
        description: document.createElement('h5'),
        inputContainer: document.createElement('form'),
        outputContainer: document.createElement('p'),
        output: document.createElement('span')
    };

    this.DOM.container.className = 'tool';
    this.DOM.title.className = 'tool_title';
    this.DOM.description.className = 'tool_description';
    this.DOM.inputContainer.className = 'output_container';
    this.DOM.outputContainer.className = 'output_container';
    this.DOM.output.className = 'tool_output';

    this.DOM.title.innerHTML = this.name;
    this.DOM.description.innerHTML = this.description;
    this.DOM.outputContainer.innerHTML = 'Output: ';

    this.DOM.outputContainer.appendChild(this.DOM.output);
    this.DOM.container.appendChild(this.DOM.title);
    this.DOM.container.appendChild(this.DOM.description);
    this.DOM.container.appendChild(this.DOM.inputContainer);
    this.DOM.container.appendChild(this.DOM.outputContainer);
};

Tool.prototype.setOutput = function(value) {
    this.DOM.output.innerHTML = value;
};

Tool.prototype.getCompleteDOM = function() {
    for (var key in this.inputFields) {
        var field = document.createElement('input');
        field.type = this.inputFields[key];
        field.name = key;
        field.className = 'tool_input';
        field.placeholder = key;
        if (this.inputFields[key] == 'checkbox') {
            var label = document.createElement('label');
            field.id = 'labelhost_' + key;
            label.htmlFor = 'labelhost_' + key;
            label.innerHTML = key;
            label.className = 'tool_input_label';
            this.DOM.inputContainer.appendChild(label);
        } else if (this.inputFields[key] == 'float') {
            field.type = 'number';
            field.step = '0.01';
        }
        this.DOM.inputContainer.appendChild(field);
    }
    var submit = document.createElement('input');
    submit.type = 'submit';
    submit.className = 'tool_submit';
    submit.value = 'Solve';
    var self = this;
    submit.addEventListener('click', function(event) {
        event.preventDefault();
        var inputFields = $(this).parent()[0].getElementsByClassName('tool_input');
        var data = {};
        for (var index in inputFields) {
            var value = null;
            var inputField = inputFields[index];
            if (inputField.type == 'number') {
                value = inputField.number || parseFloat(inputField.value);
            } else if (inputField.type == 'text') {
                value = inputField.value;
            } else if (inputField.type == 'checkbox' || inputField.type == 'radiobutton') {
                value = inputField.checked;
            }
            data[inputField.name] = value;
        }
        self.setOutput(self.callback(data));
    });
    this.DOM.inputContainer.appendChild(submit);
    return this.DOM.container;
};

/***
 ***
 *** DECLARE ALL TOOLS BELOW
 ***
 ***/


var tools = [];

/* Distance tool */
tools.push(new Tool('Distance', 'Calculate the distance between two points.', { 'x1': 'number', 'y1': 'number', 'x2': 'number', 'y2': 'number' }, function(data) {
    return Math.sqrt(Math.pow(data.x2 - data.x1, 2) + Math.pow(data.y2 - data.y1, 2));
}));

/* In X time tool */
tools.push(new Tool('Time in X time', 'Calculate what the time will be in X time.', { 'days': 'number', 'hours': 'number', 'minutes': 'number', 'seconds': 'number' }, function(data) {
    var d = new Date();
    var h = (data.hours || 0) + (24 * (data.days || 0));
    var m = data.minutes || 0;
    var s = data.seconds || 0;
    d.setHours(d.getHours() + h);
    d.setMinutes(d.getMinutes() + m);
    d.setSeconds(d.getSeconds() + s);
    return d.toLocaleString();
}));

/* Character count (with space) tool */
tools.push(new Tool('Character count', 'Get the number of characters in a text.', { 'text': 'text', 'Exclude spaces': 'checkbox' }, function(data) {
    return data['Exclude spaces'] ? data.text.match(/[^\s\\]/g).length : data.text.length;
}));

/* Random string tool */
tools.push(new Tool('Random string generator', 'Generates a random string.', { 'Lowercase letters': 'checkbox', 'Uppercase letters': 'checkbox', 'Numbers': 'checkbox', 'Special characters': 'checkbox', 'string length': 'number' }, function(data) {
    var map = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', numbers: '1234567890', special: "!#_-@$&?+*^{}[]()/\\'\"`~,;:.<>" };
    var pool = '';
    if (data['Lowercase letters']) { pool += map.lower; }
    if (data['Uppercase letters']) { pool += map.upper; }
    if (data.Numbers) { pool += map.numbers; }
    if (data['Special characters']) { pool += map.special; }
    var string = '';
    if (pool.length) {
        for (var c = 0; c < data['string length']; c++) {
            string += pool[Math.floor(Math.random() * pool.length)];
        }
    } else {
        string = 'No characters in pool!';
    }
    return string.replace('<', '&lt;').replace('>', '&gt;');
}));

/* Random number tool */
tools.push(new Tool('Random number generator', 'Generates a random number.', { 'Minimum': 'number', 'Maximum': 'number', 'With decimals': 'checkbox' }, function(data) {
    var min = data.Minimum || 0;
    var max = data.Maximum || 1;
    var num = (Math.random() * (max - min)) + min;
    return data['With decimals'] ? num : Math.floor(num);
}));

/* Unique characters tool */
tools.push(new Tool('Unique characters', 'Get a list of unique characters in a text.', { 'text': 'text', 'Count': 'checkbox' }, function(data) {
    var output = [];
    var text = data.text.split(' ').join('');
    for (var index in text) {
        if (output.indexOf(text[index]) < 0) {
            output.push(text[index]);
        }
    }
    return data.Count ? output.length : output.join(' ');
}));

/* Download ETA tool */
tools.push(new Tool('Download ETA', 'Calculate an ETA of a download to be done downloading.', { 'speed (MB/s)': 'float', 'size (GB)': 'float' }, function(data) {
    return ((data['size (GB)'] * 1000) / data['speed (MB/s)']) + "s";
}));






/***
 ***
 *** END OF TOOL DECLARATION
 ***
 ***/

document.getElementById('tool_count').innerHTML = tools.length;

var toolbox = document.getElementById('toolbox');
var indexElement = document.getElementById('index');
var titles = [];
var map = {};
for (var index in tools) {
    var tool = tools[index];
    var container = tool.getCompleteDOM();
    titles.push(tool.name);
    map[tool.name] = tool;
    toolbox.appendChild(document.createElement('hr'));
    toolbox.appendChild(container);
}

titles = titles.sort();
for (var index in titles) {
    var title = titles[index];
    var tool = map[title];
    var link = document.createElement('a');
    link.href = '#' + encodeString(title);
    tool.DOM.container.id = encodeString(title);
    link.innerHTML = title;
    indexElement.appendChild(link);
    indexElement.innerHTML += ', ';
}
indexElement.innerHTML = indexElement.innerHTML.slice(0, -2);

function encodeString(str) {
    return encodeURIComponent(str.split(' ').join('_'));
}
