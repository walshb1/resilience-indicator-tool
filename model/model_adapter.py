#!/usr/bin/env python3

"""Wrapper for running Socio-economic resilience indicator model."""

import sys
import time
import argparse
import logging
import json
import pandas as pd

from res_ind_lib import compute_resiliences

if sys.version_info[0] < 3:
    from StringIO import StringIO
else:
    from io import StringIO

logging.basicConfig(filename='model.log', level=logging.DEBUG)


class Model():
    """Runs the resilience model."""

    def __init__(self, data_frame=None, debug=False):
        d = json.loads(data_frame)
        self.data_frame = pd.DataFrame.from_dict({'data': d}, orient='index')
        self.data_frame.index.name = 'data'
        self.data_frame = pd.read_csv(
            StringIO(self.data_frame.to_csv()), sep=",", index_col=0)
        self.debug = debug

    def run(self):
        output = compute_resiliences(self.data_frame)
        return output

if __name__ == '__main__':

    parser = argparse.ArgumentParser(
        description="Run the Socio-economic Resilience Model.")
    parser.add_argument('-d', '--data-frame', required=True,
                        dest="data_frame", help="The input data frame")
    args = parser.parse_args()
    config = {}
    for k, v in vars(args).items():
        if (v is None):
            continue
        else:
            config[k] = v
    data_frame = config.get('data_frame')
    debug = False
    if config.get('debug'):
        debug = True

    model = Model(
        data_frame=data_frame, debug=debug
    )
    startTime = time.time()
    output = model.run()
    elapsed = time.time() - startTime
    logging.debug('Running model took: {}'.format(elapsed))
    # with open('model_output.csv', 'w') as f:
    #     f.write(output.to_csv())
    print(output.to_json())
