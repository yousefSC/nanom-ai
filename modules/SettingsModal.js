window.SettingsModal = class {
    constructor(modalId, storageSystem) {
        this.modal = document.getElementById(modalId);
        this.storage = storageSystem;
        this.activeTab = 'general';
        this.settings = this.loadSettingsData();
        this.init();
    }

    loadSettingsData() {
        // Default Settings
        const defaults = {
            language: 'en',
            theme: 'dark',
            fontScale: 100,
            animSpeed: 1.0,
            showBlobs: true,
            hapticEnabled: true,
            soundEnabled: true, // New
            username: '',
            aboutUser: '',
            aiPersonality: 'Friendly & Helpful',
            aiStack: 'React (Next.js)',
            autoFormat: true,
            autoSave: true, // New
            debugMode: false,
            verboseLogs: false
        };
        const saved = JSON.parse(localStorage.getItem('nanom_settings') || '{}');
        return { ...defaults, ...saved };
    }

    init() {
        if (!this.modal) return;

        // Apply loaded settings immediately
        this.applySettings();

        // Bind Tab Switching
        this.modal.querySelectorAll('.settings-tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget; // robust against clicking icon span
                this.switchTab(target.dataset.tab);
            });
        });

        // Close Button
        const closeBtn = this.modal.querySelector('.close-settings');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        // Bind All Inputs
        this.bindInputs();
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        // Update Tabs
        this.modal.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        // Update Content Sections
        this.modal.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = section.id === `settings-${tabName}` ? 'block' : 'none';
        });

        // Trigger Addon Stats update if switching to addons tab
        if (tabName === 'addons' && window.addonManager) {
            window.addonManager.updateAddonsStats();
        }
    }

    show() {
        this.modal.classList.add('active');
        const content = this.modal.querySelector('.settings-container');
        // Simple entry animation
        content.style.opacity = '0';
        content.style.transform = 'translateY(15px)';
        requestAnimationFrame(() => {
            content.style.transition = 'all 0.3s var(--easing)';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        });
    }

    hide() {
        this.modal.classList.remove('active');
    }

    applySettings() {
        // Apply Theme
        document.documentElement.setAttribute('data-theme', this.settings.theme);

        // Apply Font Scale
        document.documentElement.style.fontSize = `${this.settings.fontScale}%`;

        // Apply Speed
        document.documentElement.style.setProperty('--anim-speed-multiplier', this.settings.animSpeed);

        // Apply Blobs Visibility
        const blobs = document.querySelectorAll('.blob-1, .blob-2, .blob-3');
        blobs.forEach(b => {
            // If b has style, we respect it, but we toggle visibility via opacity or display
            b.style.display = this.settings.showBlobs ? 'block' : 'none';
        });

        // Language (Placeholder implementation)
        document.documentElement.lang = this.settings.language;
        document.documentElement.dir = this.settings.language === 'ar' ? 'rtl' : 'ltr';
    }

    saveSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('nanom_settings', JSON.stringify(this.settings));
        this.applySettings(); // Re-apply immediately
    }

    bindInputs() {
        // --- General ---

        // Language Selector (Segmented)
        const langBtns = document.querySelectorAll('#lang-selector .segment');
        langBtns.forEach(btn => {
            if (btn.dataset.lang === this.settings.language) btn.classList.add('active');
            btn.addEventListener('click', () => {
                langBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveSetting('language', btn.dataset.lang);
            });
        });

        // Theme Selector (Segmented)
        const themeBtns = document.querySelectorAll('#theme-selector .segment');
        themeBtns.forEach(btn => {
            if (btn.dataset.themeVal === this.settings.theme) btn.classList.add('active'); // active processing
            else btn.classList.remove('active');

            btn.addEventListener('click', () => {
                themeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveSetting('theme', btn.dataset.themeVal);
            });
        });
        // Initial Active State for Theme if not set in HTML
        if (!document.querySelector('#theme-selector .segment.active')) {
            const activeThemeBtn = document.querySelector(`#theme-selector .segment[data-theme-val="${this.settings.theme}"]`);
            if (activeThemeBtn) activeThemeBtn.classList.add('active');
        }


        // Scale Slider
        const scaleInput = document.getElementById('setting-scale');
        const scaleVal = document.getElementById('scale-value');
        if (scaleInput) {
            scaleInput.value = this.settings.fontScale;
            if (scaleVal) scaleVal.innerText = this.settings.fontScale + '%';
            scaleInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (scaleVal) scaleVal.innerText = val + '%';
                this.saveSetting('fontScale', val);
            });
        }

        // Speed Slider
        const speedInput = document.getElementById('setting-speed');
        const speedVal = document.getElementById('speed-value');
        if (speedInput) {
            speedInput.value = this.settings.animSpeed;
            if (speedVal) speedVal.innerText = this.settings.animSpeed + 'x';
            speedInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (speedVal) speedVal.innerText = val + 'x';
                this.saveSetting('animSpeed', val);
            });
        }

        // Toggles
        this.bindToggle('toggle-blobs', 'showBlobs');
        this.bindToggle('toggle-haptic', 'hapticEnabled');
        this.bindToggle('toggle-sound', 'soundEnabled');
        this.bindToggle('toggle-autoformat', 'autoFormat');
        this.bindToggle('toggle-autosave', 'autoSave');

        // --- Personal ---

        // Username
        const userInp = document.getElementById('setting-username');
        if (userInp) {
            userInp.value = this.settings.username;
            userInp.addEventListener('input', (e) => this.saveSetting('username', e.target.value));
        }

        // --- AI & Code ---

        // Stack Selector
        const stackData = document.getElementById('setting-stack');
        if (stackData) {
            stackData.value = this.settings.aiStack;
            stackData.addEventListener('change', (e) => this.saveSetting('aiStack', e.target.value));
        }

        // Advanced Toggle
        const advBtn = document.getElementById('toggle-advanced-ai');
        const advPanel = document.getElementById('advanced-ai-options');
        if (advBtn && advPanel) {
            advBtn.addEventListener('click', () => {
                const isHidden = advPanel.style.display === 'none';
                advPanel.style.display = isHidden ? 'block' : 'none';
                advBtn.innerHTML = isHidden ?
                    'Hide Advanced Code Options <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>' :
                    'Show Advanced Code Options <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            });
        }

        // --- Data ---

        // Export
        const exportBtn = document.getElementById('btn-export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Delete
        const deleteBtn = document.getElementById('btn-delete-data');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                    localStorage.clear();
                    location.reload();
                }
            });
        }
    }

    bindToggle(id, settingKey) {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = this.settings[settingKey];
        el.addEventListener('change', (e) => {
            this.saveSetting(settingKey, e.target.checked);
        });
    }

    exportData() {
        const data = JSON.stringify(localStorage);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nanom_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
