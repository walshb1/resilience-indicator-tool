#!/usr/bin/env python3

"""Wrapper for running Socio-economic resilience indicator model."""

import argparse
import importlib
import json
import logging
import os
import sys
import time

import pandas as pd

PACKAGE_PARENT = '..'
SCRIPT_DIR = os.path.dirname(os.path.realpath(
    os.path.join(os.getcwd(), os.path.expanduser(__file__))))
sys.path.append(os.path.normpath(os.path.join(SCRIPT_DIR, PACKAGE_PARENT)))

if sys.version_info[0] < 3:
    from StringIO import StringIO
else:
    from io import StringIO

logging.basicConfig(filename='model/model.log', level=logging.DEBUG)


class Model():
    """Runs the resilience model."""

    def __init__(self, data_frame=None, model_function=None, debug=False):
        d = json.loads(data_frame)
        self.data_frame = pd.DataFrame.from_dict({'data': d}, orient='index')
        self.data_frame.index.name = 'data'
        self.data_frame = pd.read_csv(
            StringIO(self.data_frame.to_csv()), sep=",", index_col=0)
        self.model_function = model_function
        self.debug = debug

    def run(self):
        output = self.model_function(self.data_frame)
        return output

if __name__ == '__main__':

    parser = argparse.ArgumentParser(
        description="Run the Socio-economic Resilience Model.")
    parser.add_argument('-d', '--data-frame', required=True,
                        dest="data_frame", help="The input data frame")
    parser.add_argument('-m', '--model-function', required=True,
                        dest='model_function', help='The model function to run'
                        )
    args = parser.parse_args()
    config = {}
    for k, v in vars(args).items():
        if (v is None):
            continue
        else:
            config[k] = v
    data_frame = config.get('data_frame')
    mf = config.get('model_function')
    m = mf.split('.')[0]
    f = mf.split('.')[1]
    module = importlib.import_module('data.' + m)
    model_function = getattr(module, f)
    debug = False
    if config.get('debug'):
        debug = True

    model = Model(
        data_frame=data_frame, model_function=model_function, debug=debug
    )
    startTime = time.time()
    output = model.run()
    elapsed = time.time() - startTime
    logging.debug('Running model took: {}'.format(elapsed))
    # with open('model_output.csv', 'w') as f:
    #     f.write(output.to_csv())
    print(output.to_json())
