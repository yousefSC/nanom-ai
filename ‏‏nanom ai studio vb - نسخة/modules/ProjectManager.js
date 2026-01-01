window.ProjectManager = class {
    constructor(messagesContainer, previewModal) {
        this.container = messagesContainer;
        this.previewModal = previewModal;
        this.isGenerating = false;
    }

    startGeneration(type, prompt) {
        if (this.isGenerating) return;
        this.isGenerating = true;

        // Create Placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'project-placeholder';
        placeholder.innerHTML = `
            <div class="spinner-ring"></div>
            <div class="floating-icons">
                <span class="float-icon icon-gear">⚙️</span>
                <span class="float-icon icon-code">📄</span>
            </div>
            <span class="gen-text">Building ${type} Architecture...</span>
        `;
        this.container.appendChild(placeholder);
        this.container.scrollTop = this.container.scrollHeight;

        // Simulate Build Time
        setTimeout(() => {
            // Replace with Final Card
            placeholder.replaceWith(this.createProjectCard(type, prompt));
            this.isGenerating = false;
        }, 3000);
    }

    createProjectCard(type, prompt) {
        const card = document.createElement('div');
        card.className = `project-card type-${type.toLowerCase()}`;

        let decor = '';
        let icon = '';

        // Custom Decor based on type
        if (type === 'HTML') {
            decor = '<div class="decor-shape square"></div><div class="decor-shape circle"></div>';
            icon = '<span class="project-icon">🌐</span>';
        } else if (type === 'Android') {
            decor = '<div class="decor-lines"></div><div class="decor-dots"></div>';
            icon = '<span class="project-icon">🤖</span>';
        } else {
            decor = '<div class="decor-bolt">⚡</div>';
            icon = '<span class="project-icon">📜</span>';
        }

        card.innerHTML = `
            <div class="card-bg-decor">${decor}</div>
            <div class="card-content">
                ${icon}
                <div class="card-info">
                    <h3>${type} Project</h3>
                    <p>${prompt}</p>
                </div>
                <div class="card-actions">
                    <button class="menu-dots">⋮</button>
                </div>
            </div>
        `;

        // Click to Open Preview
        card.addEventListener('click', () => {
            // Trigger Open Logic (can use existing logic in main.js via custom event or callback)
            const event = new CustomEvent('open-project', { detail: { type, prompt } });
            window.dispatchEvent(event);
        });

        return card;
    }
}
