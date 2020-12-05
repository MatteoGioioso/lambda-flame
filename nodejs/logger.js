function logger(message) {
    if (process.env.LAMBDA_FLAME_DEBUG === "ALL") {
        console.log("[LAMBDA FLAME]: ", JSON.stringify(message))
    }
}

function loggerTimeSTART(message) {
    if (process.env.LAMBDA_FLAME_DEBUG === "ALL") {
        console.log("[LAMBDA FLAME] ", message)
    }
}

function loggerTimeSTOP(message) {
    if (process.env.LAMBDA_FLAME_DEBUG === "ALL") {
        console.log("[LAMBDA FLAME] ", message)
    }
}


module.exports = {
    logger,
    loggerTimeSTART,
    loggerTimeSTOP
}
