window.AiToolsSheet = class {
    constructor(sheetId) {
        this.sheet = document.getElementById(sheetId);
        this.selectedModel = 'pro'; // Default
        this.init();
    }

    init() {
        if (!this.sheet) return;

        // Model Selection
        const models = this.sheet.querySelectorAll('.model-option');
        models.forEach(model => {
            model.addEventListener('click', () => {
                this.selectModel(model.dataset.model);
            });
        });

        // Creativity Slider
        const wrapper = this.sheet.querySelector('.creativity-control');
        const options = this.sheet.querySelectorAll('.creativity-option');
        const indicator = this.sheet.querySelector('.creativity-indicator');

        if (wrapper && indicator) {
            options.forEach((opt, index) => {
                opt.addEventListener('click', () => {
                    // Update Active State
                    options.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');

                    // Move Indicator
                    // Assuming 3 options equal width
                    const widthPct = 100 / 3;
                    indicator.style.left = `${index * widthPct}%`;
                });
            });
        }

        // Toggles (Web, AutoFix, DeepThink)
        const toggles = this.sheet.querySelectorAll('.tool-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const isActive = toggle.classList.contains('active');
                toggle.classList.toggle('active');

                // Scale animation
                toggle.style.transform = 'scale(0.9)';
                setTimeout(() => toggle.style.transform = 'scale(1)', 150);
            });
        });
    }

    selectModel(modelKey) {
        this.selectedModel = modelKey;
        // Update UI
        this.sheet.querySelectorAll('.model-option').forEach(m => {
            const isSelected = m.dataset.model === modelKey;
            m.classList.toggle('active', isSelected);

            // Show Checkmark if selected
            const check = m.querySelector('.check-icon');
            if (check) check.style.opacity = isSelected ? '1' : '0';
        });
    }

    toggle() {
        this.sheet.classList.toggle('active');
    }
}
