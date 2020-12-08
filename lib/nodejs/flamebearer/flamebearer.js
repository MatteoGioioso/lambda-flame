// Copyright (c) 2018, Mapbox
'use strict';

const fs = require('fs');
const path = require('path');
const concat = require('concat-stream');
const flamebearer = require('./flameBuilder');
const {logger} = require('../logger')
const lambdaRootFolder = '/opt'
const LAMBDA_FLAME_OUTPUT = process.env.LAMBDA_FLAME_OUTPUT

function fuelTheFire(file) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(file).pipe(concat(function (buf) {
            console.time('Parsed JSON in');
            let json = {};
            try {
                json = JSON.parse(buf.toString('utf8'));
            } catch (e) {
                // noop
            }
            if (!json.code || !json.ticks) {
                logger('Invalid input; expected a V8 log in JSON format. Produce one with:');
                logger('node --prof-process --preprocess isolate*.log')
                return;
            }
            console.timeEnd('Parsed JSON in');

            console.time('Processed V8 log in');
            const {names, stacks} = flamebearer.v8logToStacks(json);
            const levels = flamebearer.mergeStacks(stacks);
            console.timeEnd('Processed V8 log in');

            const vizSrc = fs.readFileSync(path.join(lambdaRootFolder, '/nodejs/flamebearer/viz.js'), 'utf8');
            const src = fs
                .readFileSync(path.join(lambdaRootFolder, '/nodejs/flamebearer/index.html'), 'utf8')
                .toString()
                .split('<script src="viz.js"></script>')
                .join(`<script>${vizSrc}</script>`)
                .split('/* BIN_SPLIT */')
                .filter((str, i) => i % 2 === 0)
                .join('')
                .split('/* BIN_PLACEHOLDER */')
                .join(`names = ${JSON.stringify(names)};\n` +
                    `levels = ${JSON.stringify(levels)};\n` +
                    `numTicks = ${stacks.length};`);

            const folder = path.join('/tmp', `/${LAMBDA_FLAME_OUTPUT}`, `/flamegraph.html`)
            fs.writeFileSync(folder, src);
            logger(`Saved to ${folder} `);
            return resolve()
        }))
    })
}

module.exports = {
    fuelTheFire
};
