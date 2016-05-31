var config = require('./config');
var mapshaper = require('mapshaper');
var sprintf = require('sprintf');
var Q = require('q');

var generate = {};

generate.coastlines = function() {
    // coastline topojson command
    var coastLineCmd = sprintf('-i name=coastlines shp/WB_Coastlines.shp auto-snap -simplify %s -o force drop-table wb-coastlines-simple.topojson', config.map.simplify_line);
    //console.log(coastLineCmd);
    var d = Q.defer();
    mapshaper.runCommands(coastLineCmd, function() {
        console.log('Created coastline topojson');
        d.resolve({
            'coastlines': 'wb-coastlines-simple.topojson'
        });
    });
    return d.promise;
}

generate.countries = function() {
    // country polygon topojson command
    var countryCmd = sprintf('-i name=countries shp/WB_CountryPolys.shp auto-snap -simplify %s -filter-fields ISO_Codes,Names,Regions,Rules,_LayerName,F_Id -join %s keys=%s:str,%s:str -o force wb-country-polys-simple.topojson', config.map.simplify_poly, config.inputs.data, config.inputs.shp_join_field, config.inputs.data_join_field)
    //console.log(countryCmd);
    var d = Q.defer();
    mapshaper.runCommands(countryCmd, function() {
        console.log('Created countries topojson');
        d.resolve({
            'countries': 'wb-country-polys-simple.topojson'
        });
    });
    return d.promise;
}

generate.intlBdies = function() {
    // international boundaries topojson command
    var intlBdiesCmd = sprintf('-i name=intl_boundaries shp/WB_IntlBdies.shp  -simplify %s -filter-fields _Id,_LayerName,Style -o force drop-table wb-intl-bdies-simple.topojson', config.map.simplify_line);
    //console.log(intlBdiesCmd);
    var d = Q.defer();
    mapshaper.runCommands(intlBdiesCmd, function() {
        console.log('Created international boundaries topojson');
        d.resolve({
            'intl_boundaries': 'wb-intl-bdies-simple.topojson'
        });
    });
    return d.promise;
}

generate.dispAreas = function() {
    // disputed areas topojson command
    var dispAreasCmd = sprintf('-i name=disp_areas shp/WB_DispAreas.shp -simplify %s -filter-fields ISO_Codes,Names,Regions,Rules,_LayerName,F_Id -o force wb-disp-areas-simple.topojson', config.map.simplify_poly)
    //console.log(dispAreasCmd);
    var d = Q.defer();
    mapshaper.runCommands(dispAreasCmd, function() {
        console.log('Created disputed areas topojson');
        d.resolve({
            'disp_areas': 'wb-disp-areas-simple.topojson'
        });
    });
    return d.promise;
}

generate.dispBdies = function() {
    // disputed boundaries topojson command
    var dispBdiesCmd = sprintf('-i name=disp_boundaries shp/WB_DispBdies.shp -simplify %s -filter-fields _Id,_LayerName,Style -o force wb-disp-bdies-simple.topojson', config.map.simplify_line);
    //console.log(dispBdiesCmd);
    var d = Q.defer();
    mapshaper.runCommands(dispBdiesCmd, function() {
        console.log('Created disputed boundaries topojson');
        d.resolve({
            'disp_boundaries': 'wb-disp-bdies-simple.topojson'
        });
    });
    return d.promise;
}

// combine when all done
generate.all = function() {
    var files = {}; // return map of layers to files
    var d = Q.defer();
    Q.all([generate.coastlines(), generate.countries(), generate.intlBdies(), generate.dispAreas(), generate.dispBdies()]).done(
        function(values) {
            // combine files topojson command
            values.map(function(item) {
                var key = Object.keys(item)[0];
                files[key] = item[key];
            });
            const filenames = Object.keys(files).map(key => files[key]);
            var combineCmd = sprintf.vsprintf('-i combine-files %s %s %s %s %s -o force world.topojson', filenames);
            mapshaper.runCommands(combineCmd, function() {
                console.log('Created combined topojson');
                files.output = 'world.topojson';
                d.resolve(files);
            });
        });
    return d.promise;
}

module.exports = generate;
