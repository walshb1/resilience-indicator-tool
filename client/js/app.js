var $ = require('jquery'),
    Q = require('q'),
    d3 = require('d3'),
    topojson = require('topojson'),
    map = require('./map'),
    styles = require('./styles'),
    inputs = require('./inputs'),
    outputs = require('./outputs'),
    plots = require('./plots');

var app = {};

// container for application state
app.state = {};

// loads the initial data and populates application state
_loadInitialData = function() {
    var d = Q.defer();
    Q.all([_loadMapData(), _loadInputData(), _loadConfig(), _loadModelData()])
        .then(function(results) {
            app.state.config = results[2];
            app.state.layers = results[0];
            app.state.features = _getModelFeatures(results[0]);
            app.state.model = _getModelData(results[3]);
            app.state.initialModel = $.extend(true, {}, app.state.model);
            app.state.outputDomains = _populateOutputDomains();
            app.state.inputInfo = results[1];
            app.state.inputDomains = _populateInputDomains(results[1]);
            app.state.selectedFeature = _getDefaultFeature();
            d.resolve();
        });
    return d.promise;
}

// load the map data
_loadMapData = function() {
    var d = Q.defer();
    $.getJSON('features.json', function(data) {
        d.resolve(data);
    })
    return d.promise
}

// load the inputs_info data
_loadInputData = function() {
    var d = Q.defer();
    $.getJSON('inputs.json', function(data) {
        d.resolve(data);
    });
    return d.promise;
}

// loads the initial model data
_loadModelData = function() {
    var d = Q.defer();
    $.getJSON('modeldata.json', function(data) {
        d.resolve(data);
    });
    return d.promise;
}

// load the application configuration
_loadConfig = function() {
    var d = Q.defer();
    var config = require('../../conf/config')
    d.resolve(config);
    return d.promise;
}

// get the default feature from app config
_getDefaultFeature = function() {
    var f = null;
    $.each(app.state.features, function(idx, feature) {
        if (feature.properties.id == app.state.config.default_feature) {
            f = feature;
        }
    });
    return f;
}

// returns geojson features from topojson
_getModelFeatures = function(data) {
    return topojson.feature(data, data.objects.model_features).features;
}

// returns a map of id codes to model data entry
_getModelData = function(data) {
    var model = {};
    $.each(data, function(idx, model_data) {
        if (model_data.hasOwnProperty('id')) {
            model[model_data.id] = model_data;
        }
    });
    return model;
}

// Collects values for each of the output domains.
_populateOutputDomains = function() {
    var outputDomains = {}
    $.each(app.state.config.outputs, function(idx, output) {
        outputDomains[idx] = {
            'domain': [],
            'descriptor': output.descriptor,
            'gradient': output.gradient
        };
        $.each(app.state.model, function(i, data) {
            var val = data[idx];
            outputDomains[idx].domain.push(val);
        });
    });
    return outputDomains;
}

// Collects input objects to render input sliders
_populateInputDomains = function(data) {
    var params = app.state.config.inputs;
    var inputDomains = [];
    $.each(data, function(i, val) {
        if (params.indexOf(val.key) > -1) {
            var obj = {};
            obj.key = val.key;
            obj.descriptor = val.descriptor;
            obj.distribution = [];
            obj.lower = +val.lower;
            obj.upper = +val.upper;
            obj.number_type = val.number_type;
            $.each(app.state.model, function(j, m) {
                if (m[val.key]) {
                    obj.distribution.push(+m[val.key]);
                }
            })
            inputDomains.push(obj);
        }
    });
    return inputDomains;
}

// generate the input sliders
_createInputSliders = function(data) {
    // draw input controls and bubble charts
    inputs.getSliders(app.state.inputDomains);
    _createScatterPlots()
}

_createOutputDistributions = function() {
    // create output distribution graphs
    outputs.getOutputDistributions(app.state.outputDomains);
}

// generate the scatter plots
_createScatterPlots = function() {
    var defaultInput = app.state.config.default_input;
    var input = inputs.getConfig()[defaultInput];
    var config = _renderConfig();
    // set the model on the plots for rendering
    plots.model = app.state.model;
    plots.output(config);
    plots.input(input, app.state.selectedFeature);
}

