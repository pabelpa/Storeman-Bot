import { ButtonInteraction, GuildMember } from "discord.js";
import mongoSanitize from "express-mongo-sanitize";
import { getCollections } from "../mongoDB";
import checkPermissions from "./checkPermissions";
import checkTimeNotifs from "./checkTimeNotifs";
import generateStockpileMsg from "./generateStockpileMsg";
import updateStockpileMsg from "./updateStockpileMsg";



const spsetamount = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "user", interaction.member as GuildMember))) return false
    const lowerToOriginal: any = NodeCacheObj.get("lowerToOriginal")

    const item = splitted[1]
    const amount = parseInt(splitted[2])
    const stockpileName = splitted[3]

    const cleanitem = item.replace(/\./g, "_").toLowerCase()

    const stockpileExist = await collections.stockpiles.findOne({ name: stockpileName })
    if (stockpileExist) {
        if (amount > 0) stockpileExist.items[cleanitem] = amount
        else delete stockpileExist.items[cleanitem]
        mongoSanitize.sanitize(stockpileExist.items, { replaceWith: "_" })
        await collections.stockpiles.updateOne({ name: stockpileName.replace(/\./g, "").replace(/\$/g, "") }, { $set: { items: stockpileExist.items, lastUpdated: new Date() } })
    }
    else {
        let itemObject: any = {}
        if (amount > 0) itemObject[cleanitem] = amount

        mongoSanitize.sanitize(itemObject, { replaceWith: "_" })
        await collections.stockpiles.insertOne({ name: stockpileName.replace(/\./g, "").replace(/\$/g, ""), items: itemObject, lastUpdated: new Date() })
        await collections.config.updateOne({}, { $push: { orderSettings: stockpileName.replace(/\./g, "").replace(/\$/g, "") } })
    }

    await interaction.followUp({ content: "Item `" + lowerToOriginal[cleanitem] + "` has been set to `" + amount + "` crates inside the stockpile `" + stockpileName + "`", ephemeral: true })

    const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
    await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])
}

const spsettimeleft = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "user", interaction.member as GuildMember))) return false

    

    const disableTimeNotif: any = NodeCacheObj.get("disableTimeNotif")
    const timeCheckDisabled = process.env.STOCKPILER_MULTI_SERVER === "true" ? disableTimeNotif[interaction.guildId!] : disableTimeNotif
    if (timeCheckDisabled) {
        await interaction.followUp({ content: "Error: The time-checking feature of Storeman Bot is disabled for this server. Please use `/spdisabletime` to enable it.", ephemeral: true })
        return false
    }

    const stockpile = splitted[1]

    const cleanName = stockpile.replace(/\./g, "_").replace(/\./g, "").replace(/\$/g, "")
    const searchQuery = new RegExp(cleanName, "i")

    const stockpileExist = await collections.stockpiles.findOne({ name: searchQuery })
    if (stockpileExist) {
        const newTimeLeft = new Date((new Date()).getTime() + 60 * 60 * 1000 * 50)
        await collections.stockpiles.updateOne({ name: searchQuery }, { $set: { timeLeft: newTimeLeft }, $unset: { upperBound: 1 } })
        await interaction.followUp({ content: "Updated the stockpile " + cleanName + " count down timer successfully", ephemeral: true })

        const stockpileTimesObj: any = NodeCacheObj.get("stockpileTimes")
        let stockpileTimes: any;
        if (process.env.STOCKPILER_MULTI_SERVER === "true") stockpileTimes = stockpileTimesObj[interaction.guildId!]
        else stockpileTimes = stockpileTimesObj

        const timerBP: any = NodeCacheObj.get("timerBP")
        stockpileTimes[cleanName] = { timeLeft: newTimeLeft, timeNotificationLeft: timerBP.length - 1 }
        const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
        await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])
        checkTimeNotifs(interaction.client, true, false, interaction.guildId!)
    }
    else {
        await interaction.followUp({ content: "Error: Stockpile " + cleanName + " does not exist", ephemeral: true })
    }

}

