// Messaging Feature Manager
import API from '../core/api.js';
import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';

export class MessagingManager {
    constructor() {
        this.messages = [];
        this.subscription = null;
    }

    async loadMessages(userId) {
        const messages = await API.getMessages(userId);
        this.messages = messages;
        state.set('messages', messages);
        return messages;
    }

    async sendMessage(senderId, receiverId, content) {
        const message = await API.sendMessage(senderId, receiverId, content);
        return message;
    }

    subscribeToMessages(userId, callback) {
        this.subscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            }, payload => {
                callback(payload.new);
            })
            .subscribe();
    }

    unsubscribe() {
        if (this.subscription) {
            supabase.removeChannel(this.subscription);
        }
    }
}

export const messaging = new MessagingManager();
export default messaging;
