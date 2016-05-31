/**
 * Configuration for resilience tool map preprocessing.
 */
config = {
    "inputs": {
        // model input data
        "data": "df_iso.csv",
        // join field on input data
        "data_join_field": "ISO",
        // join field on shpapefile
        "shp_join_field": "ISO_Codes",
    },
    "map": {
        // ploygon simplification tolerance
        "simplify_poly": "20%",
        // line simplification tolerance
        "simplify_line": "20%"
    },
    "outputs": {
        // topojson output file
        "topojson_out": "world.topojson",
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
            "coastline": {
                "fill": "none",
                "stroke": "#666",
                "strokeWidth": ".5px",
                "strokeLinejoin": "miter"
            },
            "intl_boundaries": {
                "fill": "none",
                "stroke": "#666",
                "strokeWidth": ".5px",
                "strokeLinejoin": "miter"
            },
            "dotted_line": {
                "stroke": "#666",
                "strokeWidth": ".5px",
                "strokeDashArray": ".1, .8",
                "strokeLineCap": "round"
            },
            "dashed_line": {
                "stroke": "#666",
                "strokeWidth": ".5px",
                "strokeDashArray": ".8, .8",
                "strokeLineJoin": "mitre"
            },
            "tightly_dashed_line": {
                "stroke": "#666",
                "strokeWidth": ".5px",
                "strokeDashArray": "1.5, .5",
                "strokeLineJoin": "mitre"
            }
        }
    },

}

module.exports = config;