const spsettarget = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false
    const lowerToOriginal: any = NodeCacheObj.get("lowerToOriginal")

    

    let item = splitted[1]! // Tell typescript to shut up and it is non-null
    const minimum_amount = parseInt(splitted[2])
    let maximum_amount = parseInt(splitted[3])
    let production_location = splitted[4]

    const cleanitem = item.replace(/\./g, "_").toLowerCase()

    let updateObj: any = {}
    updateObj[cleanitem] = { min: minimum_amount, max: maximum_amount, prodLocation: production_location }
    mongoSanitize.sanitize(updateObj, { replaceWith: "_" })
    if ((await collections.targets.updateOne({}, { $set: updateObj })).modifiedCount === 0) {
        await collections.targets.insertOne(updateObj)
    }

    const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
    await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])

    await interaction.followUp({
        content: `Item \`${lowerToOriginal[cleanitem]}\` has been added with a target of minimum ${minimum_amount} crates and maximum ${maximum_amount !== 0 ? maximum_amount : "unlimited"} crates.`,
        ephemeral: true
    });
}

const spgroupsettarget = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false
    const lowerToOriginal: any = NodeCacheObj.get("lowerToOriginal")

    

    let item = splitted[1]! // Tell typescript to shut up and it is non-null
    const minimum_amount = parseInt(splitted[2])
    let maximum_amount = parseInt(splitted[3])
    let production_location = splitted[4]
    const name = splitted[5]

    const cleanitem = item.replace(/\./g, "_").toLowerCase()

    let updateObj: any = { min: minimum_amount, max: maximum_amount, prodLocation: production_location }
    mongoSanitize.sanitize(updateObj, { replaceWith: "_" })

    const config = await collections.config.findOne({})
    const stockpileGroupsObjInitial: any = NodeCacheObj.get("stockpileGroups")
    const stockpileGroupsObj: any = process.env.STOCKPILER_MULTI_SERVER === "true" ? stockpileGroupsObjInitial[interaction.guildId!] : stockpileGroupsObjInitial

    stockpileGroupsObj[name].targets[cleanitem] = updateObj
    config.stockpileGroups[name].targets[cleanitem] = updateObj

    await collections.config.updateOne({}, { $set: { stockpileGroups: config.stockpileGroups } })

    const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
    await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])

    await interaction.followUp({
        content: `Item \`${lowerToOriginal[cleanitem]}\` has been added with a target of minimum ${minimum_amount} crates and maximum ${maximum_amount !== 0 ? maximum_amount : "unlimited"} crates.`,
        ephemeral: true
    });
}

const spfind = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "user", interaction.member as GuildMember))) return false

    

    let item = splitted[1]! // Tell typescript to shut up and it is non-null
    const lowerToOriginal: any = NodeCacheObj.get("lowerToOriginal")
    const locationMappings: any = NodeCacheObj.get("locationMappings")

    const cleanitem = item.replace(/\$/g, "").replace(/\./g, "_").toLowerCase()

    let msg = "Stockpiles in which `" + lowerToOriginal[cleanitem] + "` was found in: \n\n"

    const stockpiles = await collections.stockpiles.find({}).toArray()
    const configObj = (await collections.config.findOne({}))!
    let stockpileLocations: any = {}

    if ("stockpileLocations" in configObj) stockpileLocations = configObj.stockpileLocations

    for (let i = 0; i < stockpiles.length; i++) {
        const current = stockpiles[i]
        if (cleanitem in current.items) {
            msg += `**__${current.name}__**${current.name in stockpileLocations ? " (Location: " + locationMappings[stockpileLocations[current.name]] + ")" : ""}:\n`
            msg += current.items[cleanitem] + " - " + lowerToOriginal[cleanitem] + "\n"

            if (cleanitem.indexOf("crate") !== -1) {
                // Since the item the user is searching for is a crated item, search for its non crated version as well 
                const nonCratedItem = cleanitem.replace(" crate", "")
                if (nonCratedItem in current.items) msg += current.items[nonCratedItem] + " - `" + lowerToOriginal[nonCratedItem] + "`\n"
            }
            else {
                // Since the item the user is searching for is a non-crated item, search for its crated version as well
                const cratedItem = cleanitem + " crate"
                if (cratedItem in current.items) msg += current.items[cratedItem] + " - `" + lowerToOriginal[cratedItem] + "`\n"
            }
        }
        else {
            // Item is not inside, try finding the crated/non-crated version of that item
            if (cleanitem.indexOf("crate") !== -1) {
                // Since the item the user is searching for is a crated item, search for its non crated version as well 
                const nonCratedItem = cleanitem.replace(" crate", "")
                if (nonCratedItem in current.items) {
                    msg += `**__${current.name}__**${current.name in stockpileLocations ? " (Location: " + locationMappings[stockpileLocations[current.name]] + ")" : ""}:\n`
                    msg += current.items[nonCratedItem] + " - `" + lowerToOriginal[nonCratedItem] + "`\n"
                }
            }
            else {
                // Since the item the user is searching for is a non-crated item, search for its crated version as well
                const cratedItem = cleanitem + " crate"
                if (cratedItem in current.items) {
                    msg += `**__${current.name}__**${current.name in stockpileLocations ? " (Location: " + locationMappings[stockpileLocations[current.name]] + ")" : ""}:\n`
                    msg += current.items[cratedItem] + " - `" + lowerToOriginal[cratedItem] + "`\n"
                }
            }
        }
    }

    while (msg.length > 0) {
        if (msg.length > 2000) {
            const sliced = msg.slice(0, 2000)
            const lastEnd = sliced.lastIndexOf("\n")
            const finalMsg = sliced.slice(0, lastEnd)

            await interaction.followUp({
                content: finalMsg,
                ephemeral: true
            });
            msg = msg.slice(lastEnd, msg.length)
        }
        else {
            await interaction.followUp({
                content: msg,
                ephemeral: true
            });
            msg = ""
        }
    }
}

