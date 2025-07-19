import { getCollections } from '../mongoDB'
import { ChatInputCommandInteraction } from 'discord.js';
const setLogiTicketChannel = async (interaction: ChatInputCommandInteraction): Promise<boolean> => {


    if (interaction.memberPermissions?.has("ManageChannels")){
        const q = interaction.options.getChannel('channel');

        if (!q){
            interaction.editReply({content: "*Error: Invalid channel selected*"});

            return false;
        }

        await getCollections().config.updateOne({},{
            $set:{logisticsTicketChannel: q.id},
        });

        interaction.editReply({content: "*Updated logi ticket channel to <# " + (q.id)  +">*"});
    }else{
        interaction.editReply({content: '*Invalid permissions to run this command*'});
    }
    return true;
}

export default setLogiTicketChannel