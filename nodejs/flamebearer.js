'use strict';

const fs = require('fs');
const path = require('path');
const concat = require('concat-stream');
// const opn = require('opn');
const flamebearer = require('./flameBuilder');
const lambdaRootFolder = process.env.LAMBDA_TASK_ROOT

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
                console.log('Invalid input; expected a V8 log in JSON format. Produce one with:');
                console.log('node --prof-process --preprocess isolate*.log');
                return;
            }
            console.timeEnd('Parsed JSON in');

            console.time('Processed V8 log in');
            const {names, stacks} = flamebearer.v8logToStacks(json);
            const levels = flamebearer.mergeStacks(stacks);
            console.timeEnd('Processed V8 log in');

            const vizSrc = fs.readFileSync(path.join(lambdaRootFolder, '/nodejs/viz.js'), 'utf8');
            const src = fs
                .readFileSync(path.join(lambdaRootFolder, '/nodejs/index.html'), 'utf8')
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

            fs.writeFileSync(path.join('/tmp', '/flamegraph.html'), src);
            console.log(`Saved to flamegraph.html (${humanFileSize(src.length)}). Opening...`);
            return resolve()
        }))
    })
}

function humanFileSize(size) {
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return Math.round(100 * (size / Math.pow(1024, i))) / 100 + ' ' + ['B', 'kB', 'MB'][i];
}

module.exports = {
    fuelTheFire
};
