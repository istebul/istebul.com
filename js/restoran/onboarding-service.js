import { supabase } from '../core/supabase.js';

export async function setupRestaurantOnboarding({
    businessId,
    restaurantName,
    phone
}) {

    if (!businessId) {
        throw new Error('businessId required');
    }


    const { data: branch, error: branchError } =
        await supabase
            .from('branches')
            .insert({
                business_id: businessId,
                name: restaurantName || 'Ana Şube',
                phone
            })
            .select()
            .single();


    if (branchError) {
        throw branchError;
    }


    const { error: settingsError } =
        await supabase
            .from('business_settings')
            .insert({
                business_id: businessId
            });


    if (settingsError) {
        throw settingsError;
    }


    const { error: whatsappError } =
        await supabase
            .from('whatsapp_channels')
            .insert({
                business_id: businessId,
                phone_number: phone || ''
            });


    if (whatsappError) {
        throw whatsappError;
    }


    return {
        success: true,
        branch
    };
}
