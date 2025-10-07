import { getCollections } from '../mongoDB'
import { ChatInputCommandInteraction,GuildMember } from 'discord.js';
import {ranks} from './rank';
const giveXp = async (interaction: ChatInputCommandInteraction): Promise<boolean> => {
    let collections = getCollections();
    let config = await collections.config.findOne()
    if (!config){
        interaction.editReply("config db not created")
        return false
    }
    const user = interaction.options.getUser("member");
    const xp = interaction.options.getNumber("xp");
    const xpType = interaction.options.getString("type")
    const giver = interaction.member as GuildMember

    let giverObj = await collections.members.findOne({"memId":giver.id})
    if (!giverObj){
        interaction.editReply({content: "You do not have your rank yet. run /rank command"})
        return false
    }

    if ((giverObj.xpGiven+xp)>giverObj.xpCapacity){
        interaction.editReply({content: "You do not have enough xp left to give out this much. you only have " + `${(giverObj.xpCapacity-giverObj.xpGiven)} left to give.`})
        return false
    }

    const userObj = await collections.members.findOne({"memId":user?.id})
    if (!userObj){
        interaction.editReply({content: "The user does not yet have a rank. tell them to run /rank command"})
        return false
    }
    userObj[`${xpType}Xp`]=userObj[`${xpType}Xp`]+xp
    let xpString = `${xpType}Xp`
    let setObj: any = {}
    setObj[xpString] = userObj[`${xpType}Xp`]+xp
    await collections.members.updateOne({_id:userObj._id},{$set:setObj})
    
    let ranklist
    if (user?.id){
        let userDiscordObj =await interaction.guild?.members.fetch(user?.id)!
        for (let group in ranks){
            if (userDiscordObj.roles.cache.has(config.rankRoles[group])){
                ranklist = ranks[group]
            }
        }
        let next_rank = ranklist[userObj.rankIndex+1]
        if (userObj[`${xpType}Xp`]>=next_rank.xp){
            await collections.members.updateOne({_id:userObj._id},{$set:{
                rankIndex: userObj.rankIndex+1,
                rank: next_rank.name,
                short: next_rank.short
            }})
        }
    }
    return true
}
export default giveXp