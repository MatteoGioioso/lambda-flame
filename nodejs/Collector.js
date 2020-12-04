const fs = require('fs');
const flamebearer = require('./flamebearer/flamebearer')
const S3 = require('aws-sdk/clients/s3')
const Path = require('path');

const s3Client = new S3();

class Collector {
    constructor() {
        this.OUTPUT_PATH = `/tmp/${process.env.LAMBDA_FLAME_OUTPUT}`
    }

    async cleanUpFiles(){
        const path = this.OUTPUT_PATH
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
                const curPath = Path.join(path, file);
                fs.unlinkSync(curPath);
            });
            fs.rmdirSync(path);
        }
    }

    async sendToDest(){
        const hash = Date.now().toString()
        const data = fs.readFileSync(`${this.OUTPUT_PATH}/flamegraph.html`)

        const params = {
            Bucket: process.env.DEST_BUCKET,
            Key: `flamegraph_${hash}.html`,
            Body: data,
        };

        const res = await s3Client.upload(params).promise()
        console.log(res)
    }

    async generateFlameGraph(){
        await flamebearer.fuelTheFire(`${this.OUTPUT_PATH}/isolate-output.json`)
    }
}

const collector = new Collector();

collector.generateFlameGraph().then(async () => {
    await collector.sendToDest()
    await collector.cleanUpFiles()
})
