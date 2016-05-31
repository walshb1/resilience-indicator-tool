var topojson = require('./topojson'), // rename as conflicts with topojson lib
    svg = require('./svg'),
    fs = require('fs-extra'),
    path = require('path'),
    Q = require('q'),
    glob = require('glob'),
    child_process = require('child_process');

var argv = require('yargs')
    .usage('Usage: $0 [--config config.js, --svg, --clean]')
    .option('config', {
        alias: 'c',
        describe: 'The preprocess configuration file',
        type: 'string'
    })
    .option('svg', {
        alias: 's',
        describe: 'Generate svg',
        type: 'boolean'
    })
    .option('clean', {
        describe: 'Remove all generated files',
        type: 'boolean'
    })
    .help('help')
    .argv;

var config,
    topojson_out,
    svgConfig;

function clean() {
    var d = Q.defer();
    glob('*(*.topojson|*.svg)', function(err, files) {
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

function generateTopojson() {
    var layers = config['layers'];
    topojson.all(config)
        .then(function(files) {
            fs.copy(path.resolve(__dirname, topojson_out), path.resolve(__dirname, '../..', 'maps', topojson_out), {
                clobber: true
            }, function(err) {
                if (err) return console.error(err);
                console.log('Copied output topojson to web folder.');
            });
            if (argv.svg) {
                svg.svg(files.output, svgConfig);
            }
        });
}

if (argv.c) {
    var conf = argv.c.split('.')[0]
    config = require('./' + conf);
    topojson_out = config.outputs.topojson_out;
    svgConfig = config.svg;
    // generate topojson
    generateTopojson();
} else if (argv.clean) {
    clean();
}