// draw the map
_drawMap = function() {
    // resilience selected by default
    var config = _renderConfig();
    map.draw(config, app.state.layers, app.state.model)
        .then(function() {
            $('#title').html(config.chloropleth_title);
            styles.computeStyles(config.colorScale, app.state.model);
            styles.applyDefaults();
            $.event.trigger({
                type: 'mapselect',
                chloropleth_title: config.chloropleth_title,
                chloropleth_field: config.chloropleth_field
            })
        });
}

// get the map rendering configuration
_renderConfig = function(chloropleth_field, chloropleth_title) {
    var w = app.state.config.map.width;
    var h = app.state.config.map.height;
    if (chloropleth_field && chloropleth_title) {
        // var chloropleth_field =
        //     e.currentTarget.getAttribute('data-output');
        // var chloropleth_title = e.currentTarget.getAttribute('data-output-title');
        var colorScale = styles.colorScale(chloropleth_field, app.state.outputDomains[chloropleth_field]);
        return {
            'chloropleth_field': chloropleth_field,
            'chloropleth_title': chloropleth_title,
            'colorScale': colorScale,
            'width': w,
            'height': h
        }
    } else if (app.state.selectedOutput) {
        return app.state.selectedOutput;
    } else {
        // defaults
        var colorScale = styles.colorScale('resilience', app.state.outputDomains['resilience']);
        return {
            'chloropleth_field': 'resilience',
            'chloropleth_title': 'Socioeconomic capacity (%)',
            'colorScale': colorScale,
            'width': w,
            'height': h
        }
    }
}

// initialize the app
app.init = function() {
    // load inital data, set application state then draw ui components
    _loadInitialData().then(function() {
        var p = app.drawUI();
        p.then(function() {
            console.log('UI Finished');
            $("#spinner").css('display', 'none');
            $('#ui').css('visibility', 'visible');
        });
    });

    // map switcher event handling
    $('.sm-map').on('click', function(e) {
        var chloropleth_field = e.currentTarget.getAttribute('data-output'),
            chloropleth_title =  e.currentTarget.getAttribute('data-output-title');
        $.event.trigger({
            type: 'mapselect',
            chloropleth_field: chloropleth_field,
            chloropleth_title: chloropleth_title
        });
    });

    // run model on button event handling
    $('button#runmodel').on('click', function(e) {
        app.runmodel();
    });

    // reset the model to its initial state
    $('button#resetmodel').on('click', function(e){
        app.resetmodel();
    })
}

// draw the UI
app.drawUI = function() {
    var d = Q.defer();
    Q.all([_createInputSliders(), _createOutputDistributions(), _drawMap()])
        .then(function() {
            // select the country
            var selectedFeature;
            if (app.state.selectedFeature) {
                feature = app.state.selectedFeature;
            } else {
                feature = d3.select(app.state.config['default_feature'])
                    .classed('featureselect', true)
                    .datum();
            }
            // trigger default country selection
            $.event.trigger({
                type: "featureselect",
                feature: feature
            });
            // trigger default input selection change
            var input = inputs.getConfig()[app.state.config.default_input];
            $.event.trigger({
                type: "inputchanged",
                input: input
            });
            d.resolve();
        })
        .fail(function(err){
            console.log(err);
        });
    return d.promise;
}

// update the UI
app.updateUI = function(data) {
    // update model state
    var model = app.state.model[data.id];
    $.extend(model, data);
    app.state.outputDomains = _populateOutputDomains();
    app.state.inputDomains = _populateInputDomains(app.state.inputInfo);
    app.drawUI().then(function() {
        $('#spinner').css('display', 'none');
        $('#mask').css('opacity', '1');
    });
}

// run the model
app.runmodel = function() {
    console.log('Running model.');
    $('#spinner span').html('Running..');
    $('#spinner').css('display', 'block');
    $('#mask').css('opacity', '.1');

    // pull out the model data to submit
    var selected = app.state.selectedFeature.properties.id;
    var df = app.state.model[selected];

    // update the original feature with the new inputs
    // doesn't modify the original feature
    var model_params = $.extend(true, {}, df, inputs.getInputValues());

    // run the model
    var p = Q($.ajax({
        type: "POST",
        url: "runmodel",
        data: model_params
    }));

    // update application state and redraw UI
    p.then(function(df) {
        var result = JSON.parse(df);
        var obj = {};
        $.each(result, function(idx, d) {
            obj[idx] = d['data'];
        });
        console.log('Got new model data..', obj);
        $.event.trigger({
            type: 'runmodel',
            modelData: obj
        });
    })
    .fail(function(err){
        console.log(err);
    });
}

