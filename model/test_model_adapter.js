var python = require('python-shell');

var csv = ['key,increment\n'];

var fa_ratios = {
    protection: '0',
    fa: '0.04597',
    pe: '-0.61',
    pv: '0.90109',
    finance_pre: '0.36923',
    plgp: '0.6036',
    prepare_scaleup: '0',
    rating: '0',
    share1: '0.0827',
    social_p: '0.19572',
    social_r: '0.35894',
    unemp: '0.027',
    v: '0.34248',
    axfin_p: '0.05736',
    axfin_r: '0.12678',
    axhealth: '0.44923'
}

// convert object to csv
for (var property in fa_ratios) {
    if (fa_ratios.hasOwnProperty(property)) {
        csv.push(property + ',' + fa_ratios[property] + '\n');
    }
}

var options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: './',
    args: ['-d=df_iso.csv', '-f=' + csv.join('')]
}


python.run('/services/model_adapter.py', options, function(err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during execution
    console.log(results);
    return results;
});
