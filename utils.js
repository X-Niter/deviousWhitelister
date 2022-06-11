const db = require('better-sqlite3')('users.db');
const fs = require('fs');
const projectName = "Devious-Whitelister"

function insertToDb(queryString) {
    let query = db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).get()
    return query
}

function retrieveAllFromDb(queryString) {
    let query = db.prepare(queryString).all()
    return query
}

// .json server list parser
function constructJSON() {
    let servers
    servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'))
    servers.forEach(server => {
        server.value = server.value + "," + server.label
    })
    return servers
}

/**
* File logging builder for `Devious Whitelister`
* 
* The formated output of this builder is as follows:
*
* [6/6/2022, 12:35:08 AM] [Devious-Whitelister/INFO]: Something Loaded
*
* Example snippet on how to use this builder
* ```js
* FileLogger("latest", "ERROR", "Did not supply ID");
* ```
*
* @param {String} fileName - Name of log file
* @param {String} loggerType - FATAL, ERROR, WARN, INFO
* @param {String} loggerMessage - The message to be logged
*
*/
function FileLogger(fileName, loggerType, loggerMessage) {
    const date = new Date().toLocaleString();

    // formatedLoggerType returns loggerType as an uppercase string
    const formatedLoggerType = loggerType.toUpperCase();
    
    if (!loggerType) {
        console.error("loggerType parameter is missing, you must define a loggerType.");
        
        fs.appendFileSync('./logs/latest.log', `[${date}] [${projectName}/ERROR]: loggerType parameter is missing, you must define a loggerType.\n`)
        
        return
    }

    // put "FATAL", "ERROR", "WARN", "INFO" into an array and if formattedLoggerType is not equal to one of the array elements then console.error() and fs.appeendFileSynce() and return clsoe bracket
    const loggerTypes = ["FATAL", "ERROR", "WARN", "INFO"];
    if (!loggerTypes.includes(formatedLoggerType)) {
        console.error(`loggerType parameter is invalid, you must define a loggerType as one of the following: ${loggerTypes.join(", ")}`);

        fs.appendFileSync('./logs/latest.log', `[${date}] [${projectName}/ERROR]: loggerType parameter is invalid, you must define a loggerType as one of the following: ${loggerTypes.join(", ")}\n`)

        return
    }

    if (!loggerMessage) {
        console.error("loggerMessage parameter is missing, you must define a loggerMessage.");

        fs.appendFileSync('./logs/latest.log', `[${date}] [${projectName}/ERROR]: loggerMessage parameter is missing, you must define a loggerMessage.\n`)

        return
    }
    
    if (!fileName) {
        console.error("loggerName parameter is missing, you must define a loggerName.");
        
        fs.appendFileSync('./logs/latest.log', `[${date}] [${projectName}/ERROR]: loggerName parameter is missing, you must define a loggerName.\n`)
        return
    }

    if (!fs.existsSync(`./logs/${fileName}.log`)) {
        fs.writeFileSync(`./logs/${fileName}.log`, '');
    }

    return fs.appendFileSync(`./logs/${fileName}.log`, `[${date}] [${projectName}/${formatedLoggerType}]: ${loggerMessage}\n`)
}

module.exports = {
    insertToDb,
    retrieveFromDb,
    retrieveAllFromDb,
    constructJSON,
    FileLogger,
    projectName
}