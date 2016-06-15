var $ = require('jquery'),
    Q = require('q'),
    d3 = require('d3'),
    topojson = require('topojson'),
    map = require('./map'),
    styles = require('./styles'),
    inputs = require('./inputs'),
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
            app.state.outputDomains = _populateOutputDomains();
            app.state.inputInfo = results[1];
            app.state.inputDomains = _populateInputDomains(results[1]);
            app.state.selectedFeature = app.state.features[0];
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
    $.getJSON('config.json', function(data) {
        d.resolve(data);
    });
    return d.promise;
}

// returns geojson features from topojson
_getModelFeatures = function(data) {
    return topojson.feature(data, data.objects.model_features).features;
}

// returns a map of iso codes to model data entry
_getModelData = function(data) {
    var model = {};
    $.each(data, function(idx, model_data) {
        if (model_data.hasOwnProperty('iso')) {
            model[model_data.iso] = model_data;
        }
    });
    return model;
}

// Collects values for each of the output domains.
_populateOutputDomains = function() {
    var outputDomains = {
        'resilience': [],
        'risk': [],
        'risk_to_assets': [],
    }
    $.each(app.state.model, function(idx, data) {
        // TODO do these need to be configurable?
        var res = data['resilience'];
        var wel = data['risk'];
        var assets = data['risk_to_assets'];
        if (res) {
            outputDomains['resilience'].push(res);
        }
        if (wel) {
            outputDomains['risk'].push(wel);
        }
        if (assets) {
            outputDomains['risk_to_assets'].push(assets);
        }
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

// generate the scatter plots
_createScatterPlots = function() {
    var defaultInput = app.state.config.default_input;
    var input = inputs.getConfig()[defaultInput];
    var config = _renderConfig();
    // set the model on the plots for rendering
    plots.model = app.state.model;
    plots.output(config);
    plots.input(input);
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
                config: config
            })
        });
}

// get the map rendering configuration
_renderConfig = function(e) {
    if (e) {
        var chloropleth_field =
            e.currentTarget.getAttribute('data-output');
        var chloropleth_title = e.currentTarget.getAttribute('data-output-title');
        var colorScale = styles.colorScale(chloropleth_field, app.state.outputDomains[chloropleth_field]);
        return {
            'chloropleth_field': chloropleth_field,
            'chloropleth_title': chloropleth_title,
            'colorScale': colorScale
        }
    } else if (app.state.selectedOutput) {
        return app.state.selectedOutput;
    } else {
        // defaults
        var colorScale = styles.colorScale('resilience', app.state.outputDomains['resilience']);
        return {
            'chloropleth_field': 'resilience',
            'chloropleth_title': 'Resilience',
            'colorScale': colorScale
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
    $('.sm-map').bind('click', function(e) {
        var smMapId = e.currentTarget.id;
        $('.sm-map img').removeClass('active');
        $('div.sm-map').parent().removeClass('active');
        $('div#' + smMapId).parent().addClass('active');
        $('#' + smMapId + ' img').addClass('active');
        // update the map config
        var config = _renderConfig(e);
        styles.computeStyles(config.colorScale, app.state.model);
        $('#title').html(config.chloropleth_title);
        $.event.trigger({
            type: 'mapselect',
            config: config
        });
    });

    // run model on button event handling
    $('button#runmodel').on('click', function(e) {
        app.runmodel();
    });
}

// draw the UI
app.drawUI = function() {
    var d = Q.defer();
    Q.all([_createInputSliders(), _drawMap()])
        .then(function() {
            // select the country
            var selectedFeature;
            if (app.state.selectedFeature) {
                feature = app.state.selectedFeature;
            } else {
                feature = d3.select('.AUS') // TODO configurable
                    .classed('featureselect', true)
                    .datum();
            }
            // trigger default country selection
            $.event.trigger({
                type: "featureselect",
                feature: feature
            });
            d.resolve();
        });
    return d.promise;
}

// update the UI
app.updateUI = function(data) {
    // update state
    $.each(app.state.features, function(idx, feature) {
        var props = feature.properties;
        if (props.iso == data.iso) {
            $.extend(props, data);
        }
    });
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
    var selected = app.state.selectedFeature.properties.iso;
    var params = inputs.getInputValues();
    var df;
    $.each(app.state.features, function(idx, feature) {
        var props = feature.properties;
        if (props.iso == selected) {
            df = props;
        }
    });
    // update the original feature with the new inputs
    // doesn't modify the original feature
    var model_params = $.extend({}, df, inputs.getInputValues());
    console.log(model_params);
    // run the model
    var p = Q($.ajax({
        type: "POST",
        url: "/runmodel",
        data: model_params
    }));

    // update application state and redraw UI
    p.then(function(df) {
        var result = JSON.parse(df);
        var obj = {};
        // TODO improve format of return data
        $.each(result, function(idx, d) {
            obj[idx] = d['aus'];
        });
        console.log('Got new model data..', obj);
        $.event.trigger({
            type: 'runmodel',
            modelData: obj
        });
    });
}

/* event listeners */

$(document).ready(function() {
    app.init();
});

// handle featureselection events on map
$(document).on('featureselect', function(event) {
    var feature = event.feature;
    var model = app.state.model[feature.properties.iso];
    app.state.selectedFeature = feature;
    inputs.featureselect(feature, model);
    plots.featureselect(feature, model);
    map.featureselect(feature, model);
});

// handle feature selection events on either plot
$(document).on('plotselect', function(event) {
    var f = event.feature;
    var source = event.source;
    $.each(app.state.features, function(idx, feature) {
        var props = feature.properties;
        if (f.iso == props.iso) {
            app.state.selectedFeature = feature;
            var model = app.state.model[props.iso];
            inputs.featureselect(feature, model);
            map.featureselect(feature, model);
            plots.plotselect(feature, model, source);
        }
    });
});

// handle output map switch events
$(document).on('mapselect', function(event) {
    app.state.selectedOutput = event.config;
    map.config = app.state.selectedOutput;
    plots.mapselect(event.config);
    map.mapselect(app.state.selectedFeature);
});

// handle input slider changed events
$(document).on('inputchanged', function(event) {
    plots.inputchanged(event.input, app.state.selectedFeature);
});

// handle runmodel events
$(document).on('runmodel', function(event) {
    app.updateUI(event.modelData);
});


module.exports = app;
