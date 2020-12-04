const http = require('http');

const {
    AWS_LAMBDA_FUNCTION_NAME,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    AWS_LAMBDA_LOG_GROUP_NAME,
    AWS_LAMBDA_LOG_STREAM_NAME,
    AWS_LAMBDA_RUNTIME_API,
} = process.env


class RuntimeAPI {
    constructor() {
        this.RUNTIME_PATH = '/2018-06-01/runtime'
        const [HOST, PORT] = AWS_LAMBDA_RUNTIME_API.split(':')
        this.HOST = HOST;
        this.PORT = PORT
    }

    _request(options) {
        options.host = this.HOST
        options.port = this.PORT

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

    async nextInvocation() {
        const res = await this._request({ path: `${this.RUNTIME_PATH}/invocation/next` })

        if (res.statusCode !== 200) {
            throw new Error(`Unexpected /invocation/next response: ${JSON.stringify(res)}`)
        }

        if (res.headers['lambda-runtime-trace-id']) {
            process.env._X_AMZN_TRACE_ID = res.headers['lambda-runtime-trace-id']
        } else {
            delete process.env._X_AMZN_TRACE_ID
        }

        const deadlineMs = +res.headers['lambda-runtime-deadline-ms']

        let context = {
            awsRequestId: res.headers['lambda-runtime-aws-request-id'],
            invokedFunctionArn: res.headers['lambda-runtime-invoked-function-arn'],
            logGroupName: AWS_LAMBDA_LOG_GROUP_NAME,
            logStreamName: AWS_LAMBDA_LOG_STREAM_NAME,
            functionName: AWS_LAMBDA_FUNCTION_NAME,
            functionVersion: AWS_LAMBDA_FUNCTION_VERSION,
            memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
            getRemainingTimeInMillis: () => deadlineMs - Date.now(),
            callbackWaitsForEmptyEventLoop: true,
        }

        if (res.headers['lambda-runtime-client-context']) {
            context.clientContext = JSON.parse(res.headers['lambda-runtime-client-context'])
        }

        if (res.headers['lambda-runtime-cognito-identity']) {
            context.identity = JSON.parse(res.headers['lambda-runtime-cognito-identity'])
        }

        const event = JSON.parse(res.body)

        return { event, context }
    }

    async invokeResponse(result, context) {
        const res = await this._request({
            method: 'POST',
            path: `${this.RUNTIME_PATH}/invocation/${context.awsRequestId}/response`,
            body: JSON.stringify(result === undefined ? null : result),
        })
        if (res.statusCode !== 202) {
            throw new Error(`Unexpected /invocation/response response: ${JSON.stringify(res)}`)
        }
    }

    async postError(path, err) {
        const lambdaErr = this._toLambdaErr(err)
        const res = await this._request({
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

    invokeError(err, context) {
        return this.postError(`${this.RUNTIME_PATH}/invocation/${context.awsRequestId}/error`, err)
    }

    initError(err) {
        return this.postError(`${this.RUNTIME_PATH}/init/error`, err)
    }

    _toLambdaErr(err) {
        const { name, message, stack } = err
        return {
            errorType: name || typeof err,
            errorMessage: message || ('' + err),
            stackTrace: (stack || '').split('\n').slice(1),
        }
    }

}

module.exports = {
    RuntimeAPI
};
