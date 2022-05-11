const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const fs = require('fs');
const axios = require('axios').default;
const db = require('better-sqlite3')('users.db');

const source = axios.CancelToken.source();
const timeout = setTimeout(() => {
  source.cancel();
  // Timeout Logic
}, 15*1000);

async function insertToDb(queryString){
    let query = await db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).get()
    return query
}
async function whitelist(user, userID, instanceName) {

    async function getInstance(instanceName) {
        const API = `http://${process.env.AMPIP}/API`
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
                fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in whitelist.js at line 42\n`)
                clearTimeout(timeout);
                return;
            }
            clearTimeout(timeout);
            sessionId = sessionId.data.sessionID
            let response = await axios.post(API + "/ADSModule/GetInstances", { SESSIONID: sessionId })
            let GUID = Object.entries(response.data.result[0].AvailableInstances).filter(instance => instance[1].InstanceName === instanceName)
            return GUID[0][1].InstanceID
        } catch (error) {
            //log error to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in whitelist.js at line 56\n`)
            console.log(error);
        }
    }

    async function sendToInstance(GUID, message) {
        const API = `http://${process.env.AMPIP}/API`
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
                fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in whitelist.js at line 72\n`)
                console.log("Failed to log into API")
                return;
            }
            clearTimeout(timeout);
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
                fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in whitelist.js at line 82\n`)
                console.log("Failed to log into API")
                return;
            }

            instanceSessionId = instanceSessionId.data.sessionID
            let response = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/SendConsoleMessage`, { message: message, SESSIONID: instanceSessionId, cancelToken: source.token})
            clearTimeout(timeout);
            return response.data
        } catch (error) {
            //log error to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in whitelist.js at line 92\n`)
            console.log(error);
        }
    }

    const GUID = await getInstance(instanceName)
    //check if user is already in the database
    let userData = retrieveFromDb(`SELECT * FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    if (userData) {
        return 409
    }
    await sendToInstance(GUID, `whitelist add ${user}`)
    //append user to a json file called users.json
    insertToDb(`INSERT OR REPLACE INTO users VALUES ('${userID}', '${user}', '${instanceName}')`)
    return
}
function constructJSON() {
    //read from file servers.json, append the content of label into value for each entry and then return a JSON Object
    let servers
    servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'))
    servers.forEach(server => {
        server.value = server.value + "," + server.label
    })
    return servers
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('get whitelisted!'),
    async execute(interaction) {
        constructJSON()
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId("whitelist")
                    .setPlaceholder("Select a server")
                    .addOptions(constructJSON())
            )
        interaction.reply("check your dms!");
        interaction.user.send({ content: 'Please select the server you wish to be withelisted in', components: [row] });
    },
    async onSelect(interaction) {
        const values = interaction.values.toString().split(',')
        await interaction.update({ ephemeral: true , content: `you have selected ${values[1]} for whitelist`, components: [] });
        let start = await interaction.user.send({ content: `send me your minecraft username` });
        let filter = m => m.author.id === interaction.user.id
        start.channel.createMessageCollector({ filter , time: 60000,  max: 1 }).on('collect', async (m) => {
            let username = m.content;
            let user = interaction.user.id
            let err = await whitelist(username, user, values[0]);
            if (err === 409) {
                await interaction.user.send({ content: `you are already whitelisted in ${values[1]}, perhaps you want to fix your whitelist?` });
            }else {
                await interaction.user.send({ content: `you have been whitelisted in ${values[1]}` });
            }
        })
    }
}