const sppurgestockpile = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false

    
    await collections.stockpiles.deleteMany({})
    await collections.config.updateOne({}, { $unset: { orderSettings: 1, prettyName: 1, code: 1, stockpileLocations: 1 } })

    if (process.env.STOCKPILER_MULTI_SERVER === "true") {
        const stockpileTimes: any = NodeCacheObj.get("stockpileTimes")
        stockpileTimes[interaction.guildId!] = {}
        NodeCacheObj.set("stockpileTimes", stockpileTimes)

        const prettyName: any = NodeCacheObj.get("prettyName")
        prettyName[interaction.guildId!] = {}
        NodeCacheObj.set("prettyName", prettyName)
    }
    else {
        NodeCacheObj.set("prettyName", {})
        NodeCacheObj.set("stockpileTimes", {})
    }



    const [stockpileHeader, stockpileMsgs, targetMsg, facMsg,stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
    await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg, facMsg,stockpileMsgsHeader, refreshAll])

    await interaction.followUp({
        content: `All stockpiles have been purged`,
        ephemeral: true
    });
}

const sprefreshall = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    if (!(await checkPermissions(interaction, "user", interaction.member as GuildMember))) return false
    

    await collections.stockpiles.find({}).forEach(async (doc: any) => {
        const newTimeLeft = new Date((new Date()).getTime() + 60 * 60 * 1000 * 50)

        await collections.stockpiles.updateOne({ name: doc.name }, { $set: { timeLeft: newTimeLeft }, $unset: { upperBound: 1 } })
        const stockpileTimesObj: any = NodeCacheObj.get("stockpileTimes")
        let stockpileTimes: any;
        if (process.env.STOCKPILER_MULTI_SERVER === "true") stockpileTimes = stockpileTimesObj[interaction.guildId!]
        else stockpileTimes = stockpileTimesObj

        const timerBP: any = NodeCacheObj.get("timerBP")
        stockpileTimes[doc.name] = { timeLeft: newTimeLeft, timeNotificationLeft: timerBP.length - 1 }
    })

    const [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll] = await generateStockpileMsg(true, interaction.guildId)
    await updateStockpileMsg(interaction.client, interaction.guildId, [stockpileHeader, stockpileMsgs, targetMsg,facMsg, stockpileMsgsHeader, refreshAll])
    checkTimeNotifs(interaction.client, true, false, interaction.guildId!)
    await interaction.followUp({ content: "Updated the timers of all your stockpiles.", ephemeral: true })
}

const cancel = async (interaction: ButtonInteraction, collections: any, splitted: Array<string>) => {
    await interaction.update({ content: "Command cancelled", components: [] })
}

const commands: any = {
    'spsetamount': spsetamount,
    'spsettimeleft': spsettimeleft,
    'sprefreshall': sprefreshall,
    'sppurgestockpile': sppurgestockpile,
    'spfind': spfind,
    'spsettarget': spsettarget,
    'cancel': cancel,
    'spgroupsettarget': spgroupsettarget
}


const buttonHandler = async (interaction: ButtonInteraction) => {
    try {
        const splitted = interaction.customId.split("==")
        const command = splitted[0]
        const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections()
    
        commands[command](interaction, collections, splitted)
    }
    catch (e) {
        console.log("Error occured in buttonHandler")
        console.log(e)
    }

}

export default buttonHandler
