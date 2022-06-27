const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const {insertToDb, retrieveFromDb, constructJSON} = require('../utils.js')
const { getInstance, sendToInstance } = require('../ampWrapper.js');


async function fixWhitelist(user, userID, API, instanceName) {
    const GUID = await getInstance(instanceName, API)

    let username = retrieveFromDb(`SELECT name FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    // JSON parse JSON stringify username.name to remove the quotes
    username = JSON.parse(JSON.stringify(username.name))
    if (!username) {
        return 404
    }
    

    if (username == user || user == username) {
        await sendToInstance(GUID, `whitelist remove ${user}`, API)
        await sendToInstance(GUID, `whitelist add ${user}`, API)
    } else {
        await sendToInstance(GUID, `whitelist remove ${username}`, API)
        await sendToInstance(GUID, `whitelist add ${user}`, API)
    }

    //replace the information in the database with the new information
    insertToDb(`DELETE FROM users WHERE id = '${userID}' AND server = '${instanceName}'`)
    insertToDb(`INSERT INTO users VALUES ('${userID}', '${user}', '${instanceName}')`)
    return
}

// Discord (/) command builder for fix command
module.exports = {
    data: new SlashCommandBuilder()
        .setName('fix')
        .setDescription('Did you mess up your Minecraft name? You can fix your whitelist here'),
    async execute(interaction) {
        constructJSON()
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId("fix")
                .setPlaceholder("Select a server")
                .addOptions(constructJSON())
            )

        // Sends Menu to Users Direct Messages
        interaction.user.send({ content: 'Please select the server you wish to fix your whitelist on', components: [row] })
        // THEN (Client side only response of "Check your direct messages!)
        .then(() => {
            interaction.reply({ ephemeral: true, content: "Check your direct messages!" });
        })
        //If the reply can't be sent, it's because DM's are not open so we tell them to enable them
        .catch(err => {
            interaction.reply({ ephemeral: true, content: "I couldn't send you a dm!, perhaps your dms are closed, you can open them by going into the server privacy settings and enabling dms, here is a video for reference https://streamable.com/h71d3h" });
            
        })
    },
    async onSelect(interaction) {
        const values = interaction.values.toString().split(',')
        await interaction.update({ content: `Received request to fix whitelist on **${values[2]}**`, components: [] });
        let start = await interaction.user.send({ content: `Send me your new Minecraft username!` });
        let filter = m => m.author.id === interaction.user.id

        start.channel.createMessageCollector({ 
            filter, 
            time: 60000, 
            max: 1 
        }).on('collect', async(m) => {
            
            await interaction.user.send({ 
                content: `Fixing your whitelist on **${values[2]}**, with your new username **${m.content}**.`
            })
            
            let username = m.content;
            let user = interaction.user.id
            let err = await fixWhitelist(username, user, values[1], values[0]);
            if (err == 404) {
                interaction.user.send({ content: `${username} is not in the database, did you select the wrong server, or perhaps you want to whitelist instead` });
            } else {
                await interaction.user.send({ content: `Your whitelist has been fixed for **${values[2]}**, with your new username **${m.content}**.` });
            }

        })
    },
    async onButton(interaction) {
        constructJSON()
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId("fix")
                .setPlaceholder("Select a server")
                .addOptions(constructJSON())
            )
        //interaction.user.send({ content: 'Please select the server you wish to fix your whitelist on', components: [row] })
        interaction.reply({ ephemeral: true, content: "Check your direct messages!" })
        .then (() => {
            interaction.user.send({ content: 'Please select the server you wish to fix your whitelist on', components: [row] })
        })
        //If the reply can't be sent, it's because DM's are not open so we tell them to enable them
        .catch(err => {
            interaction.reply({ ephemeral: true, content: "I couldn't send you a message!, Allow me to message you by going into the server privacy settings and enabling direct messages, here is a video for reference https://streamable.com/h71d3h" });
            
        })
    }
}