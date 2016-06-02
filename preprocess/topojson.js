var mapshaper = require('mapshaper'),
    sprintf = require('sprintf'),
    fs = require('fs-extra'),
    path = require('path'),
    exec = require('child_process').exec,
    Q = require('q');

var generate = {};

generate.model_features = function(config) {
    var width = config.map.width;
    var height = config.map.height;
    var margin = config.map.margin;
    var projection = config.map.projection;

    // model features topojson command
    var layerConfig = config.layers['model_features'];
    var msCmd = sprintf('-i name=%(layer_name)s %(shape_file)s auto-snap -simplify %(simplify)s -filter-fields %(filter_fields)s -join %(data)s  keys=%(shp_join_field)s:str,%(data_join_field)s:str -o force temp.topojson', {
        layer_name: layerConfig.layer_name,
        shape_file: layerConfig.shape_file,
        simplify: config.map.simplify_poly,
        filter_fields: layerConfig.filter_fields,
        data: config.inputs.data,
        shp_join_field: layerConfig.shp_join_field,
        data_join_field: layerConfig.data_join_field,
    });
    var d = Q.defer();
    mapshaper.runCommands(msCmd, function() {
        var topoCmd = sprintf("topojson -p --width %(width)s --height %(height)s --margin %(margin)s --projection '%(projection)s' -o map_data.topojson temp.topojson", {
            width: width,
            height: height,
            margin: margin,
            projection: projection
        });
        exec(topoCmd, function(err, stdout, stderr) {
            if (err) return console.log(err);
            // remove temporary file
            var file = path.resolve(__dirname, './temp.topojson');
            fs.removeSync(file, function(err) {
                if (err) return console.log(err);
            });
            d.resolve({
                'model_features': 'map_data.topojson'
            });
        });
    });
    return d.promise;
}

module.exports = generate;
