require('dotenv').config()
require('./register-commands')
const fs = require('fs')
const { Client, Collection, Intents, MessageActionRow, MessageSelectMenu, MessageEmbed, Message } = require("discord.js")
const client = new Client({
    intents: [Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES],
    partials: ['CHANNEL']
});

//make a collection of commands in the client, scan for commands and for each commands that ends in .js add to the collection
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const db = require('better-sqlite3')('users.db');
const axios = require('axios').default;
// Global API Reference for the whole class
const API = `${process.env.AMPIP}/API`;
const { getInstance, sendToInstance } = require('./ampWrapper.js')

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
}, 15 * 1000);


//Store user data in the sqlite database
async function insertToDb(queryString) {
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

// .json server list parser
function constructJSON() {
    let servers
    servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'))
    servers.forEach(server => {
        server.value = server.value + "," + server.label
    })
    return servers
}

client.on("ready", async() => {
    const channel = client.channels.cache.get(`${process.env.MenuChannelID}`);
    const embed = new MessageEmbed().setTitle("Select the server you wish to be white listed on");

    //setTimeout(() => Message.delete(), 1);

    const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
        .setCustomId("whitelist")
        .setPlaceholder("Select a server")
        .addOptions(constructJSON())
    )
    channel.send({
        embeds: [embed],
        components: [row]
    })
    console.warn("Devious Whitelister Discord Bot Copyright (C) 2022 By:M1so/X_Niter \n (GNU GENERAL PUBLIC LICENSE)[Version 3, 29 June 2007] \n This program comes with ABSOLUTELY NO WARRANTY; \n This is free software, and you are welcome to do as you please under one condition, \n Proper credit be given by documenting our names for the work we have done.");
    console.info("Whitelist Bot loaded Succesfully")
})

//User leaves discord, remove them from whitelist, DB, and kick them from server just incase they are on it
client.on('guildMemberRemove', async member => {
    let users = await retrieveFromDb(`SELECT * FROM users WHERE id = '${member.id}'`)

    try {
        users.forEach(async(user) => {
            let GUID = await getInstance(user.server, user.api)

            await sendToInstance(GUID, `whitelist remove ${user.name}`, user.api)
            await sendToInstance(GUID, `kick ${user.name} User left Discord Community`, user.api)
        })

        await insertToDb(`DELETE FROM users WHERE id = '${member.id}'`)
    } catch (error) {
        console.error(error);
        console.error("Error removing user from Devious Network index.js 71-78");
    }
})

client.on('interactionCreate', async interaction => {
    //interaction executer and error handling
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName)
        if (!command) {
            //log to file
            appendFileSync('./log.txt', `${new Date().toLocaleString()}: Command ${interaction.commandName} not found in index.js at line 143\n`)
            console.log(interaction);
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            //log to file
            appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in index.js at line 151\n`)
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    }
    if (interaction.isSelectMenu()) {
        try {
            const command = client.commands.get(interaction.customId)
            command.onSelect(interaction);
        } catch (error) {
            //log to file
            appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in index.js at line 96\n`)
            console.log(error);
        }
    }
})

client.login(process.env.DISCORD_TOKEN)