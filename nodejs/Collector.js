const fs = require('fs');
const flamebearer = require('./flamebearer/flamebearer')
const S3 = require('aws-sdk/clients/s3')
const Path = require('path');
const {logger} = require('./logger')

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
                logger(`${file} deleted`)
            });
            fs.rmdirSync(path);
        }
        logger("/tmp directory is now empty")
    }

    async sendToDest(){
        const requests = [];
        const hash = Date.now().toString()

        fs.readdirSync(this.OUTPUT_PATH).forEach((file, index) => {
            const curPath = Path.join(this.OUTPUT_PATH, file)
            const data = fs.readFileSync(curPath)
            const key = `${hash}/${file}`
            requests.push(this.uploadToS3(key, data))
        });

        await Promise.all(requests)
        logger("Flamegraph upload completed!")
    }

    async uploadToS3(key, data){
        const params = {
            Bucket: process.env.LAMBDA_FLAME_DEST_BUCKET,
            Key: key,
            Body: data,
        };

        const res = await s3Client.upload(params).promise()
        logger(res.Key + " uploaded")
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
