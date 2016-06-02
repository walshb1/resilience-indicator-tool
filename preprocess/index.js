#!/usr/bin/env node

var topojson = require('./topojson'),
    svg = require('./svg'),
    png = require('./png'),
    fs = require('fs-extra'),
    path = require('path'),
    Q = require('q'),
    glob = require('glob'),
    child_process = require('child_process');

var argv = require('yargs')
    .usage('Usage: $0 [--config config.js, --clean, --svg, --web, --topojson]')
    .option('config', {
        alias: 'c',
        describe: 'The preprocess configuration file',
        type: 'string'
    })
    .option('svg', {
        alias: 's',
        describe: 'Generate standalone svg file',
        type: 'boolean'
    })
    .option('clean', {
        describe: 'Remove all generated files',
        type: 'boolean'
    })
    .option('web', {
        describe: 'Generate files required for web visualization',
        type: 'boolean'
    })
    .option('topojson', {
        describe: 'Generate a topojson file',
        type: 'boolean'
    })
    .help('help')
    .argv;

var config,
    topojson_out;

// remove all generated artifacts
function clean() {
    var d = Q.defer();
    glob('*(*.topojson|*.svg|*.png)', function(err, files) {
        if (err) return console.log(err);
        for (var i in files) {
            var file = path.resolve(__dirname, './', files[i]);
            fs.removeSync(file, function(err) {
                if (err) return console.log(err);
            });
        }
        d.resolve();
    });
    return d.promise;
}

// generate svg's only
function generateSvg(config) {
    topojson.model_features(config)
        .then(function(files) {
            svg.svg(files.model_features, config)
                .then(function(svgs) {
                    // generating svg so delete intermediate topojson artifact
                    fs.removeSync(config.topojson_out, function(err) {
                        if (err) return console.log(err);
                    });
                });
        });
}

// generate topojson only
function generateTopojson(config) {
    topojson.model_features(config);
}

/*
 * Generate visualization artifacts
 * and copy to viz folders:
 * map_data.topojson goes to ../maps for the /features.json api.
 * *_thubm.png goes to ../public/images/ for map switcher.
 */
function generateWeb(config) {
    topojson.model_features(config)
        .then(function(files) {
            // not generating svg so copy output to maps folder
            fs.copy(path.resolve(__dirname, files.model_features), path.resolve(__dirname, '..', 'maps', files.model_features), {
                clobber: true
            }, function(err) {
                if (err) return console.error(err);
                console.log("Copied output topojson to '../maps/" + files.model_features + "'");
            });
            svg.svg(files.model_features, config)
                .then(function(svgs) {
                    // generate pngs
                    var pngs = png.convert(config, svgs);
                    for (var f in pngs){
                        var img = pngs[f];
                        fs.copySync(img, '../public/images/' + img);
                        console.log("Copied " + img + " to '../public/images/" + img + "'");
                    }
            });
        });
}

// pick up the configuration
if (argv.config) {
    var conf = argv.c.split('.')[0]
    config = require('./' + conf);
    if (argv.topojson) {
        generateTopojson(config);
    }
    if (argv.svg) {
        generateSvg(config);
    }
    if (argv.web) {
        generateWeb(config);
    }
}

// remove artifacts
if (argv.clean) {
    clean();
}
