require('dotenv').config()
require('./register-commands')
const fs = require('fs')
const { Client, Collection, Intents } = require("discord.js")
const client = new Client({ intents: [Intents.FLAGS.GUILD_PRESENCES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MEMBERS,Intents.FLAGS.GUILDS,Intents.FLAGS.DIRECT_MESSAGES] , partials: ['CHANNEL']});
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const db = require('better-sqlite3')('users.db');
const axios = require('axios').default;
// Global API Reference for the whole class
const API = `${process.env.AMPIP}/API`;

//initialize log file if it doesn't already exist
if (!fs.existsSync('./log.txt')) {
    fs.writeFileSync('./log.txt', '');
}

//uncaught exception handler
process.on('uncaughtException', (err) => {
    console.log(err);
    fs.appendFileSync('./log.txt', `Uncaught Exception at: ${new Date().toLocaleString()}: ${err}\n`)
})

const source = axios.CancelToken.source();
const timeout = setTimeout(() => {
  source.cancel();
  // Timeout Logic
}, 15*1000);

async function getInstance(instanceName) {
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
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in whitelist.js at line 41\n`)
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
        fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in whitelist.js at line 52\n`)
        console.log(error);
    }
}

async function sendToInstance(GUID, message) {
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
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in index.js at line 70\n`)
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
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Login failed for ${user} (${userID}) in index.js at line 85\n`)
            console.log("Failed to log into API")
            return;
        }

        instanceSessionId = instanceSessionId.data.sessionID
        let response = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/SendConsoleMessage`, { message: message, SESSIONID: instanceSessionId, cancelToken: source.token})
        clearTimeout(timeout);
        return response.data
    } catch (error) {
        //log error to file
        fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in index.js at line 96\n`)
        console.log(error);
    }
}

async function insertToDb(queryString){
    let query = await db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).all()
    return query
}

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on("ready", async () => {
    console.log("bot is ready to roll")
})

client.on('guildMemberRemove', async member => {
    //when a member leaves the server, it get's it's whitelist removed from database and from all the servers
    //first, fetch the servers the user is in from the database
    let users = await retrieveFromDb(`SELECT * FROM users WHERE id = '${member.id}'`)
    console.log(users)
    //then, send a request to each server to remove the user from the whitelist
    users.forEach(async (key) => {
        console.log(`server db: ${key}`)
        //get the instance GUID
        let GUID = await getInstance(key.server)
        //send the request
        await sendToInstance(GUID, `whitelist remove ${key.name}`)
    })
    //lastly, remove the user from the database
    await insertToDb(`DELETE FROM users WHERE id = '${member.id}'`)
    console.log(`all done`)
})

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName)
        if (!command) {
            //log to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Command ${interaction.commandName} not found in index.js at line 143\n`)
            console.log(interaction);
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            //log to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in index.js at line 151\n`)
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
    if(interaction.isSelectMenu()) {
        try {
            const command = client.commands.get(interaction.customId)
            command.onSelect(interaction);
        } catch (error) {
            //log to file
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in index.js at line 161\n`)
            console.log(error);
        }
    }
})
client.login(process.env.DISCORD_TOKEN) 