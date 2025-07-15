import { Client, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getCollections } from '../mongoDB'
import generateStockpileMsg from "../Utils/generateStockpileMsg"
import updateStockpileMsg from "../Utils/updateStockpileMsg";
import checkPermissions from "../Utils/checkPermissions";

const spaddcode = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    let stockpile = interaction.options.getString("stockpile")! // Tell typescript to shut up and it is non-null
    let code = interaction.options.getString("code")! // Tell typescript to shut up and it is non-null

    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false

    if (!stockpile || !code) {
        await interaction.editReply({
            content: "Missing parameters"
        });
        return false
    }

    
    const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections()
    const cleanedName = stockpile.replace(/\./g, "").replace(/\$/g, "")
    const searchQuery = new RegExp(`^${cleanedName}$`, "i")
   
    const cleanedCode = code.replace(/\./g, "").replace(/\$/g, "")
    const stockpileExist = await collections.stockpiles.findOne({ name: searchQuery })
    if (!stockpileExist) await interaction.editReply({ content: "The stockpile with the name `" + stockpile + "` does not exist." })
    else {
        const configObj = (await collections.config.findOne({}))!
        if ("code" in configObj) {
            configObj.code[stockpileExist.name] = cleanedCode
            await collections.config.updateOne({}, { $set: { code: configObj.code } })
        }
        else {
            const codeObj: any = {}
            codeObj[stockpileExist.name] = cleanedCode
            await collections.config.updateOne({}, { $set: { code: codeObj } })
        }
        await interaction.editReply({ content: "Added the code `" + cleanedCode + "` to stockpile `" + stockpileExist.name + "` successfully." })

        const [stockpileHeader, stockpileMsgs, targetMsg, facilitiesmsgs, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
        await updateStockpileMsg(client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg, facilitiesmsgs, stockpileMsgsHeader, refreshAll])
    }




    return true;
}

export default spaddcode
