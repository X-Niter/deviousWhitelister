const {
    SlashCommandBuilder
} = require('@discordjs/builders');
const {
    MessageActionRow,
    MessageSelectMenu,
    MessageEmbed
} = require('discord.js');
const fs = require('fs');
const db = require('better-sqlite3')('users.db');
const {
    getInstance,
    sendToInstance
} = require('../ampWrapper')


async function insertToDb(queryString) {
    let query = await db.prepare(queryString).run()
    return query
}

function retrieveFromDb(queryString) {
    let query = db.prepare(queryString).get()
    return query
}

// .json server list parser/constructor
function constructJSON() {
    let servers
    servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'))
    servers.forEach(server => {
        server.value = server.value + "," + server.label
    })
    return servers
}

//AMP Instance whitelist event
async function whitelist(user, userID, API, instanceName) {
    const GUID = await getInstance(instanceName, API)
        //check if user is already in the database
    let userData = retrieveFromDb(`SELECT * FROM users WHERE id = '${userID}' AND server = '${instanceName}' AND api = '${API}'`)
    if (userData) {
        return 409 //user is already in the database, return an error code
    } else {
        //Without directly parsing for console response, I've atleast added in a check on our bots end to see if the whitelist command sends successfully
        // A try#catch for seeing if command is sent by the bot successfully
        try {
            // Send whitelist command to AMP Server Instance
            await sendToInstance(GUID, `whitelist add ${user}`, API)
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: Whitelisting Discord user [${userID}] with game name [${user}] on [${instanceName}], APIUrl [${API}]\n`)
            console.info(`Discord user [${userID}] with game name [${user}] whitelisted on [${instanceName}], APIUrl [${API}]`);

            //append user to a json file called users.json
            // Db add method called first to work with whitelist command error handling below
            insertToDb(`INSERT OR REPLACE INTO users VALUES ('${userID}', '${user}', '${instanceName}', '${API}')`)
                // Catch any errors & and on the error event Remove the user from the bots database to avoid adding users who actually were not whitelisted as the whitelist command failed to send
        } catch (error) {
            // Clear the user for the choosen instance from the database sense the command failed so they are not actually whitelisted.
            insertToDb(`DELETE FROM users WHERE id = '${userID}' AND server = '${instanceName}' AND api = '${API}'`)
                //Log the errors in M1so format
            fs.appendFileSync('./log.txt', `${new Date().toLocaleString()}: ${error} in whitelist.js at line 36\n`)
                // Easy readible console error for easier troubleshooting
            console.error("Failed to send whitelist command to instance! Clearing user Database entry");
            // Get stack trace in console AFTER the easy to read error is logged
            console.error(error);
        }
    }

    return //it's an async function, it always returns a promise, this makes sure that the promise gets resolved
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
        interaction.user.send({ content: 'Please select the server you wish to be withelisted on', components: [row] }).then(() => {
            interaction.reply({ ephemeral: true, content: "Check your messages!" });
        }).catch(err => {
            interaction.reply({ ephemeral: true, content: "I couldn't send you a message!, Allow me to message you by going into the server privacy settings and enabling direct messages, here is a video for reference https://streamable.com/h71d3h" });
        })
    },
    async onSelect(interaction) {
        const embed = new MessageEmbed().setTitle("Select the server you wish to be white listed on");
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId("whitelist")
                .setPlaceholder("Select a server")
                .addOptions(constructJSON())
            )
        const values = interaction.values.toString().split(',')
            //await interaction.update(row.setComponents.addOptions(constructJSON()));

        let start = await interaction.user.send({
            content: `Please respond with your Minecraft Username.`
        }).catch(err => {
            interaction.reply({
                ephemeral: true,
                content: "I couldn't send you a message!, Allow me to message you by going into the server privacy settings and enabling direct messages, here is a video for reference https://streamable.com/h71d3h"
            });
        })

        let filter = m => m.author.id === interaction.user.id
        start.channel.createMessageCollector({
            filter,
            time: 60000,
            max: 1
        }).on('collect', async(m) => {
            await interaction.user.send({
                content: `Processing your whitelist request now!`
            })
            let username = m.content;
            let user = interaction.user.id
            let err = await whitelist(username, user, values[1], values[0]);
            if (err === 409) {
                await interaction.user.send({
                    content: `You're already whitelisted on **${values[2]}**, perhaps you want to fix your whitelist?`
                });
            } else {
                await interaction.user.send({
                    content: `Successfully whitelisted on **${values[2]}** \n **GLHF**`
                });
            }
        })
    }
}