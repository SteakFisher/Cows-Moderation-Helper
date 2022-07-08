//steaks dumb

const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client({
    intents: [
      Discord.Intents.FLAGS.GUILDS, 
      Discord.Intents.FLAGS.GUILD_MESSAGES, 
      Discord.Intents.FLAGS.GUILD_MEMBERS, 
      Discord.Intents.FLAGS.GUILD_BANS,
    ],
    partials: ['GUILD_MEMBER']
});

let oldFetchedLogs = {}


function sendLogEmbed(executor, user, eventTitle, guild, reason){
  
  let embed = new Discord.MessageEmbed()
  .setTitle(eventTitle)
  .setColor("#00ffef")
  .setImage(user.avatarURL({format: "png"}))
  .setDescription(`**Target** \n ${user.tag} [${user.id}] \n \n **User**\n ${executor.tag} [${executor.id}] \n\n **Reason**\n ${reason}`)
  .setTimestamp()
  .setFooter({text: "aSpicyModerator"})
  if(executor.avatarURL){
    embed.setThumbnail(executor.avatarURL({format: "png"}))
  }

  let logChannel = guild.channels.cache.get(config.logChannel)
  logChannel.send({ embeds: [embed] })
}

async function logEvent(eventName, eventTitle, guild, user){
  let reason = "no reason"

  const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: eventName,
	})
  const deletionLog = fetchedLogs.entries.first();
  if (!deletionLog) return console.log("Error: No deletion log found");
  if(deletionLog.reason){reason = deletionLog.reason}
  if(fetchedLogs.entries.first().executor){
    sendLogEmbed(deletionLog.executor, user, eventTitle, guild, reason)
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", async message => {
  if(message.channel.type === "dm") return
  if(message.channel.id === "969948890616975360"){console.log(message)} 
})

client.on("guildMemberUpdate", async (oldMember, newMember) =>{
  if(newMember.user.bot){return}
  const fetchedLogs = await newMember.guild.fetchAuditLogs({
		limit: 1,
		type: "MEMBER_UPDATE",
	})
  if(oldFetchedLogs === {}){
    oldFetchedLogs = fetchedLogs
    return
  }
  if(JSON.stringify(oldFetchedLogs) === JSON.stringify(fetchedLogs)){return}
  if(fetchedLogs.entries.first().changes[0].key == "communication_disabled_until"){
    let reason = "No reason"
    let firstEntry = fetchedLogs.entries.first()
    if(firstEntry.reason){reason = firstEntry.reason}

    if((fetchedLogs.entries.first().changes[0].old) && !(fetchedLogs.entries.first().changes[0].new) && (fetchedLogs.entries.executor)){
      sendLogEmbed(firstEntry.executor, firstEntry.target, "Member unmute", newMember.guild, reason)
      newMember.send("You have been unmuted")
    }
    else if((fetchedLogs.entries.first().changes[0].new) && !(fetchedLogs.entries.first().changes[0].old) && (fetchedLogs.entries.executor)){
      sendLogEmbed(firstEntry.executor, firstEntry.target, "Member mute", newMember.guild, reason)
      newMember.send(`You have been muted, reason - ${reason}`)
    }
    else if((firstEntry.target) && (JSON.stringify(oldFetchedLogs) !== JSON.stringify(fetchedLogs))){
      sendLogEmbed({tag: "Automod", id: "Discord"}, firstEntry.target, "Member mute", newMember.guild, "Check <#969948890616975360> for more info")
      
    }
    oldFetchedLogs = fetchedLogs
  }
})

client.login(process.env.DJS_TOKEN)
