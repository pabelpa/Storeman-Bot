import { Client, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getCollections } from '../mongoDB'
import generateStockpileMsg from "../Utils/generateStockpileMsg"
import updateStockpileMsg from "../Utils/updateStockpileMsg";
import checkPermissions from "../Utils/checkPermissions";

const spremovecode = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    let stockpile = interaction.options.getString("stockpile")! // Tell typescript to shut up and it is non-null

    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false

    if (!stockpile) {
        await interaction.editReply({
            content: "Missing parameters"
        });
        return false
    }

    
    const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections()
    const cleanedName = stockpile.replace(/\./g, "").replace(/\$/g, "").toLowerCase()
    const searchQuery = new RegExp(`^${cleanedName}$`, "i")
    const stockpileExist = await collections.stockpiles.findOne({ name: searchQuery })
    if (!stockpileExist) await interaction.editReply({ content: "The stockpile with the name `" + stockpile + "` does not exist." })
    else {
        const configObj = (await collections.config.findOne({}))!
        if ("code" in configObj) {
            delete configObj.code[stockpileExist.name]
            await collections.config.updateOne({}, { $set: { code: configObj.code } })
            await interaction.editReply({ content: "Removed the code from `" + stockpileExist.name + "` successfully." })
        }
        else {
            await interaction.editReply("Error: No stockpile codes exist")
        }

        const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
        await updateStockpileMsg(client,interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])
    }




    return true;
}

export default spremovecode
