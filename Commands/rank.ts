import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getCollections } from "../mongoDB";
import checkPermissions from "../Utils/checkPermissions";
import generateStockpileMsg from "../Utils/generateStockpileMsg";


const EnlistedRanks:any = [
    {
        name:"Private",
        short:"PVT",
        xp:100
    },
    {
        name:"Private First Class",
        short:"PFC",
        xp:1000
    },
    {
        name:"Speacialist",
        short:"SPC",
        xp:3000
    },
]
const ncoRank:any = [
    {
        name:"Coporal",
        short:"CPL",
        xp:6000
    },
    {
        name:"Sergeant",
        short:"SGT",
        xp:12000
    },
    {
        name:"Staff Sergeant",
        short:"SSG",
        xp:18000
    },
    {
        name:"Sergeant First Class",
        short:"SFC",
        xp:26000
    },
    {
        name:"Master Sergeant",
        short:"MSG",
        xp:35000
    },
    {
        name:"First Sergeant",
        short:"1SG",
        xp:45000
    },
    {
        name:"Sargeant Major",
        short:"SGM",
        xp:60000
    },
    {
        name:"Command Sergeant Major",
        short:"CSM",
        xp:75000
    },
    {
        name:"Sergeant Major of the Army",
        short:"SMA",
        xp:100000
    },
]

const warrantRank:any = [
    {
        name:"Warrant Officer 1",
        short:"WO1",
        xp:120000
    },
    {
        name:"Chief Warrant Officer 2",
        short:"CW2",
        xp:180000
    },
    {
        name:"Chief Warrant Officer 3",
        short:"CW3",
        xp:250000
    },
    {
        name:"Chief Warrant Officer 4",
        short:"CW4",
        xp:500000
    },
    {
        name:"Chief Warrant Officer 5",
        short:"CW5",
        xp:1000000
    },
]

const officerRank:any = [
    {
        name:"Second Lieutenant",
        short:"2LT",
        xp:120000
    },
    {
        name:"First Lieutenant",
        short:"1LT",
        xp:180000
    },
]

const commanderRank:any = [
    {
        name:"Captian",
        short:"CPT",
        xp:250000
    },
    {
        name:"Major",
        short:"MAJ",
        xp:500000
    },
]

const chiefRank:any = [
    {
        name:"Lieutenant Colonel",
        short:"LTC",
        xp:1000000
    },
]

const ranks:any = {
    "enlisted":EnlistedRanks,
    "nco":ncoRank,
    "warrant":warrantRank,
    "officer":officerRank,
    "commander":commanderRank,
    "chief":chiefRank
}
const rank = async (interaction: ChatInputCommandInteraction): Promise<boolean> => {
    let collections = getCollections();
    let config = (await collections.config.findOne({}))!
    let ranklist
    for (let group in ranks){
        if ((interaction.member as GuildMember).roles.cache.has(config.rankRoles[group])){
            ranklist = ranks[group]
        }
    }

    if(!ranklist){
        interaction.editReply(
            {
                content:"You are not eligible for a rank in this regiment."
            }
        )
        return false
    }
        
    let members = getCollections().members
    let res:any = await members.findOne({memId:interaction.user.id})
    
    if (res==null){
        let basexp = ranklist[0].xp
        res = {
            memId:interaction.user.id,
            rank:ranklist[0].name,
            short:ranklist[0].short,
            rankIndex:0,
            logiXp:basexp,
            combatXp:basexp,
            engineeringXp:basexp,
            showRank:false,
            showSpec:false,
            ign:""
        }
        let s = await members.insertOne(res)
    }
    let xpNextRank = ranklist[res.rankIndex+1].xp-Math.max(res.logiXp,res.combatXp,res.engineeringXp)
        interaction.editReply(
            {
                content:`# Rank: \`${res.rank}\` \n\n- Combat xp: ${res.logiXp} \n- Logistics xp: ${res.logiXp} \n- Engineering xp: ${res.logiXp} \n- xp until next rank: ${xpNextRank}`
            }
        )
    return true
}

export {rank,ranks}