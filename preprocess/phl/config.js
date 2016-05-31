/**
 * Configuration for resilience tool map preprocessing.
 */
config = {
    "inputs": {
        // model input data
        "data": "phl/df_with_results_phl.csv",

    },
    "layers": {
        // shapefile layers to convert to topojson
        "model_features":{
            // layer name in topojson
            "layer_name": "provinces",
            // topojson filename
            "output_topojson": "philippines.topojson",
            // input shapefile name - relative to index.js
            "shape_file": "phl/shp/PHL_adm1.shp",
            // fields to preserve from input to output
            "filter_fields": "NAME_1",
            // join field on input data
            "data_join_field": "province",
            // join field on shpapefile
            "shp_join_field": "NAME_1",
        }
    },
    "map": {
        // ploygon simplification tolerance
        "simplify_poly": "20%",
        // line simplification tolerance
        "simplify_line": "20%"
    },
    "outputs": {
        // topojson output file
        "topojson_out": "philippines.topojson",
    },
    "svg": {
        // svg width and height
        "width": 250,
        "height": 125,
        // field used to generate chloropleth
        "chloropleth_field": "resilience",
        // field holding chloropleth color bands
        "chloropleth_color": "risk_to_assets_color",
        // svg styles
        "styles": {
            "nodata": {
                "fill": "#E0E0E0"
            },
        }
    },

}

module.exports = config;
