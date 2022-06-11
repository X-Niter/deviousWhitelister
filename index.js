require('dotenv').config()
require('./register-commands')
const fs = require('fs')
const { Client, Collection, Intents, MessageActionRow, MessageSelectMenu, MessageEmbed, MessageButton } = require("discord.js")
const client = new Client({
    intents: [Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES],
    partials: ['MESSAGE', 'CHANNEL']
});

//make a collection of commands in the client, scan for commands and for each commands that ends in .js add to the collection
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const {insertToDb, retrieveFromDb, retrieveAllFromDb, constructJSON, FileLogger, projectName} = require('./utils.js')
const { getInstance, sendToInstance } = require('./ampWrapper.js')
const menuHandler = require("./menuHandler.js")
const handle = new menuHandler(client,MessageEmbed,MessageActionRow,MessageSelectMenu,MessageButton,constructJSON)


//uncaught exception handler
process.on('uncaughtException', (err) => {
    console.log(err);
    FileLogger("latest", "error", `Uncaught Exception at: ${err}`)
})

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on("ready", async() => { 
    try {
        await handle.handle()
    } catch (error) {
        FileLogger("latest", "fatal", `Could not send whitelist menu and button to channel in index.js at line 32 \n STACK TRACE: \n ${error}`)
        console.error(error)
    }  

    console.info("\nDevious Whitelister Discord Bot Copyright (C) 2022 By:M1so/X_Niter \n (GNU GENERAL PUBLIC LICENSE)[Version 3, 29 June 2007] \n This program comes with ABSOLUTELY NO WARRANTY; \n This is free software, and you are welcome to do as you please under one condition, \n Proper credit be given by documenting our names for the work we have done. \n");
    console.info("Whitelist Bot loaded Succesfully") //RIP "bot is ready to roll"
    FileLogger("latest", "info", `${projectName} Bot loaded Succesfully!`)
    FileLogger("whitelist", "info", `${projectName} loaded and ready to whitelist!`)
})

