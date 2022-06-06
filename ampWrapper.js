//not actually a wrapper but couldn't find a name more fit for this
const fs = require('fs');
const axios = require('axios').default;
const source = axios.CancelToken.source();
const timeout = setTimeout(() => {
    source.cancel();
    // Timeout Logic
}, 15 * 1000);

//gets the instance GUID out of the instance name
async function getInstance(instanceName, API) {
    try {
        let sessionId = await axios.post(API + "/Core/Login", {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false,
            cancelToken: source.token
        }, { headers: { Accept: "text/javascript" } })
        if (!sessionId.data.success) {
            console.log("Login failed")
                //log failed login to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in ampWrapper.js\n`)
            clearTimeout(timeout);
            return;
        }
        clearTimeout(timeout);
        sessionId = sessionId.data.sessionID
        let response = await axios.post(API + "/ADSModule/GetInstances", { SESSIONID: sessionId })
            //that got all the instances now we just filter based on the name we are looking for
        let GUID = Object.entries(response.data.result[0].AvailableInstances).filter(instance => instance[1].InstanceName === instanceName)
        return GUID[0][1].InstanceID
    } catch (error) {
        //log error to file
        fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in getInstance#ampWrapper.js\n`)
        console.log(error);
    }
}

// AMP Instance interaction function
async function sendToInstance(GUID, message, API) {
    // Pullout instanceSessionId for use at the end of function(It's never actually passed as null)
    let instanceSessionId = null;

    // Attempt authorization to AMP panel
    try {
        sessionId = await axios.post(API + "/Core/Login", {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false,
            cancelToken: source.token
        }, { Accept: "text / javascript" })

        // Checking for successfull AMP auth before moving on to AMP Instance auth
        if (sessionId.data.success) {
            clearTimeout(timeout);
            instanceSessionId = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/Login`, {
                username: process.env.AMP_USER,
                password: process.env.AMP_PASSWORD,
                token: "",
                rememberMe: false,
                cancelToken: source.token
            }, { Accept: "text / javascript", SESSIONID: sessionId })

            if (!instanceSessionId.data.success) {
                clearTimeout(timeout);
                //log to file
                fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: AMP Instance Login failed for ${user} (${userID}) in ampWrapper.js\n`)
                console.log("Failed to log into AMP Instance API")
                return;
            }

        } else {
            clearTimeout(timeout);
            //log AMP auth fail
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: AMP Login failed for ${user} (${userID}) in ampWrapper.js\n`)
            console.error("Failed to log into AMP API")
            return;
        }

        instanceSessionId = instanceSessionId.data.sessionID
        let response = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/SendConsoleMessage`, { message: message, SESSIONID: instanceSessionId, cancelToken: source.token })
        clearTimeout(timeout);
        return response.data
    } catch (error) {
        //log error to file
        fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in ampWrapper.js\n`)
        console.log(error);
    }
}

module.exports = {
    getInstance,
    sendToInstance
}