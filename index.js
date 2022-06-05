require('dotenv').config()
require('./register-commands')
const fs = require('fs')
const { Client, Collection, Intents } = require("discord.js")
const client = new Client({ intents: [Intents.FLAGS.GUILD_PRESENCES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MEMBERS,Intents.FLAGS.GUILDS,Intents.FLAGS.DIRECT_MESSAGES] , partials: ['CHANNEL']});
//make a collection of commands in the client, scan for commands and for each commands that ends in .js add to the collection
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const db = require('better-sqlite3')('users.db');
const axios = require('axios').default;
// Global API Reference for the whole class
const API = `${process.env.AMPIP}/API`;
const {getInstance, sendToInstance} = require('./ampWrapper.js')

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
//axios timeout request in case an infinite yeld on a api request
const timeout = setTimeout(() => {
  source.cancel();
  // Timeout Logic
}, 15*1000);

//FIXME code for removing users from the whitelist when they leave the server is no longer here, add it back when you find a possible solution


//i will still store the user id in the database however
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

//UNTESTED CODE
//----------------------------------------------
client.on('guildMemberRemove', async member => {
    function findInJson(instanceName){
        let servers = JSON.parse(fs.readFileSync('./servers.json'))
        let server = servers.find(server => server.value.toString().split(',')[0] === instanceName)
        return server
    }
    let users = await retrieveFromDb(`SELECT * FROM users WHERE id = '${member.id}'`)
    users.forEach(async (user) => {
        let api = findInJson(user.server)
        let GUID = await getInstance(user.server, api)
        await sendToInstance(GUID, `whitelist remove ${user.name}`,api)
    })
    
    await insertToDb(`DELETE FROM users WHERE id = '${member.id}'`)
})
//----------------------------------------------

client.on('interactionCreate', async interaction => {
    //interaction executer and error handling
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