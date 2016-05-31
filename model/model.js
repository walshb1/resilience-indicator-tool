var Q = require('q'),
    python = require('python-shell'),
    path = require('path'),
    fs = require('fs');

var model = {};

model.run = function(inputs) {
    var d = Q.defer()

    var options = {
        mode: 'text',
        pythonOptions: ['-u'],
        scriptPath: './',
        args: ['-d=' + JSON.stringify(inputs)]
    }

    python.run('/model/model_adapter.py', options, function(err, results) {
        if (err) throw err;
        d.resolve(results);
    });

    return d.promise;
}

module.exports = model;
