
/**
 * SupabaseManager.js
 * Handles authentication and database interactions using Supabase.
 */

// REPLACE THESE WITH YOUR OWN SUPABASE PROJECT CREDENTIALS
// Go to https://supabase.com/dashboard/project/_/settings/api to find these.
const SUPABASE_URL = 'https://dgejvzhyzcdlevdafcwg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZWp2emh5emNkbGV2ZGFmY3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODk1NDIsImV4cCI6MjA4MjY2NTU0Mn0.8FK3-_p9AyLX-c5qakkX5r1VTnmyqGGojCMfXzoVQmo';

window.SupabaseManager = class {
    constructor() {
        this.client = null;
        this.user = null;
        this.init();
    }

    init() {
        const hasUrl = SUPABASE_URL && !SUPABASE_URL.includes('YOUR_');
        const hasKey = SUPABASE_KEY && !SUPABASE_KEY.includes('YOUR_');

        if (typeof supabase !== 'undefined') {
            if (!hasUrl || !hasKey) {
                this.initError = 'Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY in SupabaseManager.js';
                console.warn(this.initError);
                return;
            }

            try {
                this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

                // key listener for auth state changes
                this.client.auth.onAuthStateChange((event, session) => {
                    this.user = session ? session.user : null;
                    console.log('Supabase Auth Event:', event, this.user);
                    // Dispatch a custom event for the UI to react to
                    window.dispatchEvent(new CustomEvent('supabase:authstate', {
                        detail: { event, session }
                    }));
                });

            } catch (err) {
                this.initError = 'Failed to create Supabase client: ' + err.message;
                console.error(this.initError);
            }
        } else {
            this.initError = 'Supabase SDK not loaded. Check your internet connection or script tag in index.html';
            console.warn(this.initError);
        }
    }

    /**
     * Sign up a new user with email and password
     * Note: For email confirmation to work, configure SMTP in Supabase Dashboard:
     * Project Settings > Authentication > SMTP Settings
     * Or disable "Enable email confirmations" in Authentication settings for testing.
     * @param {string} email 
     * @param {string} password 
     */
    async signUp(email, password) {
        if (!this.client) return { error: { message: this.initError || 'Supabase client not initialized' } };

        try {
            const result = await this.client.auth.signUp({
                email,
                password,
                options: {
                    // For local file:// testing, we can't use redirectTo properly
                    // Email confirmation settings are controlled in Supabase Dashboard
                    emailRedirectTo: window.location.origin || 'http://localhost:3000'
                }
            });

            console.log('Supabase SignUp Result:', result);

            // Check if user was created but needs confirmation
            if (result.data?.user && !result.data.session) {
                console.log('User created, email confirmation required');
            }

            return result;
        } catch (err) {
            console.error('SignUp error:', err);
            return { error: { message: err.message } };
        }
    }

    /**
     * Sign in with Google (OAuth)
     */
    async signInWithGoogle() {
        if (!this.client) return { error: { message: this.initError || 'Supabase client not initialized' } };
        return await this.client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin || 'http://localhost:3000'
            }
        });
    }

    /**
     * Sign in with GitHub (OAuth)
     */
    async signInWithGithub() {
        if (!this.client) return { error: { message: this.initError || 'Supabase client not initialized' } };
        return await this.client.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin || 'http://localhost:3000'
            }
        });
    }

    /**
     * Sign in an existing user
     * @param {string} email 
     * @param {string} password 
     */
    async signIn(email, password) {
        if (!this.client) return { error: { message: this.initError || 'Supabase client not initialized' } };
        return await this.client.auth.signInWithPassword({
            email,
            password,
        });
    }

    /**
     * Sign out the current user
     */
    async signOut() {
        if (!this.client) return { error: { message: this.initError || 'Supabase client not initialized' } };
        return await this.client.auth.signOut();
    }

    /**
     * Get the currently logged in user
     */
    getUser() {
        return this.user;
    }

    /**
     * Save user data to cloud (Upsert)
     * @param {Object} data - The full data object
     */
    async saveUserData(data) {
        if (!this.client || !this.user) return;

        try {
            const { error } = await this.client
                .from('user_sync')
                .upsert({
                    user_id: this.user.id,
                    data: data,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('Cloud Save Success');
        } catch (err) {
            console.error('Cloud Save Error:', err);
        }
    }

    /**
     * Load user data from cloud
     */
    async loadUserData() {
        if (!this.client || !this.user) return null;

        try {
            const { data, error } = await this.client
                .from('user_sync')
                .select('data')
                .eq('user_id', this.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No data found
                throw error;
            }

            return data?.data || null;
        } catch (err) {
            console.error('Cloud Load Error:', err);
            return null;
        }
    }

    /**
     * Delete user data from cloud
     */
    async removeUserData() {
        if (!this.client || !this.user) return;

        try {
            const { error } = await this.client
                .from('user_sync')
                .delete()
                .eq('user_id', this.user.id);

            if (error) throw error;
            console.log('Cloud Data Deleted');
            return true;
        } catch (err) {
            console.error('Cloud Delete Error:', err);
            return false;
        }
    }

    /**
     * Check if client is ready
     */
    isReady() {
        return !!this.client;
    }

    // --- Session / Chat Management ---

    async getSessions() {
        if (!this.client || !this.user) return [];
        try {
            const { data, error } = await this.client
                .from('sessions')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching sessions:', err);
            return [];
        }
    }

    async upsertSession(id, title, history) {
        if (!this.client || !this.user) return null;
        try {
            const sessionData = {
                user_id: this.user.id,
                title: title,
                history: history,
                updated_at: new Date().toISOString()
            };

            if (id) sessionData.id = id;

            const { data, error } = await this.client
                .from('sessions')
                .upsert(sessionData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error saving session:', err);
            return null;
        }
    }

    async deleteSession(id) {
        if (!this.client || !this.user) return false;
        try {
            const { error } = await this.client
                .from('sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error deleting session:', err);
            return false;
        }
    }
}
