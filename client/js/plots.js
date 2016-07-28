var d3 = require('d3'),
    Q = require('q'),
    $ = require('jquery');

var margin = {
        top: 20,
        right: 10,
        bottom: 20,
        left: 10
    },
    width = 450 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom;


var plots = {};

/*
 * Draws the output plot using the provided config.
 */
plots.output = function(config) {

    // keep a reference to the currently selected feature
    var selected = d3.select('#output-plot .featureselect');

    // clear plot before redrawing
    $('#output-plot svg').empty();
    $('#output-bubble-title').html(config.chloropleth_title);

    var domain = [];
    $.each(plots.model, function(idx, data) {
        if (data['gdp_pc_pp']) {
            var obj = {};
            obj['name'] = data['name'];
            obj['id'] = data['id']
            obj['gdp_pc_pp'] = data['gdp_pc_pp'];
            obj[config.chloropleth_field] = data[config.chloropleth_field];
            obj['pop'] = data['pop'];
            domain.push(obj);
        }
    });

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    // var xAxis = d3.svg.axis()
    //     .scale(x)
    //     .orient("bottom");
    //
    // var yAxis = d3.svg.axis()
    //     .scale(y)
    //     .orient("left");

    var svg = d3.select("#output-plot svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "bubble");

    domain.forEach(function(d) {
        d.gdp_pc_pp = +d.gdp_pc_pp;
        d[config.chloropleth_field] = +d[config.chloropleth_field];
        d.pop = +d.pop;
    });

    // x and y domains should be set via config file
    x.domain(d3.extent(domain, function(d) {
        return d.gdp_pc_pp; // should be configurable
    })).nice();
    y.domain(d3.extent(domain, function(d) {
        return d[config.chloropleth_field];
    })).nice();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5);

    svg.selectAll(".dot")
        .data(domain)
        .enter().append("circle")
        .attr("class", function(d) {
            return "dot " + d.id;
        })
        .attr("r", function(d) {
            return Math.floor(Math.log(d.pop));
        })
        .attr("cx", function(d) {
            return x(+d.gdp_pc_pp);
        })
        .attr("cy", function(d) {
            return y(d[config.chloropleth_field]);
        })
        .style("fill", function(d) {
            //return color(d.pop);
            return "steelblue";
        })
        .style("opacity", '.5')
        .on('mousedown', function(d) {
            // notify event listeners
            $.event.trigger({
                type: 'plotselect',
                source: 'output-plot',
                feature: d
            })
        })
        .append("title")
        .text(function(d) {
            return d.name + ", Pop:" + d.pop;
        });

    if (!selected.empty()) {
        var sel = d3.select('.dot.' + selected.datum().id);
        sel.attr("class", "dot " + selected.datum().id + " featureselect");
    }

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("GDP");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(config.chloropleth_title)
}

plots.input = function(input, selectedFeature, initialModel) {
    // clear plot before redrawing
    $('#input-plot svg').empty();

    var domain = [];
    $.each(plots.model, function(idx, data) {
        if (data['gdp_pc_pp']) {
            var obj = {};
            obj['name'] = data['name'];
            obj['id'] = data['id']
            obj['gdp_pc_pp'] = data['gdp_pc_pp'];
            if (selectedFeature) {
                if (data.id == selectedFeature.properties.id) {
                    var extent = +input.brush.extent()[1].toFixed(5);
                    obj[input.key] = extent;
                } else {
                    obj[input.key] = data[input.key];
                }
            } else {
                obj[input.key] = data[input.key];
            }
            obj['pop'] = data['pop'];
            domain.push(obj);
        }
    });

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5);

    var svg = d3.select("#input-plot svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "bubble");

    // get currently selected bubble if any
    var selected = d3.select('circle.featureselect');

    svg.selectAll("g").remove();
    svg.selectAll('circle').remove();

    domain.forEach(function(d) {
        d.gdp_pc_pp = +d.gdp_pc_pp;
        d[input.key] = +d[input.key];
        d.pop = +d.pop;
    });

    // x and y domains should be set via config file
    x.domain(d3.extent(domain, function(d) {
        return d.gdp_pc_pp; // TODO: should be configurable, need label
    })).nice();
    y.domain(d3.extent(domain, function(d) {
        return d[input.key]; // TODO: should be configurable, need label
    })).nice();

    svg.selectAll(".dot")
        .data(domain)
        .enter().append("circle")
        .attr("class", function(d) {
            return "dot " + d.id;
        })
        .attr("r", function(d) {
            return Math.floor(Math.log(d.pop));
        })
        .attr("cx", function(d) {
            return x(d.gdp_pc_pp);
        })
        .attr("cy", function(d) {
            return y(d[input.key]);
        })
        .style("fill", function(d) {
            //return color(d.pop);
            return "steelblue";
        })
        .style("opacity", '.5')
        .on('mousedown', function(d) {
            // notify event listeners
            $.event.trigger({
                type: 'plotselect',
                source: 'input-plot',
                feature: d
            })
        })
        .append("title")
        .text(function(d) {
            return d.name + ", Pop: " + Math.floor(d.pop);
        });

    var title = input.descriptor;
    $('#input-bubble-title').html(title);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("GDP");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(input.descriptor);

    /*
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d;
        });
    */

}

