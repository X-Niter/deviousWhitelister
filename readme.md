# whitelister bot

this bot is especially designed for devious.gg network, however it's highly configurable

## how to setup
---
clone this repo, extract it anywhere, make sure you have node.js (latest), open a terminal, navigate to where you extracted the repo, type ``npm i`` then node ``index.js``

## configurations:

> ### servers.json
 contains the server configuration, follows this syntax:

 ```
[
    {
        "label": "friendly name",
        "description": "brief description",
        "value": "AMP INSTANCE NAME"
    },
        {
        "label": "another name",
        "description": "another brief description",
        "value": "AMP INSTANCE NAME"
    }
]
 ```

 > ### users.db

 a database of users linked to their mc username and server they are on, auto-handled by the bot, don't touch this

 ## Enviromental variables

 some enviromental variables must be set for the bot to work correctly

 - DISCORD_TOKEN: discord token for the bot
 - AMP_USER: username for the amp user that the bot manages
 - AMP_PASSWORD: the password for the amp account that the bot manages
 - AMPIP: ip:port of the amp server admin panel, for example: 127.0.0.1:8080


## additional configuration

some configurations can be changed from the files in the code

> register-commands.js

this script registers the commands before the bot runs, change ``clientId`` and ``guildId`` to your guild and cliet id