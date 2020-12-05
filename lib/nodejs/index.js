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
    let handler
    try {
        handler = getHandler()
    } catch (e) {
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
        logger(e.message, e.stack)
        return process.exit(1)
    }
}

async function processEvents(handler) {
    while (true) {
        const { event, context } = await runtimeAPI.nextInvocation()
        let result
        try {
            result = await handler(event, context)
        } catch (e) {
            await runtimeAPI.invokeError(e, context)
            continue
        }
        // const callbackUsed = context[CALLBACK_USED]

        await runtimeAPI.invokeResponse(result, context)
        logger("exiting...")
        return process.prependOnceListener('beforeExit', () => tryProcessEvents(handler))
    }
}

function getHandler() {
    const appParts = _HANDLER.split('.')

    if (appParts.length !== 2) {
        throw new Error(`Bad handler ${_HANDLER}`)
    }

    const [modulePath, handlerName] = appParts

    // Let any errors here be thrown as-is to aid debugging
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
