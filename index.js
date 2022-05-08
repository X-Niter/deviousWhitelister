require('dotenv').config()
require('./register-commands')
const fs = require('fs')
const { Client, Collection, Intents } = require("discord.js")
const client = new Client({ intents: [Intents.FLAGS.GUILD_PRESENCES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MEMBERS,Intents.FLAGS.GUILDS,Intents.FLAGS.DIRECT_MESSAGES] , partials: ['CHANNEL']});
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const db = require('better-sqlite3')('users.db');
const axios = require('axios').default;

async function getInstance(instanceName) {
    const API = `http://${process.env.AMPIP}/API`
    try {
        let sessionId = await axios.post(API + "/Core/Login", {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false
        }, { Accept: "text / javascript" })
        if (!sessionId.data.success) {
            console.log("Failed to log into API")
            return;
        }
        sessionId = sessionId.data.sessionID
        let response = await axios.post(API + "/ADSModule/GetInstances", { SESSIONID: sessionId })
        let GUID = Object.entries(response.data.result[0].AvailableInstances).filter(instance => instance[1].InstanceName === instanceName)
        return GUID[0][1].InstanceID
    } catch (error) {
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
            rememberMe: false
        }, { Accept: "text / javascript" })
        if (!sessionId.data.success) {
            console.log("Failed to log into API")
            return;
        }
        let instanceSessionId = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/Login`, {
            username: process.env.AMP_USER,
            password: process.env.AMP_PASSWORD,
            token: "",
            rememberMe: false
        }, { Accept: "text / javascript", SESSIONID: sessionId })
        if (!instanceSessionId.data.success) {
            console.log("Failed to log into API")
            return;
        }
        instanceSessionId = instanceSessionId.data.sessionID
        let response = await axios.post(API + `/ADSModule/Servers/${GUID}/API/Core/SendConsoleMessage`, { message: message, SESSIONID: instanceSessionId })
        return response.data
    } catch (error) {
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
            console.log(interaction);
        }
        try {
            await command.execute(interaction);
            //console.log(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
    if(interaction.isSelectMenu()) {
        const command = client.commands.get(interaction.customId)
        command.onSelect(interaction);
    }
})
client.login(process.env.DISCORD_TOKEN) 