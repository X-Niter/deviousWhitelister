const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const fs = require('fs');
const axios = require('axios').default;
const db = require('better-sqlite3')('users.db');
const {getInstance, sendToInstance} = require('../ampWrapper')
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
//this big ass function is what contacts the API and sends the request for the user to be added to the whitelist
async function whitelist(user, userID, API, instanceName) {
    const GUID = await getInstance(instanceName)
    //check if user is already in the database
    let userData = retrieveFromDb(`SELECT * FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    if (userData) {
        return 409 //user is already in the database, return an error code
    }
    await sendToInstance(GUID, `whitelist add ${user}`)
    //append user to a json file called users.json
    insertToDb(`INSERT OR REPLACE INTO users VALUES ('${userID}', '${user}', '${instanceName}')`)
    return //it's an async function, it always returns a promise, this makes sure that the promise gets resolved
}
function constructJSON() {
    //read from file servers.json, append the content of label into value for each entry and then return a JSON Object
    //might seem stupid but it's the only way to read the label of the menu, i do this at runtime just so i don't overcomplicate the vaules in the json file
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
            
            interaction.user.send({content: 'Please select the server you wish to be withelisted in', components: [row] }).then(() => {
                interaction.reply({ephemeral: true, content: "check your dms!"});
            }).catch(err => {
                interaction.reply({ephemeral: true, content: "I couldn't send you a dm!, perhaps your dms are closed, you can open them by going into the server privacy settings and enabling dms, here is a video for reference https://streamable.com/h71d3h"});
            })
                
    },
    async onSelect(interaction) {
        const values = interaction.values.toString().split(',')
        await interaction.update({ ephemeral: true , content: `you have selected ${values[2]} for whitelist`, components: [] });
        let start = await interaction.user.send({ content: `send me your minecraft username` });
        let filter = m => m.author.id === interaction.user.id
        start.channel.createMessageCollector({ filter , time: 60000,  max: 1 }).on('collect', async (m) => {
            let username = m.content;
            let user = interaction.user.id
            let err = await whitelist(username, user, values[1], values[0]);
            if (err === 409) {
                await interaction.user.send({ content: `you are already whitelisted in ${values[1]}, perhaps you want to fix your whitelist?` });
            }else {
                await interaction.user.send({ content: `you have been whitelisted in ${values[1]}` });
            }
        })
    }
}