// handle feature selection
plots.featureselect = function(feature, model,
    initialModel, inputConfig, output) {
    var id = feature.properties.id;
    var initial = initialModel[id];
    // reset input plot
    plots.input(inputConfig, feature, initial);
    // select features on plots
    _selectBubble(feature, 'output-plot', initialModel, output);
    _selectBubble(feature, 'input-plot', initialModel, inputConfig.key);
}

// update plots on map selection change
plots.mapselect = function(feature, map_config, initialModel, input, output) {
    plots.output(map_config);
    _selectBubble(feature, 'output-plot', initialModel, output);
    _selectBubble(feature, 'input-plot', initialModel, input);
}

// redraw the input scatterplot when an input is changed by the user
plots.inputchanged = function(input, selectedFeature, initialModel) {
    var id = selectedFeature.properties.id;
    var initial = initialModel[id];
    // redraw the plot based on the current input
    plots.input(input, selectedFeature, initial);
    _selectBubble(selectedFeature, 'input-plot', initialModel, input.key);
}

// handle selection events on either of the plots
plots.plotselect = function(feature, source, initialModel, input, output) {
    // var dest = source == 'output-plot' ? 'input-plot' : 'output-plot';

    _selectBubble(feature, 'output-plot', initialModel, output);
    _selectBubble(feature, 'input-plot', initialModel, input);
}


// select a bubble on one of the plots
_selectBubble = function(feature, source, initialModel, key) {

    var id = feature.properties.id;
    var initial = initialModel[id];
    var p = d3.select('#' + source + ' svg');
    p.selectAll('circle.dot')
        .classed('featureselect', false);
    var s1 = p.select('circle.dot.' + id).classed('featureselect', true);
    n = s1.node();
    d = s1.datum();

    if (initial) {
        p.selectAll('circle.initial').remove();
        var x = d3.scale.linear()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);
        var domain = _getDomain(initialModel, key);
        x.domain(d3.extent(domain, function(d) {
            return d.gdp_pc_pp;
        })).nice();
        y.domain(d3.extent(domain, function(d) {
            return d[key];
        })).nice();

        p.append('circle')
            .attr('class', function() {
                return 'initial ' + initial.id;
            })
            .attr("r", function() {
                return Math.floor(Math.log(initial.pop));
            })
            .attr("cx", function() {
                return x(initial.gdp_pc_pp);
            })
            .attr("cy", function() {
                return y(initial[key]);
            })
            .style({
                'fill': 'lightgrey',
                'stroke-width': '2px',
                'stroke': 'darkgrey'
            })
            .style("opacity", '1')
            .on('mouseover', function() {
                // console.log('initial-' + initia.id);
            })
    }

    var s2 = d3.select(n.parentNode.appendChild(
        n.cloneNode(true), n.nextSibling));

    s2.datum(d)
        .on('mousedown', function(d) {
            $.event.trigger({
                type: 'plotselect',
                source: source,
                feature: d
            })
        })

    n.remove();
}

_getDomain = function(initialModel, key) {
    var domain = [];
    for (var model in initialModel) {
        var obj = {};
        m = initialModel[model];
        obj.gdp_pc_pp = +m.gdp_pc_pp;
        obj[key] = +m[key];
        obj.pop = +m.pop;
        domain.push(obj);
    }
    return domain;
}


module.exports = plots;
