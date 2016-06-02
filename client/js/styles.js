var sprintf = require('sprintf');
var Q = require('q');
var d3 = require('d3');
var colorbrewer = require('colorbrewer');

var styles = {};

styles.applyDefaults = function() {

    // get the map
    var svg = d3.select("#map");

    // nodata info
    svg.selectAll(".nodata")
        .on('mouseover', function(d) {
            $('#data').empty();
            $('#data').append('<span><strong>No data</strong></span>');
        });

    svg.selectAll('.coastline')
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', '.4px')
        .style('stroke-linejoin', 'miter');

    svg.selectAll('.intlbdie')
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', '.5px')
        .style('stroke-linejoin', 'miter');

    svg.selectAll('.dispbdies')
        .style('fill', 'none');

    svg.selectAll('.disputed')
        .style('fill', '#E0E0E0');

    svg.selectAll('.dotted_line')
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', '.5px')
        .style('stroke-dasharray', '.1, .8')
        .style('stroke-linecap', 'round');

    svg.selectAll('.dashed_line')
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', '.5px')
        .style('stroke-dasharray', '.8, .8')
        .style('stroke-linejoin', 'miter');

    svg.selectAll('.tightly_dashed_line')
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', '.5px')
        .style('stroke-dasharray', '1.5, .5')
        .style('stroke-linejoin', 'miter');
}

styles.computeStyles = function(colorScale) {

    var svg = d3.select("#map");

    // countries
    svg.selectAll(".feature")
        .style("fill", function(d) {
            // map resilience output by default
            var color = styles.chloropleth(d, colorScale);
            return color;
        });
}

styles.colorScale = function(domain, data) {

    //TODO: resilience only for first pass

    color_ranges = {
        'resilience': colorbrewer.Reds[5].reverse(),
        'risk': colorbrewer.Purples[5].reverse(),
        'risk_to_assets': colorbrewer.Blues[5]
    }

    //create quantile classes with color scale
    var colors = d3.scale.quantile()
        .domain([0, 1])
        .range(color_ranges[domain]);

    return colors; //return the color scale generator
};

styles.chloropleth = function choropleth(d, computeStyles) {
    //get data value
    var value = d.properties['resilience'];
    //if value exists, assign it a color; otherwise assign gray
    if (value) {
        return computeStyles(value);
    } else {
        return "#ccc";
    };
};

module.exports = styles;
