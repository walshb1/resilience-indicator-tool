var mapshaper = require('mapshaper');
var sprintf = require('sprintf');
var Q = require('q');

var generate = {};

generate.model_features = function(config) {
    // model features topojson command
    var layerConfig = config.layers['model_features'];
    var cmd = sprintf('-i name=%(layer_name)s %(shape_file)s auto-snap -simplify %(simplify)s -filter-fields %(filter_fields)s -join %(data)s keys=%(shp_join_field)s:str,%(data_join_field)s:str -o force %(output_topojson)s', {
            layer_name: layerConfig.layer_name,
            shape_file: layerConfig.shape_file,
            simplify: config.map.simplify_poly,
            filter_fields: layerConfig.filter_fields,
            data: config.inputs.data,
            shp_join_field: layerConfig.shp_join_field,
            data_join_field: layerConfig.data_join_field,
            output_topojson: layerConfig.output_topojson
        });
    var d = Q.defer();
    mapshaper.runCommands(cmd, function() {
        console.log('Created model features topojson');
        d.resolve({
            'model_features': layerConfig.output_topojson
        });
    });
    return d.promise;
}

module.exports = generate;
