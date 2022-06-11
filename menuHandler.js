require("dotenv").config();

/**
* @todo Finish updating code with FileLogger custom file logging builder
*/
class handler {
    constructor(client,MessageEmbed,MessageActionRow,MessageSelectMenu,MessageButton,constructJSON){
        this.client = client;
        this.MessageEmbed = MessageEmbed;
        this.MessageActionRow = MessageActionRow;
        this.MessageSelectMenu = MessageSelectMenu;
        this.MessageButton = MessageButton;
        this.constructJSON = constructJSON;
    }
    async handle() {
        const channel = this.client.channels.cache.get(`${process.env.MenuChannelID}`);
        const embed = new this.MessageEmbed().setTitle("Select the server you wish to be white listed on");
    
        //setTimeout(() => Message.delete(), 1);
        let messages = await channel.messages.fetch({ limit: 5 })
        let message = messages.find(m => m.embeds[0].title.includes("Select the server you wish to be white listed on"));        
        
        const row = new this.MessageActionRow().addComponents(
            new this.MessageSelectMenu()
            .setCustomId("whitelist")
            .setPlaceholder("Select a server")
            .addOptions(this.constructJSON()),
            )
        const row2 = new this.MessageActionRow().addComponents(
            new this.MessageButton()
            .setCustomId('fix')
			.setLabel('Fix Whitelist')
			.setStyle('PRIMARY'),
        )
            if(!message){
                message = await channel.send({embeds : [embed] , components : [row,row2]});
            }else{
                message.edit({embeds : [embed] , components : [row, row2]});
            }
    }
}

module.exports = handler;