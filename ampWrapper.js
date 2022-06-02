//not actually a wrapper but couldn't find a name more fit for this

//gets the instance GUID out of the instance name
async function getInstance(instanceName, API) {
    try {
        let sessionId = await axios.post(API + "/Core/Login", {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false,
            cancelToken: source.token
        }, { Accept: "text / javascript" })
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
        fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in ampWrapper.js\n`)
        console.log(error);
    }
}

async function sendToInstance(GUID, message, API) {
    //things get wierd here, in order to send a message to the instance we need to login into AMP and the ADS instance, that's why we need to do two requests for authentication
    try {
        let sessionId = await axios.post(API + "/Core/Login", {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false,
            cancelToken: source.token
        }, { Accept: "text / javascript" })
        if (!sessionId.data.success) {
            clearTimeout(timeout);
            //log to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in ampWrapper.js\n`)
            console.log("Failed to log into API")
            return;
        }
        clearTimeout(timeout);
        //second auth layer for the ADS instance
        let instanceSessionId = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/Login`, {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false,
            cancelToken: source.token
        }, { Accept: "text / javascript", SESSIONID: sessionId })
        if (!instanceSessionId.data.success) {
            clearTimeout(timeout);
            //log to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in ampWrapper.js\n`)
            console.log("Failed to log into API")
            return;
        }

        instanceSessionId = instanceSessionId.data.sessionID
        let response = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/SendConsoleMessage`, { message: message, SESSIONID: instanceSessionId, cancelToken: source.token})
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