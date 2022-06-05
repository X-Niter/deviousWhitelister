const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const fs = require('fs');
const db = require('better-sqlite3')('users.db');
const {getInstance, sendToInstance} = require('../ampWrapper')


async function insertToDb(queryString){
    let query = await db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).get()
    return query
}

//this big ass function is what contacts the API and sends the request for the user to be added to the whitelist
async function whitelist(user, userID, API, instanceName) {
    const GUID = await getInstance(instanceName,API)
    //check if user is already in the database
    let userData = retrieveFromDb(`SELECT * FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    if (userData) {
        return 409 //user is already in the database, return an error code
    }
    await sendToInstance(GUID, `whitelist add ${user}`,API)
    //append user to a json file called users.json
    insertToDb(`INSERT OR REPLACE INTO users VALUES ('${userID}', '${user}', '${instanceName}')`)
    return //it's an async function, it always returns a promise, this makes sure that the promise gets resolved
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
            
            interaction.user.send({content: 'Please select the server you wish to be withelisted on', components: [row] }).then(() => {
                interaction.reply({ephemeral: true, content: "check your messages!"});
            }).catch(err => {
                interaction.reply({ephemeral: true, content: "I couldn't send you a message!, Allow me to message you by going into the server privacy settings and enabling direct messages, here is a video for reference https://streamable.com/h71d3h"});
            })
                
    },
    async onSelect(interaction) {
        const values = interaction.values.toString().split(',')
        await interaction.update({ ephemeral: true , content: `You have selected ${values[2]} for whitelist`, components: [] });
        let start = await interaction.user.send({ content: `Send me your Minecraft username.` });
        let filter = m => m.author.id === interaction.user.id
        start.channel.createMessageCollector({ filter , time: 60000,  max: 1 }).on('collect', async (m) => {
            await interaction.user.send({ content: `working on it, give me a minute...`})
            let username = m.content;
            let user = interaction.user.id
            let err = await whitelist(username, user, values[1], values[0]);
            if (err === 409) {
                await interaction.user.send({ content: `you are already whitelisted in ${values[2]}, perhaps you want to fix your whitelist?` });
            }else {
                await interaction.user.send({ content: `you have been whitelisted in ${values[2]}` });
            }
        })
    }
}