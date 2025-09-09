import { Client, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction } from "discord.js";
import generateStockpileMsg from "./../Utils/generateStockpileMsg"
import updateStockpileMsg from "../Utils/updateStockpileMsg";
import checkPermissions from "../Utils/checkPermissions";
import { getCollections } from './../mongoDB'
import findBestMatchItem from '../Utils/findBestMatchItem'
import mongoSanitize from "express-mongo-sanitize";

const spsetamount = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    let item = <string>interaction.options.getString("item") // Tell typescript to shut up cause it's gonna return a string and not null
    const amount = interaction.options.getInteger("amount")
    const lowerToOriginal: any = NodeCacheObj.get("lowerToOriginal")
    const stockpileName = interaction.options.getString("stockpile")
    const collections = getCollections()

    if (!(await checkPermissions(interaction, "user", interaction.member as GuildMember))) return false

    if (!amount || !stockpileName || !item) {
        await interaction.editReply({
            content: "Missing parameters"
        });
        return false
    }

    
    const searchQuery = new RegExp(stockpileName.replace(/\./g, "").replace(/\$/g, ""), "i")
    const stockpileExist = await collections.stockpiles.findOne({ name: searchQuery })
    const itemListBoth = NodeCacheObj.get("itemListBoth") as Array<string>
    const cleanitem = item.replace(/\./g, "_").replace(/\$/g, "").toLowerCase()
    if (stockpileExist) {
        // Stockpile exists, but item doesn't
        if (itemListBoth.includes(cleanitem)) {
            if (amount > 0) stockpileExist.items[cleanitem] = amount
            else delete stockpileExist.items[cleanitem]
            mongoSanitize.sanitize(stockpileExist.items, { replaceWith: "_" })
            await collections.stockpiles.updateOne({ name: searchQuery }, { $set: { items: stockpileExist.items, lastUpdated: new Date() } })
        }
        else {
            const bestItem = findBestMatchItem(cleanitem)
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('spsetamount==' + bestItem + "==" + amount + "==" + stockpileName)
                        .setLabel(lowerToOriginal[bestItem])
                        .setStyle(ButtonStyle.Primary)
                    ,
                    new ButtonBuilder()
                        .setCustomId('spsetamount==' + bestItem + " Crate==" + amount + "==" + stockpileName)
                        .setLabel(lowerToOriginal[bestItem] + " Crate")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger),
                );

            await interaction.editReply({
                content: `Item \`'${item}'\` was not found. Did you mean: '${lowerToOriginal[bestItem]}' or '${lowerToOriginal[bestItem] + " Crate"}' instead?`,
                components: [row]
            });
            return false
        }

    }
    else {
        // Stockpile doesn't exist
        if (itemListBoth.includes(cleanitem)) {
            let itemObject: any = {}
            if (amount > 0) itemObject[cleanitem] = amount

            mongoSanitize.sanitize(itemObject, { replaceWith: "_" })
            await collections.stockpiles.insertOne({ name: stockpileName.replace(/\./g, "").replace(/\$/g, ""), items: itemObject, lastUpdated: new Date() })
            await collections.config.updateOne({}, { $push: { orderSettings: stockpileName.replace(/\./g, "").replace(/\$/g, "") } })
        }
        else {
            const bestItem = findBestMatchItem(cleanitem).replace(/\_/g, ".")
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('spsetamount==' + bestItem + "==" + amount + "==" + stockpileName)
                        .setLabel(lowerToOriginal[bestItem])
                        .setStyle(ButtonStyle.Primary)
                    ,
                    new ButtonBuilder()
                        .setCustomId('spsetamount==' + bestItem + " Crate==" + amount + "==" + stockpileName)
                        .setLabel(lowerToOriginal[bestItem] + " Crate")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger),
                );

            await interaction.editReply({
                content: `Item \`'${item}'\` was not found. Did you mean: '${lowerToOriginal[bestItem]}' or '${lowerToOriginal[bestItem] + " Crate"}' instead?`,
                components: [row]
            });
            return false
        }

    }

    let updatedStockpile = await collections.stockpiles.findOne({name:searchQuery})
    await updateStockpileMsg(client,"",updatedStockpile,true)

    await interaction.editReply({
        content: "Item `" + lowerToOriginal[cleanitem] + "` has been set to `" + amount + "` crates inside the stockpile `" + stockpileName + "`"
    });

    return true;
}

export default spsetamount
