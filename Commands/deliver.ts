import { getCollections } from '../mongoDB'
import { ChatInputCommandInteraction, ChannelType } from 'discord.js';
import createOracleEmbed from '../Utils/createOracleEmbed';
const deliver = async (interaction: ChatInputCommandInteraction): Promise<boolean> => {
    let Ticket = getCollections().tickets

    let t = await Ticket.findOne({
        complete: true,
        channelId: interaction.channelId
    })

    if (!t || !t.logisticsTypes){
        interaction.editReply({content: "*Invalid channel, make sure the logistics request is complete and the command is being used in a ticket channel*"})
        return false
    }

    const o = t.logisticsTypes.findIndex((v) => {
        return (interaction.options.getString("resource") as string).toLowerCase() == v.toLowerCase();
    });

    if (o == -1) {
        interaction.editReply({content: "*Unable to find resource, make sure you spelled it correctly (not case sensitive)*"})
        return false;
    }

    if (!t.delivered) return false;

    let y = t.delivered;

    y[o] += interaction.options.getInteger("amount") || 0;

    await Ticket.updateOne(
    {
        _id:t._id
    },
    {
        $set:{delivered: y}
    })

    t = await Ticket.findOne({
        complete: true,
        channelId: interaction.channelId
    })

    if (!t || !t.logisticsTypes) return false;

    const ticketChannelEmbed = createOracleEmbed('Logistics Ticket (' + t.location + ")" , "Welcome to support ticket " + t.ticketId + ", help out by delivering the requested supplies and then running the **/deliver** command to report your work\n\nThe fields below are automatically updated as deliveries are reported\n\nThis channel will automatically lock when all requirements are fulfilled", 
        t.logisticsTypes?.map((v, i) => {
            if (!t || !t.demanded || !t.delivered) return {name: "A", value: "A"};
            return {name: v.toString(), value: t.delivered[i].toString() + " / " + t.demanded[i].toString()}
        }) as {value: string, name: string}[] , "");

    let fulfilled = true;

    for (let i = 0; i < t.logisticsTypes.length; i++) {
        if (!t.delivered || !t.demanded) continue;

        if (t.delivered[i] < t.demanded[i]){
            fulfilled = false;
            break;
        }
        
    }

    if (!interaction.channel || !interaction.channel.isTextBased()) return false;

    if (fulfilled){
        const q = interaction.client.channels.cache.get(t.channelId);

        if (q && q.type == ChannelType.GuildText){

            const logiChannelEmbed = createOracleEmbed('Logistics Ticket [COMPLETE] (' + t.location + ") - " + t.ticketId , "**Logistics order complete**, all resources have been delivered to the appropriate location", 
                t.logisticsTypes?.map((v, i) => {
                    if (!t || !t.demanded || !t.delivered) return {name: "A", value: "A"};
                    return {name: v.toString(), value: t.delivered[i].toString() + " / " + t.demanded[i].toString()}
                }) as {value: string, name: string}[] , "");
            
            /*
            await interaction.guild?.channels.edit(q, {
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id, 
                        deny: ["ViewChannel"]
                    },
                    {
                        id: t.ticketRoleId, 
                        deny: ["ViewChannel"]
                    },
                    {
                        id: interaction.guild.roles.highest.id,
                        allow: ["ViewChannel"]
                    },
                ]
            });
            */

            if (t.ticketPostEmbed && t.ticketPostChannel){
                const p = await interaction.client.channels.fetch(t.ticketPostChannel);
                if (!p || !p.isTextBased()) return false;

                await p.messages.fetch(t.ticketPostEmbed).then(async msg => {
                    if (!msg) return;

                    await (msg as any).edit({embeds: [logiChannelEmbed], components: []})
                });    
            }
        
        }

        if (!interaction.guild) return false;

        const users = await interaction.guild.members.list();
        console.log("here")
        const transcriptEmbed = createOracleEmbed('Logistics Ticket (' + t.ticketId + ") - Transcript" , "This ticket was recently closed, here's a transcript of the discussion:\n\n" + (t.transcript.length > 0 ? t.transcript.join("\n\n") : "*No messages were sent*"), 
                [] , "");

        for (let i = 0; i < users.size; i++) {
            if (users.at(i)?.roles?.cache?.some((v) => {return v.id == t?.ticketRoleId})) {
                await users.at(i)?.send({
                    embeds: [
                        transcriptEmbed
                    ]
                })
            }
        }
        let config = (await getCollections().config.findOne({}))!
        if (config.logChannel){
            const b = await interaction.client.channels.fetch(config.logChannel);

            if (b && b.isTextBased()){
                await b.send({
                    embeds: [
                        transcriptEmbed
                    ]
                })
            }
        }

        const rle = await interaction.guild.roles.fetch(t.ticketRoleId);

        if (rle){
            await rle.delete();
        }
        
        if (q){
            await q.delete()
        }

        await Ticket.updateOne({
            _id:t._id
        },
        {
            $set:{closed: true}
        });
    }
    
    

    if (!fulfilled){
        await interaction.channel.messages.fetch(t.updateEmbed).then(msg => (msg as any).edit({embeds: [ticketChannelEmbed]}));

        interaction.followUp({content: "**Logged delivery of " + interaction.options.getInteger("amount") + " " + interaction.options.getString("resource") + (interaction.options.getString("resource")?.endsWith("s") ? "" : "s") + " to " + t.location +" by <@" + (interaction.user.id) + ">**"})
    }else{
        interaction.followUp({content:"Automatically resolving issue, all demands met"})
    }   
    return true
}
export default deliver