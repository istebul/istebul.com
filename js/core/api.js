// API utilities
import { supabase } from './supabase.js';
import config from './config.js';

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
        const url = `${config.api.baseUrl}${endpoint}`;

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
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    static async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    static async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
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

    // Listings API
    static async getListings(options = {}) {
        const {
            category,
            search,
            province,
            district,
            location,
            minPrice,
            maxPrice,
            vehicleBrand,
            propertyType,
            vacationType,
            limit = config.ui.itemsPerPage,
            offset = 0,
            userId,
            status = 'active'
        } = options;

        let query = supabase
            .from('listings')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (category) {
            query = query.eq('category', category);
        }

        if (Number.isFinite(Number(minPrice)) && Number(minPrice) > 0) {
            query = query.gte('price', Number(minPrice));
        }

        if (Number.isFinite(Number(maxPrice)) && Number(maxPrice) > 0) {
            query = query.lte('price', Number(maxPrice));
        }

        const locationTerm = district || province || location;
        if (locationTerm) {
            const safeLocation = this.sanitizeSearchTerm(locationTerm);
            if (safeLocation) {
                query = query.ilike('location', '%' + safeLocation + '%');
            }
        }

        const detailTerm = vehicleBrand || propertyType || vacationType;
        if (detailTerm) {
            const safeDetail = this.sanitizeSearchTerm(detailTerm);
            if (safeDetail) {
                query = query.or('title.ilike.%' + safeDetail + '%,description.ilike.%' + safeDetail + '%');
            }
        }

        if (search) {
            const safeSearch = this.sanitizeSearchTerm(search);
            if (safeSearch) {
                query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
            }
        }

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    static async getListing(id) {
        const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async createListing(listingData) {
        const safeListingData = this.sanitizeListingUpdates(listingData);
        if (listingData.user_id) {
            safeListingData.user_id = listingData.user_id;
        }

        const { data, error } = await supabase
            .from('listings')
            .insert([safeListingData])
            .select()
            .single();

        if (error) throw error;
        return data;
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
    static async uploadImage(file, path) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('Görsel yüklemek için giriş yapmalısınız.');
        }

        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

        const result = await this.request(config.api.endpoints.uploadImage, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                fileName: path || file.name,
                contentType: file.type,
                base64
            })
        });

        return result.file;
    }

    static getImageUrl(path) {
        const { data } = supabase.storage
            .from('images')
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // Categories API
    static async getCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    }

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

    static async updateUserRole(userId, role) {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
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

    // Claude AI proxy
    static async askClaude(prompt, context = {}) {
        const { data: { session } } = await supabase.auth.getSession();

        const headers = {
            'Content-Type': 'application/json'
        };

        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        }

        return this.request(config.api.endpoints.claudeProxy, {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt, context })
        });
    }
}

export default API;
