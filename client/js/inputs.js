var sprintf = require('sprintf'),
    $ = require('jquery'),
    Q = require('q'),
    topojson = require('topojson'),
    science = require('science'),
    d3 = require('d3');

var inputs = {};

var _config = {};

inputs.getSliders = function(inputConfig) {
    // clear inputs before redrawing
    $('#inputs').empty();
    $.each(inputConfig, function(idx, input) {

        // sort the distribution
        var data = input.distribution.sort(function(a, b) {
            return a - b;
        });

        console.log(input.descriptor, data);

        var margin = {
                top: 5,
                right: 0,
                bottom: 0,
                left: 0
            },
            width = 120 - margin.left - margin.right,
            height = 30 - margin.top - margin.bottom;

        var kde = science.stats.kde().sample(data);

        var bw = kde.bandwidth(science.stats.bandwidth.nrd0)(data);

        // var ext = input.upper > 0 ? [input.lower, input.upper] : d3.extent(data);

        var x = d3.scale.linear()
            .domain(d3.extent(data))
            .range([0, width])
            .clamp(true);

        var y = d3.scale.linear()
            .domain([0, d3.max(bw, function(d) {
                return d[1];
            })])
            .range([height, 0]);

        // gaussian curve
        var l = d3.svg.line()
            .x(function(d) {
                return x(d[0]);
            })
            .y(function(d) {
                return y(d[1]);
            });

        // area under gaussian curve
        var a = d3.svg.area()
            .interpolate('basis')
            .x(function(d) {
                return x(d[0]);
            })
            .y0(height)
            .y1(function(d) {
                return y(d[1]);
            });

        // bisect data array at brush selection point
        b = d3.bisector(function(d) {
            return d;
        }).left;

        var div = d3.select('#inputs')
            .append("div");

        div.append('span')
            .attr("class", "descriptor")
            .text(input.descriptor);

        var svg = div.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("id", input.key)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // add gaussian curve
        var gaus = svg.append("g")
            .attr("id", input.key)
            .attr("class", "gaussian");

        gaus.selectAll("g#" + input.key + " .gaussian")
            // Multivariant Density Estimation
            // http://bit.ly/1Y3jEcD
            .data([science.stats.bandwidth.nrd0])
            .enter()
            .append("path")
            .attr("d", function(d) {
                return l(kde.bandwidth(d)(data));
            });

        // add gaussian curve
        var area = svg.append("g")
            .attr("id", 'area-' + input.key)
            .attr("class", "area");

        area.selectAll("g#area-" + input.key + " .area")
            .data([science.stats.bandwidth.nrd0])
            .enter()
            .append("path")
            .attr("d", function(d) {
                return a(kde.bandwidth(d)(data));
            });

        var mask = svg.append("g")
            .attr("id", 'mask-' + input.key)
            .attr("class", "mask");

        var brush = d3.svg.brush()
            .x(x)
            .extent([0, d3.mean(data)])
            .on("brushstart", brushstart)
            .on("brush", brushmove)
            .on("brushend", brushend);

        // add the brush to the input config so
        // we can access it later
        input.brush = brush;
        _config[input.key] = input;

        var line = d3.svg.line()
            .x(function(d) {
                return brush.extent()[1];
            })
            .y(function(d) {
                return height;
            });

        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(brush);


        brushg.call(brush.event)
            .transition()
            .duration(750)
            .call(brush.extent([0, d3.mean(data)]))
            .call(brush.event);


        brushg.selectAll("g.resize.w").remove();

        brushg.select("#" + input.key + " g.resize.e").append("path")
            .attr("d", line);

        brushg.selectAll("rect")
            .attr("height", height);

        function brushstart() {
            svg.classed("selecting", true);
        }

        function brushmove() {
            // clear existing mask
            $('#mask-' + input.key).empty();
            var s = brush.extent();
            var clip = b(data, s[1]);
            var selected = data.slice(0, clip + 1);
            mask.selectAll("g#mask-" + input.key + " .mask")
                .data([science.stats.bandwidth.nrd0])
                .enter()
                .append("path")
                .attr("d", function(d) {
                    return a(kde.bandwidth(d)(selected));
                });
            d3.select("#" + input.key + " g.resize.e path")
                .attr("d", 'M 0, 0 ' + ' L 0 ' + height);
        }

        function brushend() {
            if (d3.event.sourceEvent) {
                // source is a MouseEvent
                // user is updating the input manually
                var node = d3.select(d3.event.sourceEvent.target).node();
                /* TODO: make sure we get reference to svg on brushend
                if (node.name != 'svg'){
                    node = node.parentElement;
                }
                */
                var id = node.id;
                console.log('input id: ' + id);
                // redraw the input plot
                if (id) {
                    inputs.redrawInputPlot(id);
                } else {
                    console.log('Cant get input id... fix this.');
                }
            }
            svg.classed("selecting", !d3.event.target.empty());
        }
    });
}


// redraw the input plot based on user slider changes
inputs.redrawInputPlot = function(key) {
    var config = inputs.getConfig();
    var input = config[key];
    $.event.trigger({
        type: 'inputchanged',
        input: input
    });
}

/*
 * Update input extents when feature selected
 * on either map or output plot
 */
inputs.update = function(props) {
    var config = inputs.getConfig();
    for (var conf in config) {
        if (config.hasOwnProperty(conf)) {
            // get the input config
            var input = config[conf];
            var brush = input.brush;
            var extent = props[conf];
            var brushg = d3.selectAll('#inputs svg#' + conf + ' g.brush');
            if (!brush.empty()) {
                brushg.transition()
                    .duration(750)
                    .call(brush.extent([0, extent]))
                    .call(brush.event);
            }
        }
        // remove w resize extent handle
        d3.selectAll("g.brush > g.resize.w").remove();
    }
}

inputs.getConfig = function(label = 'pv') {
    return _config;
}

// get current extents from input sliders
inputs.getInputValues = function() {
    var params = {};
    var config = inputs.getConfig();
    for (var conf in config) {
        if (config.hasOwnProperty(conf)) {
            // get the input config
            var input = config[conf];
            var brush = input.brush;
            var extent = +brush.extent()[1].toFixed(5);
            params[conf] = extent;
        }
    }
    return params;
}

/*
 * Handle feature selection events.
 */
inputs.featureselect = function(feature) {
    var props = feature.properties;
    var iso = props.iso;
    $('span#selected-country').html(props.NAME_1);
    inputs.update(props);
}

module.exports = inputs;
