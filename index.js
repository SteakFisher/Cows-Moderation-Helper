const fs = require('fs');
const Discord = require("discord.js");
const config = require("./config.json");
require('dotenv').config();

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_BANS,
  ],
  partials: ['GUILD_MEMBER']
});

let oldFetchedLogs = ""

function roundToNearestTime(time){
  return Math.round(time / 60)
}

function timeoutTime(newMember){
  let timeOut = ""
  let endTime = Math.floor(new Date(newMember.communicationDisabledUntil).getTime() / 1000)
  let currentTime = Math.floor((new Date()).getTime() / 1000)
  let diffTime = roundToNearestTime(endTime - currentTime)
  if(diffTime > 0){
    timeOut = `${diffTime} minute(s)`
  }
  if(diffTime >= 60){
    timeOut = `${diffTime/60} hour(s)`
  }
  if(diffTime >= 1440){
    timeOut = `${diffTime/1440} days(s)`
  }
  return timeOut
}

async function sendLogEmbed(executor, user, eventTitle, guild, reason, time){

  let embed = new Discord.MessageEmbed()
      .setTitle(eventTitle)
      .setColor("#00ffef")
      .setImage(user.avatarURL({format: "png"}))
      .setTimestamp()
      .setFooter({text: "aSpicyModerator"})
  if(time){
    embed.setDescription(`**Target** \n ${user.tag} [${user.id}] \n \n **User**\n ${executor.tag} [${executor.id}] \n\n **Reason**\n ${reason.trim()} \n\n **Time**\n ${time}`)
  }else{
    embed.setDescription(`**Target** \n ${user.tag} [${user.id}] \n \n **User**\n ${executor.tag} [${executor.id}] \n\n **Reason**\n ${reason.trim()}`)
  }
  if(executor.avatarURL){
    embed.setThumbnail(executor.avatarURL({format: "png"}))
  }
  let logChannel = await guild.channels.cache.get(config.logChannel)

  if(embed && logChannel){
    logChannel.send({ embeds: [embed] })
  }
}


client.on("ready", () => {
  fs.readFile('storage.json', 'utf-8', (err, data) => {
    if (err) {
      throw err;
    }

    oldFetchedLogs = data.toString()
  });

  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("guildMemberUpdate", async (oldMember, newMember) =>{
  if(newMember.user.bot){return}

  if(oldMember.roles.cache.has(config.calvesRole)) return
  else if(newMember.roles.cache.has(config.calvesRole)){
    let channel = newMember.guild.channels.cache.get(config.generalChannel)
    channel.send(`Hey <@${newMember.user.id}> just verified and can now talk! everyone say hi!!!`)
  }

  delete newMember.joinedTimestamp
  delete oldMember.joinedTimestamp
  delete newMember.premiumSinceTimestamp
  delete oldMember.premiumSinceTimestamp

  if(newMember.communicationDisabledUntil){
    let timeOut = timeoutTime(newMember)

    const fetchedLogs = await newMember.guild.fetchAuditLogs({
      limit: 1,
      type: "MEMBER_UPDATE",
    })
    console.log(fetchedLogs.entries.first().changes[0])
    if(fetchedLogs.entries.first().changes[0].key !== "communication_disabled_until") return
    if(oldFetchedLogs === JSON.stringify(fetchedLogs)){return}

    let reason = "No reason"
    let firstEntry = fetchedLogs.entries.first()
    if(firstEntry.reason){reason = firstEntry.reason}

    if(firstEntry.executor.id){
      sendLogEmbed(firstEntry.executor, firstEntry.target, "Member mute", newMember.guild, reason, timeOut)
      newMember.send(`You have been muted, reason - ${reason}`)
    }
    else{
      sendLogEmbed({tag : "Discord AutoMod", id : "Probably"}, firstEntry.target, "Member mute", newMember.guild, reason, timeOut)
      newMember.send(`You have been muted, reason - ${reason}`)
    }
  }

  if(oldMember.communicationDisabledUntil){
    const fetchedLogs = await oldMember.guild.fetchAuditLogs({
      limit: 1,
      type: "MEMBER_UPDATE",
    })

    let reason = "No reason"
    let firstEntry = fetchedLogs.entries.first()

    sendLogEmbed(firstEntry.executor, firstEntry.target, "Member unmute", oldMember.guild, reason)
    oldMember.send(`You have been muted, reason - ${reason}`)
  }

  if(JSON.stringify(oldMember) !== JSON.stringify(newMember)){return}


  const fetchedLogs = await newMember.guild.fetchAuditLogs({
    limit: 1,
    type: "MEMBER_UPDATE",
  })

  if((fetchedLogs.entries.first().changes[0].key === "communication_disabled_until") &&
      ((fetchedLogs.entries.first().changes[0].old) &&
          !(fetchedLogs.entries.first().changes[0].new) &&
          (fetchedLogs.entries.executor))){
    let reason = "No reason"
    let firstEntry = fetchedLogs.entries.first()
    if(firstEntry.reason){reason = firstEntry.reason}

    sendLogEmbed(firstEntry.executor, firstEntry.target, "Member unmute", newMember.guild, reason)
    newMember.send("You have been unmuted")
  }

  oldFetchedLogs = JSON.stringify(fetchedLogs)

  fs.writeFile('storage.json', oldFetchedLogs, (err) => {
    if (err) {
      throw err;
    }
  })
})

client.on("guildBanAdd", async function(guild, user){
  const fetchedLogs = await guild.guild.fetchAuditLogs({
    limit: 1,
    type: "MEMBER_BAN_ADD",
  })

  let reason = "No reason"
  let firstEntry = fetchedLogs.entries.first()
  if(firstEntry.reason){reason = firstEntry.reason}
  sendLogEmbed(firstEntry.executor, guild.user, "Member ban", guild.guild, reason)
});

client.on("guildBanRemove", async function(guild, user){
  const fetchedLogs = await guild.guild.fetchAuditLogs({
    limit: 1,
    type: "MEMBER_BAN_REMOVE",
  })

  let reason = "No reason"
  let firstEntry = fetchedLogs.entries.first()
  if(firstEntry.reason){reason = firstEntry.reason}
  sendLogEmbed(firstEntry.executor, guild.user, "Member Unban", guild.guild, reason)
});

client.login(process.env.DJS_TOKEN)