app.resetmodel = function(){
    $('#spinner span').html('');
    $('#spinner').css('display', 'block');
    $('#mask').css('opacity', '.2');
    _loadInitialData().then(function() {
        var p = app.drawUI();
        p.then(function() {
            console.log('UI Finished');
            $("#spinner").css('display', 'none');
            $('#mask').css('opacity', '1');
            // $('#ui').css('visibility', 'visible');
        });
    })
    .fail(function(err){
        console.log(err);
    });
}

/* event listeners */

$(document).ready(function() {
    app.init();
});

// handle featureselection events on map
$(document).on('featureselect', function(event) {
    var feature = event.feature;
    var model = app.state.model[feature.properties.id];
    var initialModel = app.state.initialModel[feature.properties.id];
    app.state.selectedFeature = feature;
    inputs.featureselect(feature, model, initialModel);
    outputs.featureselect(feature, model, initialModel);
    plots.featureselect(feature, initialModel);
    map.featureselect(feature, model);
});

// handle feature selection events on either plot
$(document).on('plotselect', function(event) {
    var f = event.feature;
    var source = event.source;
    $.each(app.state.features, function(idx, feature) {
        var props = feature.properties;
        if (f.id == props.id) {
            app.state.selectedFeature = feature;
            var model = app.state.model[props.id];
            var initialModel = app.state.initialModel[feature.properties.id];
            inputs.featureselect(feature, model, initialModel);
            outputs.featureselect(feature, model, initialModel);
            map.featureselect(feature, model);
            plots.plotselect(feature, source, initialModel);
        }
    });
});

// handle output map switch events
$(document).on('mapselect', function(e) {
    // update the map config
    var chloropleth_field = e.chloropleth_field,
        chloropleth_title = e.chloropleth_title;

    // update map div active styles
    $('.sm-map img').removeClass('active');
    $('div.sm-map').parent().removeClass('active');
    var mapDiv = $("div.sm-map[data-output='" + chloropleth_field + "']");
    mapDiv.parent().addClass('active');
    $('#' + mapDiv.id + ' img').addClass('active');

    // update output div active styles
    $('#outputs div').css({
        'background': 'transparent',
        'border': 'none'
    });
    $('#outputs div#' + chloropleth_field).css({
        'background-color': 'rgba(211, 211, 211, 0.3)',
        'border': '1px solid rgba(211, 211, 211, 0.5)'
    });

    // switch output maps
    var config = _renderConfig(chloropleth_field, chloropleth_title);
    styles.computeStyles(config.colorScale, app.state.model);
    styles.applyDefaults();
    $('#title').html(chloropleth_title);
    var id = app.state.selectedFeature.properties.id;
    var model = app.state.model[id];
    app.state.selectedOutput = config;
    map.config = app.state.selectedOutput;
    plots.mapselect(app.state.selectedFeature, config);
    map.mapselect(app.state.selectedFeature, model);
});

// handle input slider changed events
$(document).on('inputchanged', function(event) {
    var feature = app.state.selectedFeature;
    var initialModel = app.state.initialModel[feature.properties.id];
    plots.inputchanged(event.input, feature, initialModel);
});

// handle runmodel events
$(document).on('runmodel', function(event) {
    app.updateUI(event.modelData);
});

// resets the output data display to selected feature
$(document).on('display-output-data', function(event) {
    var config = event.config;
    var id = app.state.selectedFeature.properties.id;
    var name = app.state.selectedFeature.properties.name;
    var model = app.state.model[id];
    var chl_field = +model[config.chloropleth_field];
    $('#data').empty();
    $('#data').append('<span><strong>' + name + '. </strong></span>');
    $('#data').append('<span><strong>' + config.chloropleth_title + ': </strong>' + chl_field.toFixed(5) + '</span>');
});

$(document).on('outputselect', function(e){
    var output = e.currentTarget.getAttribute('data-output');
    var config = _renderConfig(e);
    styles.computeStyles(config.colorScale, app.state.model);
    styles.applyDefaults();
    $('#title').html(config.chloropleth_title);
    alert(output);
});


module.exports = app;
