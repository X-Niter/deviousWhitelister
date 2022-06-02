const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const fs = require('fs');
const axios = require('axios').default;
const db = require('better-sqlite3')('users.db');
const {getInstance, sendToInstance} = require('../ampWrapper.js')

const source = axios.CancelToken.source();
const timeout = setTimeout(() => {
  source.cancel();
  // Timeout Logic
}, 15*1000);


function insertToDb(queryString){
    let query = db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).get()
    return query
}

async function fixWhitelist(user, userID, API,instanceName) {
    const GUID = await getInstance(instanceName, API)
    //find username using the userId from the database
    const username = retrieveFromDb(`SELECT name FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    if(!username) {
        return 404
    }
    await sendToInstance(GUID, `whitelist remove ${username}`, API)
    await sendToInstance(GUID, `whitelist add ${user}`, API)
    //replace the information in the database with the new information
    insertToDb(`DELETE FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    insertToDb(`INSERT INTO users VALUES ('${userID}', '${user}', '${instanceName}')`)
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
        .setName('fix')
        .setDescription('did you mess up your name? fix your whitelist here'),
    async execute(interaction) {
        constructJSON()
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId("fix")
                    .setPlaceholder("Select a server")
                    .addOptions(constructJSON())
            )
        interaction.user.send({content: 'Please select the server you wish to fix your whitelist on', components: [row] }).then(() => {
            interaction.reply({ephemeral: true, content: "check your dms!"});
        }).catch(err => {
            interaction.reply({ephemeral: true, content: "I couldn't send you a dm!, perhaps your dms are closed, you can open them by going into the server privacy settings and enabling dms, here is a video for reference https://streamable.com/h71d3h"});
        })
    },
    async onSelect(interaction) {
        const values = interaction.values.toString().split(',')
        await interaction.update({ content: `you have selected ${values[1]}`, components: [] });
        let start = await interaction.user.send({ content: `send me your new minecraft username` });
        let filter = m => m.author.id === interaction.user.id
        start.channel.createMessageCollector({ filter , time: 60000, max: 1 }).on('collect', async (m) => {
            let username = m.content;
            let user = interaction.user.id
            let err = await fixWhitelist(username, user, values[0]);
            if (err == 404){
                interaction.user.send({ content: `${username} is not in the database, did you select the wrong server, or perhaps you want to whitelist instead`});
            }else {
                await interaction.user.send({ content: `Your whitelist has been fixed with the new username` });
            }
            
        })
    }
}