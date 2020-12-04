const http = require('http');

class RuntimeAPI {
    request(options) {
        options.host = HOST
        options.port = PORT

        return new Promise((resolve, reject) => {
            let req = http.request(options, res => {
                let bufs = []
                res.on('data', data => bufs.push(data))
                res.on('end', () => resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(bufs).toString(),
                }))
                res.on('error', reject)
            })
            req.on('error', reject)
            req.end(options.body)
        })
    }


    async invokeResponse(result, context) {
        const res = await request({
            method: 'POST',
            path: `${RUNTIME_PATH}/invocation/${context.awsRequestId}/response`,
            body: JSON.stringify(result === undefined ? null : result),
        })
        if (res.statusCode !== 202) {
            throw new Error(`Unexpected /invocation/response response: ${JSON.stringify(res)}`)
        }
    }

    async postError(path, err) {
        const lambdaErr = toLambdaErr(err)
        const res = await request({
            method: 'POST',
            path,
            headers: {
                'Content-Type': 'application/json',
                'Lambda-Runtime-Function-Error-Type': lambdaErr.errorType,
            },
            body: JSON.stringify(lambdaErr),
        })
        if (res.statusCode !== 202) {
            throw new Error(`Unexpected ${path} response: ${JSON.stringify(res)}`)
        }
    }
}

module.exports = RuntimeAPI;
