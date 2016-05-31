var $ = require('jquery'),
    sprintf = require('sprintf'),
    Q = require('q'),
    d3 = require('d3'),
    plots = require('./plots'),
    inputs = require('./inputs'),
    topojson = require('topojson');
require('d3-geo-projection')(d3);

var map = {};

map.config = {}

map.draw = function(config, json) {

    // clear the map before redrawing
    $('#map').empty();
    $('#map').append('<div id="data"></div>');

    // update the map config
    map.config = config;
    var d = Q.defer();
    var width = 500;
    var height = 325;
    svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var layerGroup = svg.append("g");
    var coastLayer = layerGroup.append("g"),
        countryLayer = layerGroup.append("g"),
        countryBdies = layerGroup.append("g"),
        dispAreas = layerGroup.append("g"),
        intlBdies = layerGroup.append("g"),
        dispBdies = layerGroup.append("g");

    map.features = countries;

    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 4])
        .on("zoom", zoomed);

    svg.call(zoom).call(zoom.event);

    function zoomed() {
        var t = d3.event.translate,
            s = d3.event.scale,
            h = height;
        w = width;
        t[0] = Math.min(w / 2 * (s - 1) + (w / 2 * s), Math.max(w / 2 * (1 - s) - (w / 2 * s), t[0]));
        t[1] = Math.min(h / 3 * (s - 1) + (h / 3 * s), Math.max(h / 3 * (1 - s) - (h / 3 * s), t[1]));
        layerGroup.attr("transform", "translate(" + t + ") scale(" + s + ")");
    }

    // pull out geojson layers
    var coastlines = topojson.feature(json, json.objects.coastlines).features;
    var countries = topojson.feature(json, json.objects.countries).features;
    var boundaries = topojson.feature(json, json.objects.intl_boundaries).features;
    var disputed = topojson.feature(json, json.objects.disp_areas).features;
    var dispbdies = topojson.feature(json, json.objects.disp_boundaries).features;

    var projection = d3.geo.robinson()
        .scale((width) / 2 / Math.PI)
        .translate([width / 2, height / 2]);
    var path = d3.geo.path().projection(projection);

    // coastlines
    coastLayer.selectAll(".coastline")
        .data(coastlines)
        .enter().append("path")
        .attr("class", function(d) {
            return "coastline"
        })
        .attr("d", path);

    // countries
    countryLayer.selectAll(".country")
        .data(countries)
        .enter()
        .append("path")
        .attr("class", function(d) {
            // check resilience by default
            var cls = d.properties.resilience == null ? 'nodata' : 'data';
            var iso = d.properties.ISO_Codes;
            return sprintf("country %s %s", cls, iso);
        })
        .attr("d", path)
        .on('mouseout', function(d) {
            $('#data').empty();
        })
        .on('mouseover', function(d) {
            var name = d.properties.country;
            if (name) {
                var chl_field = d.properties[map.config.chloropleth_field];
                var iso = d.properties.ISO_Codes;
                $('#data').empty();
                $('#data').append('<span><strong>' + name + ' (' + iso + '). </strong></span>');
                $('#data').append('<span><strong>' + map.config.chloropleth_title + ': </strong>' + chl_field + '</span>');
            }
        })
        .on('mousedown', function(d) {
            // don't select countries with no data
            if (!d.properties.country) {
                return;
            }
            // clear selection before re-selecting
            countryLayer.selectAll('.country')
                .classed('featureselect', false);

            // select the feature
            var iso = d.properties.ISO_Codes;
            countryLayer.selectAll('.' + iso)
                .classed('featureselect', true);

            // notify event listeners
            $.event.trigger({
                type: 'featureselect',
                feature: d
            });
        })

    // disputed areas
    dispAreas.selectAll(".disputed")
        .data(disputed)
        .enter().append("path")
        .attr("class", function(d) {
            return "disputed"
        })
        .attr("d", path);

    // international boundaries
    intlBdies.selectAll(".intlbdie")
        .data(boundaries)
        .enter().append("path")
        .attr("class", function(d) {
            return "intlbdie"
        })
        .attr("d", path);

    // disputed boundaries
    dispBdies.selectAll(".dispbdies")
        .data(dispbdies)
        .enter().append("path")
        .attr("class", function(d) {
            // add classes for required disputed boundary styles
            var style = d.properties.Style.replace(/ /g, '_').toLowerCase();
            return "dispbdies " + style;
        })
        .attr("d", path);

    // get input domains
    d.resolve(countries);

    return d.promise;
}

// set selected feature
map.featureselect = function(feature) {
    // clear selection before re-selecting
    svg.selectAll('.country')
        .classed('featureselect', false);

    // select the feature
    var name = feature.properties.country;
    var iso = feature.properties.ISO_Codes;
    svg.selectAll('.' + iso)
        .classed('featureselect', true);

    var chl_field = feature.properties[map.config.chloropleth_field];
    $('#data').empty();
    $('#data').append('<span><strong>' + name + ' (' + iso + '). </strong></span>');
    $('#data').append('<span><strong>' + map.config.chloropleth_title + ': </strong>' + chl_field + '</span>');
}

// handle output map switch events
map.mapselect = function(feature){
    var name = feature.properties.country;
    var iso = feature.properties.ISO_Codes;
    var chl_field = feature.properties[map.config.chloropleth_field];
    $('#data').empty();
    $('#data').append('<span><strong>' + name + ' (' + iso + '). </strong></span>');
    $('#data').append('<span><strong>' + map.config.chloropleth_title + ': </strong>' + chl_field + '</span>');
}

module.exports = map;
