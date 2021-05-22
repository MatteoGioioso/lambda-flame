const {RuntimeAPI} = require("./RuntimeAPI");
const CALLBACK_USED = Symbol('CALLBACK_USED')
const {
    LAMBDA_TASK_ROOT,
    _HANDLER,
} = process.env
const {logger} = require('./logger')
const runtimeAPI = new RuntimeAPI()

start()

async function start() {
    logger("Runtime started")
    let handler
    try {
        handler = getHandler()
        logger("Handler loaded")
    } catch (e) {
        logger(e.message)
        logger(e.stack)
        await runtimeAPI.initError(e)
        return process.exit(1)
    }
    tryProcessEvents(handler)
}

async function tryProcessEvents(handler) {
    try {
        await processEvents(handler)
        process.exit(0)
    } catch (e) {
        logger(e.message)
        logger(e.stack)
        return process.exit(1)
    }
}

async function processEvents(handler) {
    while (true) {
        const {event, context} = await runtimeAPI.nextInvocation()
        let result
        try {
            result = await handler(event, context)
        } catch (e) {
            logger(e.message)
            await runtimeAPI.invokeError(e, context)
            // TODO: maybe is not needed
            // test for error
            continue
        }

        await runtimeAPI.invokeResponse(result, context)
        logger("Exiting...")
        return
    }
}

function compiledSourceHelper() {
    require('@babel/register')({
        presets: [
            [
                "@babel/preset-env",
                {
                    targets: {
                        node: "current"
                    }
                }
            ]
        ]
    });
    require("@babel/polyfill");
}

function getHandler() {
    const appParts = _HANDLER.split('.')

    if (appParts.length !== 2) {
        throw new Error(`Bad handler ${_HANDLER}`)
    }

    const [modulePath, handlerName] = appParts

    // Let any errors here be thrown as-is to aid debugging
    compiledSourceHelper()
    const app = require(LAMBDA_TASK_ROOT + '/' + modulePath)

    const userHandler = app[handlerName]

    if (userHandler == null) {
        throw new Error(`Handler '${handlerName}' missing on module '${modulePath}'`)
    } else if (typeof userHandler !== 'function') {
        throw new Error(`Handler '${handlerName}' from '${modulePath}' is not a function`)
    }

    return (event, context) => new Promise((resolve, reject) => {
        context.succeed = resolve
        context.fail = reject
        context.done = (err, data) => err ? reject(err) : resolve(data)

        const callback = (err, data) => {
            context[CALLBACK_USED] = true
            context.done(err, data)
        }

        let result
        try {
            result = userHandler(event, context, callback)
        } catch (e) {
            return reject(e)
        }
        if (result != null && typeof result.then === 'function') {
            result.then(resolve, reject)
        }
    })
}
