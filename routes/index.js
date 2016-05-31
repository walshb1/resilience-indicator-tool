var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    model = require('../model/model'),
    csv2json = require('csv2json');

var router = express.Router();

var title = 'Socio-economic resilience to natural disasters';

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('dashboard', {
        title: title
    });
});

// runs the model
router.post('/runmodel', function(req, res) {
    res.setHeader('content-type', "application/json");
    var p = model.run(req.body);
    p.then(function(data){
        res.send(data);
    });
});

// gets the world topojson
router.get('/world.json', function(req, res) {
    res.setHeader("content-type", "application/json");
    fs.createReadStream("sample/world.topojson").pipe(res);
});

// gets the inputs info data
router.get('/inputs.json', function(req, res) {
    res.setHeader("content-type", "application/json");
    fs.createReadStream('model/inputs_info.csv')
        .pipe(csv2json({}))
        .pipe(res);
})

module.exports = router;
