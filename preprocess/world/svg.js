#!/usr/bin/env node

var path = require("path"),
  jsdom = require("jsdom"),
  argv = require("optimist").argv,
  topojson = require('topojson'),
  sprintf = require('sprintf'),
  //svg2png = require('svg-to-png'),
  Q = require('q'),
  fs = require('fs');

var generate = {};

generate.svg = function(file, svgConfig) {

  // pull out svg configuration values
  var width = svgConfig.width;
  var height = svgConfig.height;
  var styles = svgConfig.styles;
  var chloropleth_field = svgConfig.chloropleth_field;
  var chloropleth_color = svgConfig.chloropleth_color;

  var d = Q.defer();
  scripts = [
      "../node_modules/d3/d3.min.js",
      "../node_modules/d3-geo-projection.min.js"
    ],

    // create a jsdom environment with an empty <svg> document
    jsdom.env("<svg></svg>", scripts, function(errors, window) {
      var d3 = window.d3,
        svg = d3.select("svg");
      require('d3-geo-projection')(d3);

      svg.attr("width", width)
        .attr("height", height);
      var layerGroup = svg.append("g");
      var coastLayer = layerGroup.append("g"),
        countryLayer = layerGroup.append("g"),
        countryBdies = layerGroup.append("g"),
        dispAreas = layerGroup.append("g"),
        intlBdies = layerGroup.append("g"),
        dispBdies = layerGroup.append("g");

      var world;
      fs.readFile(file, 'utf-8', function(err, data) {
        //console.log(err, data);
        world = JSON.parse(data);
        var coastlines = topojson.feature(world, world.objects.coastlines);
        var countries = topojson.feature(world, world.objects.countries);
        var boundaries = topojson.feature(world, world.objects.intl_boundaries);
        var disputed = topojson.feature(world, world.objects.disp_areas);
        var dispbdies = topojson.feature(world, world.objects.disp_boundaries);

        var projection = d3.geo.robinson()
          .scale((width - 1) / 2 / Math.PI).translate([width / 2, height / 2]);
        var path = d3.geo.path().projection(projection);

        // coastlines
        coastLayer.selectAll(".coastline")
          .data(coastlines.features)
          .enter().append("path")
          .attr("class", function(d) {
            return "coastline"
          })
          .attr("d", path);

        // countries
        countryLayer.selectAll(".country")
          .data(countries.features)
          .enter().append("path")
          .attr("class", function(d) {
            var cls = d.properties.field_1 == null ? 'nodata' : 'data';
            var iso = d.properties.ISO_Codes;
            return sprintf("country %s %s", cls, iso);
          })
          .attr("style", function(d) {
            var chl_color = d.properties[chloropleth_color];
            var color = chl_color != null ? chl_color : styles.nodata.fill;
            return sprintf("fill: %s;", color);
          })
          .attr("d", path);

        // disputed areas
        dispAreas.selectAll(".disputed")
          .data(disputed.features)
          .enter().append("path")
          .attr("class", function(d) {
            return "disputed"
          })
          .attr("d", path);

        // international boundaries
        intlBdies.selectAll(".intlbdie")
          .data(boundaries.features)
          .enter().append("path")
          .attr("class", function(d) {
            return "intlbdie"
          })
          .attr("d", path);

        // disputed boundaries
        dispBdies.selectAll(".dispbdies")
          .data(dispbdies.features)
          .enter().append("path")
          .attr("class", function(d) {
            // add classes for required disputed boundary styles
            var style = d.properties.Style.replace(/ /g, '_').toLowerCase();
            return "dispbdies " + style;
          })
          .attr("d", path);

        // attach styles
        addStyles(svg);

        var node = svg.node();
        if (node instanceof window.d3.selection) {
          node = node.node();
        }
        // set the xmlns attribute on the root node
        node.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        // write the XML declaration first
        //write('<?xml version="1.0" standalone="yes"?>');
        // then "serialize" using outerHTML
        var filename = file.split('.')[0] + '.svg';
        fs.writeFile(filename, node.outerHTML, function(err) {
          if (err) console.log(err);
          console.log('Created svg: ' + filename);
          d.resolve(filename);
        });

      });



      function addStyles(svg) {
        var coastline = styles.coastline;
        var boundaries = styles.intl_boundaries;
        var dotted = styles.dotted_line;
        var dashed = styles.dashed_line;
        var tightly_dashed = styles.tightly_dashed_line;

        svg.selectAll('.coastline')
          .style('fill', 'none')
          .style('stroke', coastline.stroke)
          .style('stroke-width', coastline.strokeWidth)
          .style('stroke-linejoin', coastline.strokeLinejoin);

        svg.selectAll('.intlbdie')
          .style('fill', 'none')
          .style('stroke', boundaries.stroke)
          .style('stroke-width', boundaries.strokeWidth)
          .style('stroke-linejoin', boundaries.strokeLinejoin);

        svg.selectAll('.dispbdies')
          .style('fill', 'none');

        svg.selectAll('.disputed')
          .style('fill', styles.nodata.fill);

        svg.selectAll('.dotted_line')
          .style('fill', 'none')
          .style('stroke', dotted.stroke)
          .style('stroke-width', dotted.strokeWidth)
          .style('stroke-dasharray', dotted.strokeDashArray)
          .style('stroke-linecap', dotted.strokeLineCap);

        svg.selectAll('.dashed_line')
          .style('fill', 'none')
          .style('stroke', dashed.stroke)
          .style('stroke-width', dashed.strokeWidth)
          .style('stroke-dasharray', dashed.strokeDashArray)
          .style('stroke-linejoin', dashed.strokeLinejoin);

        svg.selectAll('.tightly_dashed_line')
          .style('fill', 'none')
          .style('stroke', tightly_dashed.stroke)
          .style('stroke-width', tightly_dashed.strokeWidth)
          .style('stroke-dasharray', tightly_dashed.strokeDashArray)
          .style('stroke-linejoin', tightly_dashed.strokeLinejoin);

      }

    });

  return d.promise;

}

module.exports = generate;
