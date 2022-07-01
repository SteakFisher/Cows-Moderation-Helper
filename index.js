const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client({
    intents: [
      Discord.Intents.FLAGS.GUILDS, 
      Discord.Intents.FLAGS.GUILD_MESSAGES, 
      Discord.Intents.FLAGS.GUILD_MEMBERS, 
      Discord.Intents.FLAGS.GUILD_BANS,
    ]
  });

async function logEvent(eventName, eventTitle, guild, user){
  let reason = "no reason"

  const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: eventName,
	})
  
  const deletionLog = fetchedLogs.entries.first();
  if (!deletionLog) return console.log("Error: No deletion log found");


  if(deletionLog.reason){reason = deletionLog.reason}
  
  let embed = new Discord.MessageEmbed()
  .setTitle(eventTitle)
  .setColor("#00ffef")
  .setImage(user.avatarURL({format: "png"}))
  .setDescription(`**Target** \n ${user.tag} [${user.id}] \n \n **User**\n ${deletionLog.executor.tag} [${deletionLog.executor.id}] \n\n **Reason**\n ${reason}`)
  .setTimestamp()
  .setFooter("aSpicyModerator")
  .setThumbnail(deletionLog.executor.avatarURL({format: "png"}))

  let logChannel = guild.channels.cache.get(config.logChannel)
  logChannel.send(embed)
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("guildBanAdd", async (guild, user) =>{
  logEvent('MEMBER_BAN_ADD', "Member Ban", guild, user)
})

client.on("guildMemberRemove", async (member) =>{
  logEvent('MEMBER_KICK', "Member Kick", member.guild, client.users.cache.find(user => user.id === member.id))
})

  
client.login(config.token)