
window.StorageSystem = class {
    // "Layered" Storage Logic
    static getUsersWithRecovery() {
        // 1. Primary
        const primary = localStorage.getItem('nanom_users');
        if (primary) return JSON.parse(primary);

        // 2. Backup
        const backup = localStorage.getItem('nanom_users_backup');
        if (backup) {
            console.warn('Recovered from backup');
            return JSON.parse(backup);
        }

        // 3. Legacy (Old Data)
        const legacy = localStorage.getItem('nanom_users_legacy');
        if (legacy) {
            console.warn('Recovered from legacy');
            return JSON.parse(legacy);
        }

        return []; // Default empty
    }

    static saveUser(email, data) {
        // Key format: nanom_data_user@email.com
        const key = `nanom_data_${email}`;
        localStorage.setItem(key, JSON.stringify(data));

        // Also update main index
        let users = this.getUsersWithRecovery();
        if (!users.includes(email)) {
            users.push(email);
            localStorage.setItem('nanom_users', JSON.stringify(users));
            localStorage.setItem('nanom_users_backup', JSON.stringify(users)); // Mirror backup
        }

        // Trigger Cloud Sync if available
        if (window.supabaseManager && window.supabaseManager.getUser()) {
            const currentUser = window.supabaseManager.getUser();
            if (currentUser.email === email) {
                window.supabaseManager.saveUserData(data);
            }
        }
    }

    // Merge Cloud Data with Local
    static mergeData(email, cloudData) {
        if (!cloudData) return;
        console.log('Merging cloud data...');
        // For simplicity, Cloud wins (or we could deep merge)
        // Here we just overwrite local with cloud to ensure simple restoration
        this.saveUser(email, cloudData);
        return cloudData;
    }
}
