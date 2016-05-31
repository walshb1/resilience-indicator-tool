## Preprocess

### This package contains **topojson** and **svg** processing scripts.

The scripts take a shapefile, a csv containing model input data and a configuration file and generate topjson and svg outputs. Both the topojson and svg ouputs are used in the visualization interface.

**Note:** The scripts in the **world** package are for processing world data only.

```
Usage: node index.js [--config config.js, --svg, --clean]

Options:
  --config, -c  The preprocess configuration file       [string]
  --svg, -s     Generate svg                            [boolean]
  --clean       Remove all generated files              [boolean]
  --help        Show help                               [boolean]
```
