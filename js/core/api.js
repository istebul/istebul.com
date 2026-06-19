// API utilities
import { supabase } from './supabase.js';
import config from './config.js';
import { postAiProxy } from './ai-proxy-client.js';

export class API {
    static sanitizeSearchTerm(value) {
        return value
            .toString()
            .replace(/[%_,()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100);
    }

    static sanitizeProfileUpdates(updates = {}) {
        const allowedFields = ['full_name', 'avatar_url', 'phone', 'location', 'bio'];
        return allowedFields.reduce((safeUpdates, field) => {
            if (Object.prototype.hasOwnProperty.call(updates, field)) {
                safeUpdates[field] = updates[field];
            }
            return safeUpdates;
        }, {});
    }

    static sanitizeListingUpdates(listingData = {}) {
        const allowedFields = [
            'title',
            'description',
            'price',
            'currency',
            'location',
            'images',
            'category',
            'status',
            'tags',
            'metadata',
            'external_url'
        ];

        return allowedFields.reduce((safeUpdates, field) => {
            if (Object.prototype.hasOwnProperty.call(listingData, field)) {
                safeUpdates[field] = listingData[field];
            }
            return safeUpdates;
        }, {});
    }

    static async request(endpoint, options = {}) {
        const url = endpoint.startsWith('/ai-proxy') ? endpoint : `${config.api.baseUrl}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Auth API
    static async signUp(email, password, userData = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        });

        if (error) throw error;
        return data;
    }

    static async signIn(email, password) {
        const timeoutMs = 12000;
        const signInPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
                () => reject(new Error('Giriş isteği zaman aşımına uğradı. Lütfen tekrar deneyin.')),
                timeoutMs
            );
        });

        const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

        if (error) throw error;

        return {
            session: data.session,
            user: data.user
        };
    }

    static async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    static async resetPassword(email) {
        const redirectTo = typeof window !== 'undefined'
            ? `${window.location.origin}/?auth=reset`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo
        });
        if (error) throw error;
    }

    static async resendSignupConfirmation(email) {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email
        });
        if (error) throw error;
    }

    static async getSubscription(userId) {
        const { data, error } = await supabase
            .from('subscriptions')
            .select(
                'status, current_period_start, current_period_end, cancel_at_period_end, stripe_price_id, provider, plan_code, updated_at'
            )
            .eq('user_id', userId)
            .in('status', ['active', 'trialing', 'past_due', 'canceled', 'cancelled'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    static async getUserEntitlements(userId) {
        const { data, error } = await supabase
            .from('user_entitlements')
            .select('entitlement_code, status, expires_at, created_at, source_order_id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
        return data || [];
    }

    // Profile API
    static async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    static async updateProfile(userId, updates) {
        const safeUpdates = this.sanitizeProfileUpdates(updates);

        const { data, error } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async createProfile(profileData) {
        const { data, error } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Listings API (legacy `listings` table — retired for public SPA; use decision-options-api.js)
    /** @deprecated Public catalog uses ai_listings via js/core/decision-options-api.js */
    static async getListings(options = {}) {
        console.warn('[isteBul] API.getListings is deprecated for public UI — use loadDecisionOptions()');
        return [];
    }

    /** @deprecated Use getDecisionOptionById from decision-options-api.js */
    static async getListing(id) {
        console.warn('[isteBul] API.getListing is deprecated — use getDecisionOptionById()');
        return null;
    }

    /** @deprecated Use submitUserListingToAiEngine via ai-listings-intake */
    static async createListing(listingData) {
        console.warn('[isteBul] API.createListing is deprecated — use ai-listings-intake edge');
        throw new Error('Legacy listings table retired — use Karar Merkezi intake');
    }

    static async updateListing(id, updates) {
        const safeUpdates = this.sanitizeListingUpdates(updates);

        const { data, error } = await supabase
            .from('listings')
            .update(safeUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteListing(id) {
        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Image upload

    static async getCategoryCounts() {
        const { data, error } = await supabase
            .from('listings')
            .select('category')
            .eq('status', 'active');

        if (error) throw error;

        return (data || []).reduce((counts, listing) => {
            const category = listing.category || 'diger';
            counts[category] = (counts[category] || 0) + 1;
            return counts;
        }, {});
    }


    // Admin API
    static async getAllUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async updateUserRole() {
        throw new Error(
            'Profile role changes must use the admin panel (admin-action edge function).'
        );
    }

    static async getAdminStats() {
        const [users, listings, categories] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact' }),
            supabase.from('listings').select('id', { count: 'exact' }),
            supabase.from('categories').select('id', { count: 'exact' })
        ]);

        return {
            users: users.count,
            listings: listings.count,
            categories: categories.count
        };
    }

    // Messaging API
    static async getMessages(userId) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async sendMessage(senderId, receiverId, content) {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // AI/Quiz API
    static async getQuizQuestions(category = null) {
        let query = supabase
            .from('quiz_questions')
            .select('*')
            .eq('active', true);

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async submitQuizAnswer(questionId, answer, userId) {
        const { data: question, error: questionError } = await supabase
            .from('quiz_questions')
            .select('correct_answer')
            .eq('id', questionId)
            .single();

        if (questionError) throw questionError;

        const { data, error } = await supabase
            .from('quiz_answers')
            .insert([{
                question_id: questionId,
                user_id: userId,
                answer,
                is_correct: Number(answer) === Number(question.correct_answer),
                submitted_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async isTrialEligible(userId) {
        if (!userId) return false;

        const { data, error } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        if (error) return false;
        return !data?.length;
    }

    // OpenAI proxy
    static async askAI(prompt, context = {}) {
        const { data: { session } } = await supabase.auth.getSession();

        const headers = {};

        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        }

        const proxy = await postAiProxy({
            prompt,
            context,
            headers
        });

        if (!proxy.ok) {
            console.error(`API request failed: ${config.api.endpoints.aiProxy}`, proxy.error);
            throw new Error(`HTTP error! status: ${proxy.status}`);
        }

        return proxy.data;
    }
}

export default API;