//User leaves discord, remove them from whitelist, DB, and kick them from server just incase they are on it
client.on('guildMemberRemove', async member => {

    function findInJson(instanceName){ // finds the api url ins server.json equal to instance/serevr name
        let servers = JSON.parse(fs.readFileSync('./servers.json'))
        let server = servers.find(server => server.value.toString().split(',')[0] === instanceName)

        //servers get all "value" to string split ',' and if any "value" [0] is equal to instanceName, return the "value" [1]
        if(server){
            return server.value.toString().split(',')[1]
        } else { //if the server is not found, return console.error and FileLogger latest error
            console.error(`Could not find instance ${instanceName} in servers.json`)
            FileLogger("latest", "error", `Could not find instance ${instanceName} in servers.json`)
        }
        return server
    }

    
   
    try {   
        let allData = retrieveAllFromDb(`SELECT * FROM users WHERE id = ${member.id}`);
        var success = true;
    
        try{
            allData.forEach( async row => {
            const minecraftUsername = row.name;
            const serverName = row.server;
            const isntanceAPI = findInJson(serverName);
            try {
                var GUID = await getInstance(serverName, isntanceAPI);
            } catch (error) {
                success = false;
                console.error(`Failed to get instance ${serverName} @ ${isntanceAPI} index.js line 73\n${error}`)
                FileLogger("latest", "fatal", `Failed to get instance ${serverName} @ ${isntanceAPI} index.js line 73\n STACK TRACE: \n ${error}`)
                FileLogger("API", "fatal", `Failed to get instance ${serverName} @ ${isntanceAPI} index.js line 73\n STACK TRACE: \n ${error}`)
            }
            try {
                await sendToInstance(GUID, [`kick ${minecraftUsername} User left the Discord Community`, `whitelist remove ${minecraftUsername}`], isntanceAPI);
                console.log(`Removing ${minecraftUsername} from ${serverName}`);
            } catch (error) {
                success = false;
                console.error(`Failed sending commands to instance in index.js line 81\n${error}`)
                FileLogger("latest", "fatal", `Failed sending commands to instance in index.js line 81\n STACK TRACE: \n ${error}`)
                FileLogger("API", "fatal", `Failed sending commands to instance in index.js line 81\n STACK TRACE: \n ${error}`)
            }
            
            });
        } catch (error) {
            success = false;
            console.error(`Removing [${member}] from instances have failed, potentialy an API login failure \n${error}`)
            FileLogger("latest", "fatal", `Removing [${member}] from instances have failed, potentialy an API login failure \n${error}`)
            FileLogger("whitelist", "fatal", `Removing [${member}] from instances have failed, potentialy an API login failure \n${error}`)
            FileLogger("API", "fatal", `Removing [${member}] from instances have failed, potentialy an API login failure \n${error}`)
        }


    } catch (error) {
        console.error(`guildMemberRemove Error present for ${member} when attempting to remove them from the Devious servers \n${error}`)
        FileLogger("latest", "fatal", `guildMemberRemove Error present for ${member} when attempting to remove them from the Devious servers \n${error}`)
        FileLogger("whitelist", "fatal", `guildMemberRemove Error present for ${member} when attempting to remove them from the Devious servers \n${error}`)
        FileLogger("API", "fatal", `guildMemberRemove Error present for ${member} when attempting to remove them from the Devious servers \n${error}`)
    } finally {
        const dbRemoved = true;
        
        if (success) {

            try {
                insertToDb(`DELETE FROM users WHERE id = ${member.id}`);

                console.log(`Removing the user ${member} from the database`);
                FileLogger("latest", "info", `Removing [${member}] from the database`)
                FileLogger("whitelist", "info", `Removing [${member}] from the database`)
            } catch (error) {
                dbRemoved = false;
                
                console.log(`Failed to remove [${member}] from the database`);
                FileLogger("latest", "error", `Failed to remove [${member}] from the database`)
                FileLogger("whitelist", "error", `Failed to remove [${member}] from the database`)
            }
        } else {
            console.error(`Removing [${member}] from servers was not successful, please check logs`)
            FileLogger("latest", "fatal", `Removing [${member}] from servers was not successful, please check logs \n${error}`)
            FileLogger("whitelist", "fatal", `Removing [${member}] from servers was not successful, please check logs \n${error}`)
        }
    }


})

client.on('interactionCreate', async interaction => {
    //interaction executer and error handling
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName)
        if (!command) {
            //log to file
            FileLogger("latest", "fatal", `Commands not found in index.js \n STACK TRACE \n Command Names that were not found: ${interaction.commandName}`)
            console.error(interaction);
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            //Log errors
            FileLogger("latest", "fatal", `Could not execute command interaction in index.js Line 81 \n STACK TRACE \n ${error}`)
            await interaction.reply({
                content: 'Error executing this command!',
                ephemeral: true
            });
        }
    }
    if (interaction.isSelectMenu()) {
        try {
            const command = client.commands.get(interaction.customId)
            //await interaction.deferUpdate()
            await command.onSelect(interaction);
            try {
                await handle.handle()
            } catch (error) {
                FileLogger("latest", "fatal", `Could not send whitelist menu and button to channel in index.js at line 32 \n STACK TRACE: \n ${error}`)
                console.error(error)
            }  
        } catch (error) {
            //Log errors
            console.error("Menu Selection failed in index.js Line 95-96");
            FileLogger("latest", "error", `Menu Selection failed in index.js Line 95-96 \n STACK TRACE \n ${error}`);
            console.log(error);
        }
    }
    if (interaction.isButton()) {
        try {
            const command = client.commands.get(interaction.customId);
            //await interaction.deferUpdate();
            await command.onButton(interaction);
            try {
                await handle.handle()
            } catch (error) {
                FileLogger("latest", "fatal", `Could not send whitelist menu and button to channel in index.js at line 32 \n STACK TRACE: \n ${error}`)
                console.error(error)
            }  
        } catch (error) {
            //Log errors
            console.error("Button Selection failed in index.js Line 106-107");
            FileLogger("latest", "error", `Button Selection failed in index.js Line 106-107 \n STACK TRACE \n ${error}`);
            console.log(error);
        }
    }
})

client.login(process.env.DISCORD_TOKEN)