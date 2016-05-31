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
        var data = input.distribution.sort();
        // A formatter for counts.
        var formatCount = d3.format(".0f");
        var margin = {
                top: 0,
                right: 0,
                bottom: 20,
                left: 0
            },
            width = 150 - margin.left - margin.right,
            height = 60 - margin.top - margin.bottom;

        var min = Math.floor(d3.min(data)),
            max = Math.ceil(d3.max(data) > 100 ? 100 : d3.max(data)); // TODO fix

        var kde = science.stats.kde().sample(data);

        var x = d3.scale.linear()
            .domain([min, max])
            .range([0, width]);

        // Generate a histogram using twenty uniformly-spaced bins.
        var bins = d3.layout.histogram()
            .frequency(true)
            .bins(x.ticks(20))
            (data);

        var y = d3.scale.linear()
            .domain([0, d3.max(bins, function(d) {
                return d.y;
            })])
            .range([height, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(3);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5);

        // gaussian distribution line
        var l = d3.svg.line()
            .x(function(d) {
                return x(d[0]);
            })
            .y(function(d) {
                return height - y(d[1]);
            });


        // area under gaussian distribution
        var a = d3.svg.area()
            .x(function(d) {
                return x(d[0]);
            })
            .y0(height)
            .y1(function(d) {
                return y(d[1]);
            });

        // brush selection mask
        var m = d3.svg.area()
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

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + min + "," + height + ")")
            .call(xAxis);

        /*
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + min + "," + height + ")")
            .call(yAxis);
        */

        // add gaussian curve
        var gaus = svg.append("g")
            .attr("id", input.key)
            .attr("class", "gaussian")
            .attr("transform", "translate(0," + height + ")");

        gaus.selectAll("g#" + input.key + " .gaussian")
            // Multivariant Density Estimation https://github.com/jasondavies/science.js/blob/master/src/stats/bandwidth.js#L15
            .datum(data)
            .data([science.stats.bandwidth.nrd])
            .enter()
            .append("path")
            .attr("d", function(d) {
                return l(kde.bandwidth(d)(d3.range(min, max, max / 60)));
            })
            .attr("transform", "scale(1, -1) scale(1, 5)");

        // add gaussian curve
        var area = svg.append("g")
            .attr("id", 'area-' + input.key)
            .attr("class", "area");

        area.selectAll("g#area-" + input.key + " .area")
            .datum(data)
            .data([science.stats.bandwidth.nrd])
            .enter()
            .append("path")
            .attr("d", function(d) {
                var x = kde.bandwidth(d)(d3.range(min, max, max / 60));
                return a(x);
            })
            .attr("transform", "scale(1, 5) translate(0, -32)");

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

        /*
        brushg.call(brush.event)
            .transition()
            .duration(750)
            .call(brush.extent([0, d3.mean(data)]))
            .call(brush.event);
        */

        brushg.selectAll(".resize.w")
            .remove();

        //svg.selectAll('g.tick').remove();

        brushg.select("#" + input.key + " g.resize.e").append("path")
            .attr("transform", "translate(0, " + height + ")")
            .attr("d", line);

        brushg.selectAll("rect")
            .attr("height", height);

        function brushstart() {
            svg.classed("selecting", true);
        }

        function brushmove() {
            // remove existing mask
            svg.selectAll('g.mask').remove();
            // add brush selection mask
            var mask = svg.append("g")
                .attr("id", 'mask-' + input.key)
                .attr("class", "mask");
            var s = brush.extent();
            var clip = b(data, s[1]);
            var selected = data.slice(0, clip + 1);
            mask.selectAll("g#mask-" + input.key + " .mask")
                .datum(selected)
                .data([science.stats.bandwidth.nrd])
                .enter()
                .append("path")
                .attr("d", function(h) {
                    var x = kde.bandwidth(h)(d3.range(0, d3.max(selected), max / 60));
                    return m(x);
                })
                .attr("transform", "scale(1, 5) translate(0, -32)");

            // update brush extent
            brush.extent([0, s[1]]);
            d3.select("#" + input.key + " g.resize.e path")
                .attr("transform", "translate(0, " + s[1] + ")")
                .attr("d", 'M ' + s[1] + ' 0 ' + ' L ' + s[1] + ' ' + height);
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
    var iso = props.ISO_Codes;
    $('span#selected-country').html(props.country);
    inputs.update(props);
}

module.exports = inputs;
