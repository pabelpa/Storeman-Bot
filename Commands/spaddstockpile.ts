import { Client, ChatInputCommandInteraction, GuildMember, TextChannel } from "discord.js";
import { getCollections } from '../mongoDB'
import generateStockpileMsg from "../Utils/generateStockpileMsg"
import updateStockpileMsg from "../Utils/updateStockpileMsg";
import checkPermissions from "../Utils/checkPermissions";
import mongoSanitize from "express-mongo-sanitize";

const spaddstockpile = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    let stockpile = interaction.options.getString("stockpile")! // Tell typescript to shut up and it is non-null

    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false

    if (!stockpile) {
        await interaction.editReply({
            content: "Missing parameters"
        });
        return false
    }

    
    const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections()
    const cleanedName = stockpile.replace(/\./g, "").replace(/\$/g, "")
    const stockpileExist = await collections.stockpiles.findOne({ name: cleanedName })
    if (stockpileExist) {
        await interaction.editReply({ content: "The stockpile with the name `" + stockpile + "` already exists." })
    }
    else {
        let insertObj: any = {
            name: cleanedName, items: {}, lastUpdated: new Date()
        }
        const configObj = (await collections.config.findOne({}))!
        if ("orderSettings" in configObj) {
            await collections.config.updateOne({}, { $push: { orderSettings: cleanedName } })
        }
        mongoSanitize.sanitize(insertObj, { replaceWith: "_" })
        await collections.stockpiles.insertOne(insertObj)
        await interaction.editReply({ content: "Added the stockpile `" + stockpile + "` successfully." })

        const [stockpileHeader, stockpileMsgs, targetMsg, facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
        await updateStockpileMsg(client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg, facMsg, stockpileMsgsHeader, refreshAll])
    }




    return true;
}

export default spaddstockpile
