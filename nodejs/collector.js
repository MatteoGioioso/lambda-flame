const fs = require('fs');
const flamebearer = require('./flamebearer')
const S3 = require('aws-sdk/clients/s3')

const s3Client = new S3();

class Collector {
    constructor(props) {
    }

    async listFiles() {
        console.log('Reading files...', process.env.DEST_BUCKET)
        return new Promise((resolve, reject) => {
            fs.readdir('/tmp', function (err, files) {

                if (err) {
                    return reject('Unable to scan directory: ' + err);
                }

                console.log('files: ', files)
                //listing all files using forEach
                files.forEach(function (file) {
                    // Do whatever you want to do with the file
                    console.log(file);
                });

                return resolve(files)
            });
        })
    }

    async cleanUpFiles(){

    }

    async sendToDest(){

    }

    generateFlameGraph(){

    }
}


async function listFiles() {
    console.log('Reading files...', process.env.DEST_BUCKET)
    return new Promise((resolve, reject) => {
        fs.readdir('/tmp', function (err, files) {

            if (err) {
                return reject('Unable to scan directory: ' + err);
            }

            console.log('files: ', files)

            return resolve(files)
        });
    })
}


flamebearer.fuelTheFire('/tmp/isolate-output.json').then(() => {
    listFiles().then(async lists => {
        const data = fs.readFileSync('/tmp/flamegraph.html')

        const params = {
            Bucket: process.env.DEST_BUCKET,
            Key: 'flamegraph.html',
            Body: data,
            // ContentType: 'binary',
        };

        const res = await s3Client.upload(params).promise()
        console.log(res)
    }).catch(e => {
        console.log(e.message)
    })
})

