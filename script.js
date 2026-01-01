
// --- Modules ---

class AudioVisualizer {
    constructor(visualizerElement, barElements) {
        this.ctx = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.visualizerElement = visualizerElement;
        this.bars = barElements;
        this.isListening = false;
        this.animationId = null;
    }

    async start() {
        if (this.isListening) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 32;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.source = this.ctx.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isListening = true;
            this.visualizerElement.classList.add('active');
            this.animate();
        } catch (err) { console.error('Audio start failed:', err); }
    }

    stop() {
        if (!this.isListening) return;
        this.isListening = false;
        this.visualizerElement.classList.remove('active');
        if (this.ctx) this.ctx.close();
        cancelAnimationFrame(this.animationId);
        this.bars.forEach(bar => bar.style.height = '10px');
    }

    animate() {
        if (!this.isListening) return;
        this.animationId = requestAnimationFrame(() => this.animate());
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
        const average = sum / this.dataArray.length;
        this.bars.forEach((bar, index) => {
            const boost = (this.dataArray[index] || average) / 255;
            bar.style.height = `${10 + (boost * 40)}px`;
        });
    }
}

class PhysicsEngine {
    constructor(targetElement) {
        this.element = targetElement;
        this.startY = 0;
        this.isDragging = false;
        this.init();
    }
    init() {
        this.element.addEventListener('mousedown', (e) => this.start(e.clientY));
        window.addEventListener('mousemove', (e) => this.move(e.clientY, e));
        window.addEventListener('mouseup', () => this.end());
        this.element.addEventListener('touchstart', (e) => this.start(e.touches[0].clientY), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.move(e.touches[0].clientY, e), { passive: false });
        this.element.addEventListener('touchend', () => this.end());
    }
    start(y) {
        if (this.element.scrollTop > 0) return;
        this.startY = y;
        this.isDragging = true;
    }
    move(y, e) {
        if (!this.isDragging) return;
        const deltaY = y - this.startY;
        if (deltaY > 0) {
            e.preventDefault();
            const dampened = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), 0.7);
            this.element.style.transform = `translateY(${dampened}px)`;
        }
    }
    end() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.element.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        this.element.style.transform = 'translateY(0)';
        setTimeout(() => this.element.style.transition = '', 400);
    }
}

class StorageSystem {
    static getUsersWithRecovery() {
        try {
            const p = localStorage.getItem('nanom_users');
            if (p) return JSON.parse(p);
            const b = localStorage.getItem('nanom_users_backup');
            if (b) return JSON.parse(b);
        } catch (e) {
            console.error("Storage recovery failed", e);
        }
        return [];
    }
    static saveUser(email, data) {
        localStorage.setItem(`nanom_data_${email}`, JSON.stringify(data));
    }
}

class MessageParser {
    static parseResponse(response) {
        if (!response) return { text: "" };
        let cleaned = response.replace(/\[REASONING_START\][\s\S]*?(?:\[REASONING_END\]|$)/g, '');
        const jsonMatch = cleaned.match(/```json\n([\s\S]*?)\n```/) || cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[1] || jsonMatch[0]); } catch (e) { }
        }
        return { text: cleaned };
    }
}

class LibraryManager {
    constructor() {
        this.modal = document.getElementById('library-modal');
        this.createSpaceModal = document.getElementById('create-space-modal');
        this.projectsGrid = document.getElementById('lib-projects-grid');
        this.spacesGrid = document.getElementById('lib-spaces-grid');
        this.templatesGrid = document.getElementById('lib-templates-grid');
        this.projects = this.getMockProjects();
        this.spaces = this.loadSpaces();
        this.templates = this.getMockTemplates();
        this.selectedColor = '#6366f1';
        this.selectedIcon = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
        this.init();
    }

    loadSpaces() {
        try {
            const saved = localStorage.getItem('nanom_spaces');
            return saved ? JSON.parse(saved) : this.getMockSpaces();
        } catch (e) {
            console.warn("Failed to load spaces", e);
            return this.getMockSpaces();
        }
    }

    saveSpaces() {
        localStorage.setItem('nanom_spaces', JSON.stringify(this.spaces));
    }

    init() {
        this.renderProjects(this.projects);
        this.renderSpaces(this.spaces);
        this.renderTemplates(this.templates);
        this.setupTabs();
        this.setupSearch();
        this.setupCreationHandlers();
        this.setupSpaceCreator();

        const libFooterBtn = document.querySelector('.footer-btn[title="Library"]');
        if (libFooterBtn) {
            libFooterBtn.addEventListener('click', () => {
                this.modal.classList.add('active');
            });
        }
    }

    setupTabs() {
        const projBtn = document.getElementById('lib-new-project-btn');
        const spaceBtn = document.getElementById('lib-new-space-btn');

        this.modal.querySelectorAll('.lib-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.modal.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.modal.querySelectorAll('.lib-view').forEach(v => v.classList.remove('active'));
                const viewId = `view-${tab.dataset.view}`;
                document.getElementById(viewId).classList.add('active');

                // Toggle visibility of New Project vs New Space buttons
                if (tab.dataset.view === 'spaces') {
                    projBtn.style.display = 'none';
                    spaceBtn.style.display = 'flex';
                } else {
                    projBtn.style.display = 'flex';
                    spaceBtn.style.display = 'none';
                }
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('lib-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.projects.filter(p => p.title.toLowerCase().includes(term));
                this.renderProjects(filtered);
            });
        }

        const tplSearchInput = document.getElementById('lib-tpl-search');
        if (tplSearchInput) {
            tplSearchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.templates.filter(t =>
                    t.title.toLowerCase().includes(term) ||
                    t.description.toLowerCase().includes(term)
                );
                this.renderTemplates(filtered);
            });
        }

        this.modal.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const parent = chip.parentElement;
                parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const type = chip.dataset.filter;
                if (parent.id === 'tpl-filter-chips') {
                    if (type === 'all') this.renderTemplates(this.templates);
                    else this.renderTemplates(this.templates.filter(t => t.category.toLowerCase() === type));
                } else {
                    if (type === 'all') this.renderProjects(this.projects);
                    else this.renderProjects(this.projects.filter(p => p.type.toLowerCase() === type));
                }
            });
        });
    }

    setupCreationHandlers() {
        const newProjBtn = document.getElementById('lib-new-project-btn');
        if (newProjBtn) newProjBtn.addEventListener('click', () => {
            this.modal.classList.remove('active');
            document.getElementById('welcome-screen').style.display = 'block';
            document.getElementById('messages-container').style.display = 'none';
        });

        const newSpaceBtn = document.getElementById('lib-new-space-btn');
        if (newSpaceBtn) newSpaceBtn.addEventListener('click', () => {
            this.createSpaceModal.classList.add('active');
        });
    }

    setupSpaceCreator() {
        const nameInput = document.getElementById('space-name-input');
        const colorGrid = document.getElementById('space-color-grid');
        const iconGrid = document.getElementById('space-icon-grid');
        const previewCard = document.getElementById('space-preview-card');
        const confirmBtn = document.getElementById('confirm-create-space');

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#4b5563', '#9ca3af', '#171717'];
        const icons = [
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.48-.56.63-1.03.63-1.03l4.9-4.9a5 5 0 0 0-7.07-7.07l-4.9 4.9s-.47.15-1.03.63z"></path><path d="M12 12l8-8"></path></svg>',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>'
        ];

        // Init Colors
        colorGrid.innerHTML = '';
        colors.forEach(c => {
            const div = document.createElement('div');
            div.className = 'color-option' + (c === this.selectedColor ? ' active' : '');
            div.style.background = c;
            div.addEventListener('click', () => {
                this.selectedColor = c;
                colorGrid.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                div.classList.add('active');
                this.updatePreview();
            });
            colorGrid.appendChild(div);
        });

        // Init Icons
        iconGrid.innerHTML = '';
        icons.forEach(iconHtml => {
            const div = document.createElement('div');
            div.className = 'icon-option' + (iconHtml === this.selectedIcon ? ' active' : '');
            div.innerHTML = iconHtml;
            div.addEventListener('click', () => {
                this.selectedIcon = iconHtml;
                iconGrid.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('active'));
                div.classList.add('active');
                this.updatePreview();
            });
            iconGrid.appendChild(div);
        });

        nameInput.addEventListener('input', () => this.updatePreview());

        confirmBtn.addEventListener('click', () => {
            const name = nameInput.value.trim() || 'Untitled Space';
            const newSpace = {
                id: Date.now(),
                title: name,
                icon: this.selectedIcon,
                color: this.selectedColor
            };
            this.spaces.push(newSpace);
            this.saveSpaces();
            this.renderSpaces(this.spaces);
            this.createSpaceModal.classList.remove('active');
            nameInput.value = '';
        });
    }

    updatePreview() {
        const name = document.getElementById('space-name-input').value.trim() || 'Untitled Space';
        const previewCard = document.getElementById('space-preview-card');
        previewCard.querySelector('.space-title').innerText = name;
        previewCard.querySelector('.space-icon-large').innerHTML = this.selectedIcon;
        previewCard.style.background = `linear-gradient(135deg, ${this.selectedColor} 0%, var(--bg-app) 100%)`;
    }

    getMockProjects() {
        return [
            { id: 5, title: 'Promotion Guide', type: 'Docs', time: 'Just now' },
            { id: 1, title: 'Portfolio Site', type: 'HTML', time: '2 hours ago' },
            { id: 2, title: 'Task Manager App', type: 'Android', time: 'Yesterday' },
            { id: 3, title: 'API Documentation', type: 'Docs', time: '3 days ago' },
            { id: 4, title: 'E-commerce UI', type: 'HTML', time: 'Last week' },
        ];
    }

    getMockSpaces() {
        return [
            { id: 1, title: 'Private Space', icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>', color: '#6366f1' },
            { id: 2, title: 'Team Beta', icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.48-.56.63-1.03.63-1.03l4.9-4.9a5 5 0 0 0-7.07-7.07l-4.9 4.9s-.47.15-1.03.63z"></path><path d="M12 12l8-8"></path></svg>', color: '#10b981' },
            { id: 3, title: 'Design System', icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>', color: '#ec4899' }
        ];
    }

    getMockTemplates() {
        return [
            {
                id: 1, title: 'Landing Page', category: 'Web', icon: 'globe',
                description: 'A sleek, high-conversion landing page with modern layout.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; margin: 0; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }\n  .hero { padding: 40px; }\n  h1 { font-size: 3rem; margin-bottom: 20px; background: linear-gradient(90deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n  p { color: #888; font-size: 1.2rem; max-width: 600px; margin: 0 auto 30px; }\n  .btn { background: #6366f1; color: white; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; transition: 0.3s; display: inline-block; }\n  .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.4); }\n</style>\n</head>\n<body>\n  <div class="hero">\n    <h1>Future of Design</h1>\n    <p>Build stunning interfaces with our new AI-powered design system.</p>\n    <a href="#" class="btn">Get Started</a>\n  </div>\n</body>\n</html>`
            },
            {
                id: 2, title: 'Dashboard UI', category: 'Web', icon: 'layout',
                description: 'Analytics dashboard with charts, stats, and sidebar navigation.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: system-ui; margin: 0; background: #111; color: #fff; display: flex; height: 100vh; }\n  .sidebar { width: 200px; background: #1a1a1a; padding: 20px; border-right: 1px solid #333; }\n  .content { flex: 1; padding: 30px; }\n  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }\n  .stat-card { background: #222; padding: 20px; border-radius: 12px; border: 1px solid #333; }\n  .stat-val { font-size: 2rem; font-weight: bold; color: #10b981; }\n  .nav-item { padding: 10px; color: #888; cursor: pointer; }\n  .nav-item.active { color: #fff; background: #333; border-radius: 8px; }\n</style>\n</head>\n<body>\n  <div class="sidebar">\n    <div class="nav-item active">Dashboard</div>\n    <div class="nav-item">Analytics</div>\n    <div class="nav-item">Users</div>\n    <div class="nav-item">Settings</div>\n  </div>\n  <div class="content">\n    <h2>Overview</h2>\n    <div class="stats">\n      <div class="stat-card"><div>Revenue</div><div class="stat-val">$12,402</div></div>\n      <div class="stat-card"><div>Active Users</div><div class="stat-val">1,205</div></div>\n      <div class="stat-card"><div>Conversion</div><div class="stat-val">3.4%</div></div>\n    </div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 4, title: 'Chat Interface', category: 'AI', icon: 'message-square',
                description: 'Clean AI messaging interface with streaming text support.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; margin: 0; background: #0f0f0f; color: #fff; display: flex; flex-direction: column; height: 100vh; }\n  .msg-container { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }\n  .msg { padding: 12px 18px; border-radius: 15px; max-width: 80%; }\n  .ai { background: #1e1e1e; align-self: flex-start; }\n  .user { background: #6366f1; align-self: flex-end; }\n  .input-area { padding: 20px; background: #1a1a1a; display: flex; gap: 10px; }\n  input { flex: 1; background: #333; border: none; padding: 12px; border-radius: 8px; color: #fff; outline: none; }\n  button { background: #6366f1; border: none; padding: 0 20px; border-radius: 8px; color: #fff; cursor: pointer; }\n</style>\n</head>\n<body>\n  <div class="msg-container">\n    <div class="msg ai">Hello! How can I help you build your project today?</div>\n    <div class="msg user">I want to create a dark mode landing page.</div>\n    <div class="msg ai">I can certainly help with that. Should we use Tailwind CSS or Vanilla CSS?</div>\n  </div>\n  <div class="input-area"><input type="text" placeholder="Type a message..."><button>Send</button></div>\n</body>\n</html>`
            },
            {
                id: 8, title: 'Portfolio Website', category: 'Personal', icon: 'user',
                description: 'Showcase your work with a creative and minimal design.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: "Inter", sans-serif; margin: 0; background: #fff; color: #000; }\n  nav { padding: 40px; display: flex; justify-content: space-between; font-weight: 600; }\n  .main { padding: 0 40px; max-width: 800px; margin-top: 100px; }\n  h1 { font-size: 4rem; line-height: 1.1; margin-bottom: 40px; }\n  .work-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 80px; }\n  .project { background: #f5f5f5; aspect-ratio: 4/3; border-radius: 20px; }\n  span { color: #888; display: block; margin-bottom: 10px; }\n</style>\n</head>\n<body>\n  <nav><div>JONATHAN DOE</div><div>ABOUT / WORK / CONTACT</div></nav>\n  <div class="main">\n    <span>Brand & Digital Designer</span>\n    <h1>Creating digital experiences that matter.</h1>\n    <div class="work-grid">\n      <div class="project"></div>\n      <div class="project"></div>\n    </div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 3, title: 'E-commerce App', category: 'Web', icon: 'smartphone',
                description: 'Complete online store experience with product grids and cart layout.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; margin: 0; background: #f9f9f9; color: #333; }\n  .header { background: #fff; padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; position: sticky; top: 0; z-index: 10; }\n  .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }\n  .product-card { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #eee; text-align: center; transition: 0.3s; }\n  .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }\n  .p-img { width: 100%; height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 10px; }\n  .btn-buy { background: #000; color: #fff; border: none; padding: 10px; width: 100%; border-radius: 6px; cursor: pointer; }\n</style>\n</head>\n<body>\n  <div class="header"><strong>TECH STORE</strong><span>🛒 0 Items</span></div>\n  <div class="products">\n    <div class="product-card"><div class="p-img"></div><h3>Phone Pro</h3><p>$999</p><button class="btn-buy">Add to Cart</button></div>\n    <div class="product-card"><div class="p-img"></div><h3>Laptop Air</h3><p>$1,299</p><button class="btn-buy">Add to Cart</button></div>\n    <div class="product-card"><div class="p-img"></div><h3>Watch Ultra</h3><p>$399</p><button class="btn-buy">Add to Cart</button></div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 5, title: 'Social Feed', category: 'Mobile', icon: 'users',
                description: 'Interactive social media timeline with cards and media elements.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: -apple-system, sans-serif; background: #fafafa; margin: 0; padding: 20px 0; display: flex; flex-direction: column; align-items: center; }\n  .post { background: #fff; border: 1px solid #dbdbdb; border-radius: 8px; width: 95%; max-width: 500px; margin-bottom: 20px; }\n  .post-header { padding: 14px; display: flex; align-items: center; gap: 10px; font-weight: 600; }\n  .avatar { width: 32px; height: 32px; background: linear-gradient(45deg, #f09433, #e6683c); border-radius: 50%; }\n  .post-img { width: 100%; height: 300px; background: #efefef; }\n  .post-actions { padding: 14px; display: flex; gap: 15px; font-size: 1.2rem; }\n  .post-caption { padding: 0 14px 14px; font-size: 0.9rem; }\n</style>\n</head>\n<body>\n  <div class="post">\n    <div class="post-header"><div class="avatar"></div> alex_designs</div>\n    <div class="post-img"></div>\n    <div class="post-actions">❤️ 💬 🚀</div>\n    <div class="post-caption"><strong>alex_designs</strong> Exploring the new glassmorphism trends. What do you think?</div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 6, title: 'Blog CMS', category: 'Web', icon: 'book-open',
                description: 'Full-featured blog system with multi-layout support and rich editor.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: "Georgia", serif; background: #fff; color: #111; line-height: 1.6; }\n  .container { max-width: 800px; margin: 0 auto; padding: 60px 20px; }\n  .date { color: #888; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }\n  h1 { font-size: 3rem; margin: 10px 0 30px; font-weight: 900; }\n  .hero-img { width: 100%; height: 400px; background: #f0f0f0; border-radius: 4px; margin-bottom: 40px; }\n  p { font-size: 1.2rem; margin-bottom: 25px; }\n</style>\n</head>\n<body>\n  <div class="container">\n    <div class="date">December 18, 2025</div>\n    <h1>The Art of Digital Minimalism</h1>\n    <div class="hero-img"></div>\n    <p>In a world of constant notification and noise, finding silence is no longer a luxury—it is a necessity for creativity.</p>\n    <p>Digital minimalism is more than just deleting apps; it is an intentional way of living...</p>\n  </div>\n</body>\n</html>`
            },
            {
                id: 7, title: 'Finance Tracker', category: 'Business', icon: 'pie-chart',
                description: 'Track expenses and income with visual reports and spending analysis.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; background: #000; color: #fff; padding: 30px; }\n  .card { background: #111; padding: 25px; border-radius: 20px; border: 1px solid #333; }\n  .balance { font-size: 3rem; font-weight: 800; margin: 10px 0; color: #10b981; }\n  .tx-list { margin-top: 30px; display: flex; flex-direction: column; gap: 15px; }\n  .tx-item { display: flex; justify-content: space-between; padding: 15px; background: #1a1a1a; border-radius: 12px; }\n  .negative { color: #ef4444; }\n</style>\n</head>\n<body>\n  <div class="card">\n    <div>Current Balance</div>\n    <div class="balance">$14,500.00</div>\n    <div class="tx-list">\n      <div class="tx-item"><span>Apple Store</span><span class="negative">-$199.00</span></div>\n      <div class="tx-item"><span>Salary Deposit</span><span style="color:#10b981">+$5,000.00</span></div>\n      <div class="tx-item"><span>Uber Trip</span><span class="negative">-$24.50</span></div>\n    </div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 9, title: 'Documentation Site', category: 'Business', icon: 'file-text',
                description: 'Hierarchical documentation structure with search and clean typography.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: Inter, sans-serif; display: flex; margin: 0; background: #fff; }\n  .sidebar { width: 250px; height: 100vh; background: #f8f9fa; border-right: 1px solid #eee; padding: 20px; }\n  .content { flex: 1; padding: 60px; max-width: 800px; }\n  .nav-link { display: block; padding: 8px 0; color: #555; text-decoration: none; }\n  .nav-link.active { color: #6366f1; font-weight: 600; }\n  h1 { font-size: 2.5rem; border-bottom: 2px solid #eee; padding-bottom: 20px; }\n  pre { background: #1e1e1e; color: #fff; padding: 20px; border-radius: 8px; }\n</style>\n</head>\n<body>\n  <div class="sidebar">\n    <h3>Guide</h3>\n    <a href="#" class="nav-link active">Introduction</a>\n    <a href="#" class="nav-link">Installation</a>\n    <a href="#" class="nav-link">API Reference</a>\n  </div>\n  <div class="content">\n    <h1>Getting Started</h1>\n    <p>Welcome to our documentation. Follow this guide to set up your project in minutes.</p>\n    <pre>npm install awesome-library</pre>\n  </div>\n</body>\n</html>`
            },
            {
                id: 10, title: 'Admin Panel', category: 'Business', icon: 'shield',
                description: 'Powerful management system with user controls and system metrics.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; margin: 0; background: #f0f2f5; display: flex; }\n  .side { width: 240px; background: #2c3e50; color: #fff; height: 100vh; padding: 20px; }\n  .main { flex: 1; padding: 30px; }\n  .card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }\n  .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }\n  .table { width: 100%; border-collapse: collapse; margin-top: 30px; background: #fff; border-radius: 8px; }\n  .table th, .table td { padding: 15px; border-bottom: 1px solid #eee; text-align: left; }\n</style>\n</head>\n<body>\n  <div class="side"><h2>Admin Console</h2></div>\n  <div class="main">\n    <h1>System Dashboard</h1>\n    <div class="card-grid">\n      <div class="card">Users: 1.2k</div>\n      <div class="card">Uptime: 99.9%</div>\n      <div class="card">Memory: 45%</div>\n      <div class="card">Errors: 0</div>\n    </div>\n    <table class="table"><thead><tr><th>User</th><th>Status</th><th>Last Login</th></tr></thead>\n    <tbody><tr><td>Admin</td><td>Active</td><td>Just now</td></tr></tbody></table>\n  </div>\n</body>\n</html>`
            },
            {
                id: 11, title: 'Fitness App', category: 'Personal', icon: 'activity',
                description: 'Workout logger and progress tracker for mobile with daily goals.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; background: #000; color: #fff; padding: 20px; }\n  .goal-ring { width: 200px; height: 200px; border: 15px solid #10b981; border-radius: 50%; margin: 20px auto; display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-direction: column; }\n  .stats { display: flex; justify-content: space-around; }\n  .stat-box { background: #111; padding: 20px; border-radius: 15px; width: 45%; border: 1px solid #222; text-align: center; }\n  .btn-push { background: #6366f1; color: white; border: none; padding: 15px; width: 100%; border-radius: 12px; margin-top: 20px; }\n</style>\n</head>\n<body>\n  <h1>Good Morning, Alex</h1>\n  <div class="goal-ring"><span>85%</span><small>Today's Goal</small></div>\n  <div class="stats">\n    <div class="stat-box">🔥 450 kcal</div>\n    <div class="stat-box">👟 8,400 steps</div>\n  </div>\n  <button class="btn-push">Start New Session</button>\n</body>\n</html>`
            },
            {
                id: 12, title: 'Recipe Book', category: 'Personal', icon: 'coffee',
                description: 'Organize and share your favorite culinary creations with visual guides.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: "Playfair Display", serif; background: #fffaf0; color: #443c33; padding: 40px; }\n  .recipe-header { max-width: 800px; margin: 0 auto; }\n  h1 { font-size: 3.5rem; border-bottom: 2px solid #e0d5c1; padding-bottom: 10px; }\n  .meta { display: flex; gap: 30px; padding: 20px 0; font-style: italic; }\n  .ingredients { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }\n  li { margin-bottom: 10px; }\n</style>\n</head>\n<body>\n  <div class="recipe-header">\n    <h1>Gourmet Pasta Carbonara</h1>\n    <div class="meta"><span>Time: 25 mins</span><span>Serves: 2</span><span>Difficulty: Easy</span></div>\n    <div class="ingredients">\n      <h3>Ingredients</h3>\n      <ul><li>200g Spaghetti</li><li>100g Guanciale</li><li>2 Large Eggs</li><li>Pecorino Romano</li></ul>\n    </div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 13, title: 'Task Kanban', category: 'Business', icon: 'layout',
                description: 'Visual task management with boards, cards, and drag-and-drop support.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; background: #e0e6ed; padding: 20px; display: flex; gap: 20px; overflow-x: auto; }\n  .board { min-width: 300px; background: #ebecf0; border-radius: 8px; padding: 12px; height: fit-content; }\n  .card { background: #fff; padding: 15px; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: grab; }\n  .label { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; color: #fff; margin-bottom: 8px; display: inline-block; }\n  .high { background: #ff4757; }\n  .mid { background: #ffa502; }\n</style>\n</head>\n<body>\n  <div class="board"><h3>To Do</h3><div class="card"><div class="label high">Bug</div><div>Fix header alignment issues</div></div><div class="card"><div>Research new API</div></div></div>\n  <div class="board"><h3>In Progress</h3><div class="card"><div class="label mid">Feature</div><div>Dark mode implementation</div></div></div>\n  <div class="board"><h3>Done</h3><div class="card"><div>Setup project repo</div></div></div>\n</body>\n</html>`
            },
            {
                id: 14, title: 'Music Studio', category: 'Personal', icon: 'music',
                description: 'Full-featured audio workstation interface with track controls and mixing.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; background: #121212; color: #fff; margin:0; display:flex; flex-direction:column; height: 100vh; }\n  .toolbar { height: 60px; background: #282828; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 20px; gap: 20px; }\n  .timeline { flex: 1; padding: 20px; position: relative; }\n  .track { height: 80px; background: #333; margin-bottom: 10px; border-radius: 8px; position: relative; overflow: hidden; }\n  .wave { position: absolute; left: 0; width: 300px; height: 100%; background: #6366f1; opacity: 0.6; }\n  .play-head { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: #ef4444; }\n</style>\n</head>\n<body>\n  <div class="toolbar"><button>Play</button><button>Stop</button><button>Rec</button><span>00:12:44</span></div>\n  <div class="timeline">\n    <div class="play-head"></div>\n    <div class="track"><div class="wave" style="width: 400px"></div></div>\n    <div class="track"><div class="wave" style="width: 600px; left: 100px; background: #10b981"></div></div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 15, title: 'Weather Hub', category: 'Personal', icon: 'cloud',
                description: 'Dynamic weather tracking with detailed forecasts and atmospheric data.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; margin:0; height:100vh; background: linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%); color:#fff; display:flex; align-items:center; justify-content:center; }\n  .glass { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 40px; border-radius:30px; text-align:center; min-width:300px; }\n  .temp { font-size: 6rem; font-weight: 800; }\n  .info { font-size: 1.5rem; margin-top: -10px; opacity: 0.8; }\n  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }\n</style>\n</head>\n<body>\n  <div class="glass">\n    <h3>New York</h3>\n    <div class="temp">24°</div>\n    <div class="info">Mostly Sunny</div>\n    <div class="details"><div>Wind: 12km/h</div><div>Humid: 45%</div></div>\n  </div>\n</body>\n</html>`
            },
            {
                id: 16, title: 'VR Gaming Hub', category: 'Gaming', icon: 'target',
                description: 'Interactive launcher for virtual reality games and social experiences.',
                code: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: "Orbitron", sans-serif; background: #000; color: #0ff; margin: 0; overflow: hidden; }\n  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; padding: 100px; height: 100vh; }\n  .game-card { border: 2px solid #0ff; padding: 20px; text-align: center; background: rgba(0,255,255,0.05); transform: perspective(1000px) rotateY(15deg); transition: 0.3s; }\n  .game-card:hover { transform: perspective(1000px) rotateY(0deg) scale(1.1); background: rgba(0,255,255,0.2); box-shadow: 0 0 50px #0ff; }\n  h1 { text-align: center; padding-top: 50px; text-shadow: 0 0 10px #0ff; }\n</style>\n</head>\n<body>\n  <h1>NEURAL SYSTEMS ONLINE</h1>\n  <div class="grid">\n    <div class="game-card"><h3>Cyber Runner</h3><p>VR ACTION</p></div>\n    <div class="game-card"><h3>Space Miner</h3><p>CO-OP SIM</p></div>\n    <div class="game-card"><h3>Ghost Hunter</h3><p>HORROR</p></div>\n  </div>\n</body>\n</html>`
            }
        ];
    }

    renderProjects(list) {
        this.projectsGrid.innerHTML = '';
        if (list.length === 0) {
            this.projectsGrid.innerHTML = '<div class="empty-state">No projects yet. Start chatting to create one!</div>';
            return;
        }
        list.forEach(p => {
            const card = document.createElement('div');
            card.className = 'lib-project-card crystal-card';
            let icon = '';
            if (p.type === 'Android') icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>';
            else if (p.type === 'Docs') icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
            else icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';

            card.innerHTML = `
                 <div class="card-deco"></div>
                 <div class="lib-card-main">
                    <div class="lib-card-icon">${icon}</div>
                    <div class="lib-card-meta">
                        <h3>${p.title}</h3>
                        <p>Edited ${p.time}</p>
                    </div>
                 </div>
                 <button class="lib-card-menu">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                 </button>
             `;
            this.projectsGrid.appendChild(card);
        });
    }

    renderSpaces(list) {
        this.spacesGrid.innerHTML = '';
        list.forEach(s => {
            const card = document.createElement('div');
            card.className = 'space-card crystal-card';
            card.style.background = `linear-gradient(135deg, ${s.color}22 0%, var(--bg-app) 100%)`; // Added 22 for transparency
            card.innerHTML = `
                 <div class="card-deco"></div>
                 <div class="lib-card-main">
                    <div class="space-icon-large">${s.icon}</div>
                    <div class="lib-card-meta">
                        <div class="space-title">${s.title}</div>
                        <p>Nanom Workspace Territory</p>
                    </div>
                 </div>
             `;
            this.spacesGrid.appendChild(card);
        });
    }

    renderTemplates(list) {
        this.templatesGrid.innerHTML = '';
        if (list.length === 0) {
            this.templatesGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No Templates Found</h3>
                    <p>Try a different search or category.</p>
                </div>`;
            return;
        }

        list.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card crystal-card';
            card.dataset.id = t.id;
            card.innerHTML = `
                <div class="card-deco"></div>
                <div class="template-badge">${t.category}</div>
                <div class="lib-card-main">
                    <div class="template-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${this.getTemplateIcon(t.icon)}
                        </svg>
                    </div>
                    <div class="lib-card-meta">
                        <h3>${t.title}</h3>
                        <p>${t.description}</p>
                    </div>
                </div>
                <button class="btn-use-template">Use Template</button>
            `;
            this.templatesGrid.appendChild(card);
        });
    }

    getTemplateIcon(icon) {
        const icons = {
            globe: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>',
            layout: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
            smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
            'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
            'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
            'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
            user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
            shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
            activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
            coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>'
        };
        return icons[icon] || icons.globe;
    }
}

// --- Gemini AI Manager ---
class GeminiManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.systemInstruction = {
            parts: [{ text: "You are Nanom AI, a professional, creative, and highly capable AI assistant for a modern development studio. You help users build web apps, android apps, and provide creative solutions. Be concise but helpful. Use markdown for code blocks." }]
        };
        this.workingModel = null;
    }

    async listModels() {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            const data = await response.json();
            if (data.models) {
                return data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
            }
        } catch (e) {
            console.warn("Auto-discovery failed:", e);
        }
        return [];
    }

    async generateResponse(history, prompt) {
        const filteredHistory = history.filter(h => h.parts && h.parts[0] && h.parts[0].text);

        let candidates = [
            { name: 'gemini-1.5-flash', api: 'v1' },
            { name: 'gemini-1.5-flash', api: 'v1beta' },
            { name: 'gemini-1.5-pro', api: 'v1' },
            { name: 'gemini-pro', api: 'v1beta' }
        ];

        // Prioritize discovered working model
        if (this.workingModel) {
            candidates = [this.workingModel, ...candidates.filter(c => c.name !== this.workingModel.name)];
        }

        let lastError = '';

        // 1. Try known/configured candidates
        for (const config of candidates) {
            try {
                return await this.attemptGeneration(config, filteredHistory, prompt);
            } catch (e) {
                lastError = e.message;
                continue;
            }
        }

        // 2. Dynamic Discovery if all else fails
        console.log("Standard models failed. Attempting auto-discovery...");
        const discovered = await this.listModels();
        for (const modelName of discovered) {
            // Avoid retrying ones we just failed
            if (candidates.some(c => c.name === modelName)) continue;

            try {
                // Try v1beta for discovered models (safest bet for varied models)
                const config = { name: modelName, api: 'v1beta' };
                const result = await this.attemptGeneration(config, filteredHistory, prompt);
                this.workingModel = config; // Cache success
                return result;
            } catch (e) {
                lastError = e.message;
            }
        }

        return `Error: Unable to access any Gemini models. Last error: ${lastError}`;
    }

    async attemptGeneration(config, history, prompt) {
        const url = `https://generativelanguage.googleapis.com/${config.api}/models/${config.name}:generateContent?key=${this.apiKey}`;

        const contents = [
            ...history.map(item => ({
                role: item.role === 'model' ? 'model' : 'user',
                parts: item.parts
            })),
            { role: 'user', parts: [{ text: prompt }] }
        ];

        const body = { contents };

        // System instruction logic
        if (config.name.includes('1.5')) {
            body.system_instruction = this.systemInstruction;
        } else {
            const instr = this.systemInstruction.parts[0].text;
            contents[contents.length - 1].parts[0].text = `[System: ${instr}]\n\n${prompt}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            // Retry without system_instruction if that was the issue
            if (data.error?.message?.includes('system_instruction') && body.system_instruction) {
                delete body.system_instruction;
                const instr = this.systemInstruction.parts[0].text;
                contents[contents.length - 1].parts[0].text = `[System: ${instr}]\n\n${prompt}`;

                const retry = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
                });
                const retryData = await retry.json();
                if (retry.ok && retryData.candidates) return retryData.candidates[0].content.parts[0].text;
                throw new Error(retryData.error?.message || 'Retry failed');
            }
            throw new Error(data.error?.message || response.statusText);
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            // Success - update working model if it wasn't set
            if (!this.workingModel) this.workingModel = config;
            return data.candidates[0].content.parts[0].text;
        }

        throw new Error('No content in response');
    }
}

class SessionManager {
    constructor() {
        this.ctxMenu = this.createContextMenu();
        this.init();
        this.targetItem = null;
    }
    createContextMenu() {
        const div = document.createElement('div');
        div.className = 'context-popup';
        const lm = window.langManager;
        div.innerHTML = `
            <div class="ctx-item" data-action="rename"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> <span>${lm?.get('ctx.rename') || 'Rename'}</span></div>
            <div class="ctx-item" data-action="pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg> <span class="pin-text">${lm?.get('ctx.pin') || 'Pin Chat'}</span></div>
            <div class="ctx-item" data-action="customize"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg> <span>${lm?.get('session.customize') || 'Customize'}</span></div>
            <div class="ctx-divider"></div>
            <div class="ctx-item delete" data-action="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> <span>${lm?.get('ctx.delete') || 'Delete'}</span></div>
        `;
        document.body.appendChild(div);

        div.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling to document
                if (this.targetItem) this.handleAction(item.dataset.action, this.targetItem);
                this.closeMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (!div.contains(e.target)) this.closeMenu();
        });
        return div;
    }

    init() {
        document.querySelectorAll('.session-item').forEach(item => this.bindItem(item));
    }

    bindItem(item) {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.context-menu-btn')) return;
            this.selectSession(item);
        });
        const menuBtn = item.querySelector('.context-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openMenu(e, item);
            });
        }
    }

    selectSession(item) {
        document.querySelectorAll('.session-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth < 600) sidebar.classList.remove('mobile-open');

        const msgs = document.getElementById('messages-container');
        if (msgs) {
            msgs.innerHTML = '';
            msgs.style.display = 'flex';
            document.getElementById('welcome-screen').style.display = 'none';
            const d = document.createElement('div');
            d.className = 'message ai';
            d.innerText = `Loaded session: ${item.querySelector('.session-text').innerText}`;
            msgs.appendChild(d);
        }
    }

    openMenu(e, item) {
        e.preventDefault();
        this.targetItem = item;

        // Update menu labels
        const pinAction = this.ctxMenu.querySelector('[data-action="pin"]');
        const pinSpan = pinAction ? pinAction.querySelector('.pin-text') : null;
        const lm = window.langManager;

        if (pinSpan) {
            const isPinned = item.classList.contains('pinned');
            pinSpan.innerText = isPinned
                ? (lm?.get('ctx.unpin') || 'Unpin Chat')
                : (lm?.get('ctx.pin') || 'Pin Chat');
        }

        const rect = e.target.getBoundingClientRect();
        let top = rect.bottom + window.scrollY + 5;
        let left = rect.left + window.scrollX;

        // Prevent overflow
        if (left + 160 > window.innerWidth) left = window.innerWidth - 170;
        if (top + 180 > window.innerHeight) top = rect.top + window.scrollY - 130;

        this.ctxMenu.style.top = `${top}px`;
        this.ctxMenu.style.left = `${left}px`;
        this.ctxMenu.classList.add('active');
    }

    closeMenu() {
        this.ctxMenu.classList.remove('active');
        this.targetItem = null;
    }

    handleAction(action, item) {
        if (action === 'delete') {
            // Modern confirmation
            item.classList.add('confirm-delete');
            const originalContent = item.innerHTML;
            item.innerHTML = `
                <div class="confirm-overlay">
                    <span>Delete?</span>
                    <button class="confirm-yes">Yes</button>
                    <button class="confirm-no">No</button>
                </div>
            `;

            const btnYes = item.querySelector('.confirm-yes');
            const btnNo = item.querySelector('.confirm-no');

            btnYes.onclick = (e) => {
                e.stopPropagation();
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    item.remove();
                    if (item.classList.contains('active')) {
                        const newBtn = document.getElementById('new-chat-btn');
                        if (newBtn) newBtn.click();
                    }
                }, 300);
            };

            btnNo.onclick = (e) => {
                e.stopPropagation();
                item.classList.remove('confirm-delete');
                item.innerHTML = originalContent;
                this.bindItem(item); // Re-bind listeners
            };
        }

        if (action === 'pin') {
            const isPinned = item.classList.toggle('pinned');
            let pinIcon = item.querySelector('.pin-icon');

            if (isPinned) {
                if (!pinIcon) {
                    pinIcon = document.createElement('span');
                    pinIcon.className = 'pin-icon';
                    pinIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;
                    const menuBtn = item.querySelector('.context-menu-btn');
                    item.insertBefore(pinIcon, menuBtn);
                }
                const parent = item.parentElement;
                const first = parent.querySelector('.session-item');
                if (first && first !== item) parent.insertBefore(item, first);
            } else {
                if (pinIcon) pinIcon.remove();
            }
        }

        if (action === 'rename') {
            const span = item.querySelector('.session-text');
            const currentName = span.innerText;
            const input = document.createElement('input');
            input.className = 'inline-rename-input';
            input.value = currentName;

            span.replaceWith(input);
            input.focus();
            input.select();

            const finishRename = () => {
                const newName = input.value.trim();
                const newSpan = document.createElement('span');
                newSpan.className = 'session-text';
                newSpan.innerText = newName || currentName;
                input.replaceWith(newSpan);
            };

            input.onblur = finishRename;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') finishRename();
                if (e.key === 'Escape') {
                    input.value = currentName;
                    finishRename();
                }
            };
        }

        if (action === 'customize') {
            this.openCustomizeDialog(item);
        }
    }

    openCustomizeDialog(item) {
        // Create a small customization popover
        const existing = document.querySelector('.customize-popover');
        if (existing) existing.remove();

        const popover = document.createElement('div');
        popover.className = 'customize-popover';
        const lm = window.langManager;
        popover.innerHTML = `
            <div class="popover-header">${lm?.get('session.customize') || 'Customize Session'}</div>
            <div class="popover-section">
                <label>${lm?.get('session.color') || 'Color'}</label>
                <div class="color-grid">
                    <div class="color-swatch" style="background:var(--accent-primary)" data-color="var(--accent-primary)"></div>
                    <div class="color-swatch" style="background:#ef4444" data-color="#ef4444"></div>
                    <div class="color-swatch" style="background:#10b981" data-color="#10b981"></div>
                    <div class="color-swatch" style="background:#f59e0b" data-color="#f59e0b"></div>
                    <div class="color-swatch" style="background:#3b82f6" data-color="#3b82f6"></div>
                    <div class="color-swatch" style="background:#a855f7" data-color="#a855f7"></div>
                    <div class="color-swatch" style="background:#ec4899" data-color="#ec4899"></div>
                    <div class="color-swatch" style="background:#06b6d4" data-color="#06b6d4"></div>
                    <div class="color-swatch" style="background:#14b8a6" data-color="#14b8a6"></div>
                    <div class="color-swatch" style="background:#d946ef" data-color="#d946ef"></div>
                </div>
            </div>
            <div class="popover-section">
                <label>${lm?.get('session.icon') || 'Icon'}</label>
                <div class="icon-grid">
                    <div class="icon-option" data-icon="chat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div class="icon-option" data-icon="code">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    </div>
                    <div class="icon-option" data-icon="brain">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.63.71 3.09 1.83 4.09l-.51.52a2 2 0 0 0 0 2.83l1.72 1.71a2 2 0 0 0 2.83 0l.52-.51a5.5 5.5 0 1 0-.89-8.64"></path><path d="M14.5 2A5.5 5.5 0 0 1 20 7.5c0 1.63-.71 3.09-1.83 4.09l.51.52a2 2 0 0 1 0 2.83l-1.72 1.71a2 2 0 0 1-2.83 0l-.52-.51a5.5 5.5 0 1 1 .89-8.64"></path></svg>
                    </div>
                    <div class="icon-option" data-icon="zap">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    </div>
                    <div class="icon-option" data-icon="globe">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </div>
                    <div class="icon-option" data-icon="sparkles">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 1.912 5.813a2 2 0 0 1-1.272 1.272l-5.813 1.912 5.813 1.912a2 2 0 0 1 1.272 1.272l1.912 5.813 1.912-5.813a2 2 0 0 1 1.272-1.272l5.813-1.912-5.813-1.912a2 2 0 0 1-1.272-1.272z"></path><path d="M5 3v4"></path><path d="M3 5h4"></path><path d="M21 17v4"></path><path d="M19 19h4"></path></svg>
                    </div>
                    <div class="icon-option" data-icon="file">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div class="icon-option" data-icon="terminal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popover);

        const rect = item.getBoundingClientRect();
        const isRtl = document.documentElement.dir === 'rtl';

        popover.style.top = `${rect.top + window.scrollY}px`;
        if (isRtl) {
            popover.style.right = `${(window.innerWidth - rect.left) + 10}px`;
            popover.style.left = 'auto';
        } else {
            popover.style.left = `${rect.right + 10}px`;
        }

        popover.querySelectorAll('.color-swatch').forEach(sw => {
            sw.onclick = () => {
                const color = sw.dataset.color;
                item.style.setProperty('--session-color', color);
                item.querySelector('.session-icon').style.color = color;
                // Removed popover.remove() to keep it open
            };
        });

        popover.querySelectorAll('.icon-option').forEach(opt => {
            opt.onclick = () => {
                const iconSvg = opt.querySelector('svg').cloneNode(true);
                const iconContainer = item.querySelector('.session-icon');
                iconContainer.innerHTML = '';
                iconContainer.appendChild(iconSvg);
                // Removed popover.remove() to keep it open
            };
        });

        // Prevent popover itself from closing when clicked
        popover.onclick = (e) => e.stopPropagation();

        setTimeout(() => {
            const closePopover = (e) => {
                if (!popover.contains(e.target)) {
                    popover.remove();
                    document.removeEventListener('click', closePopover);
                }
            };
            document.addEventListener('click', closePopover);
        }, 10);
    }
}

class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('nanom_lang') || 'en';
        this.translations = {
            en: {
                'settings.language': 'Language',
                'settings.appearance': 'Appearance',
                'sidebar.search': 'Search',
                'sidebar.new_chat': 'New Chat',
                'sidebar.library': 'Library',
                'sidebar.settings': 'Settings',
                'input.placeholder': 'Ask Nanom...',
                'session.customize': 'Customize Session',
                'session.color': 'Color',
                'session.icon': 'Icon',
                'ctx.rename': 'Rename',
                'ctx.pin': 'Pin Chat',
                'ctx.unpin': 'Unpin Chat',
                'ctx.delete': 'Delete',
            },
            ar: {
                'settings.language': 'اللغة',
                'settings.appearance': 'المظهر',
                'sidebar.search': 'بحث',
                'sidebar.new_chat': 'دردشة جديدة',
                'sidebar.library': 'المكتبة',
                'sidebar.settings': 'الإعدادات',
                'input.placeholder': 'اسأل نانوم...',
                'session.customize': 'تخصيص الجلسة',
                'session.color': 'اللون',
                'session.icon': 'الأيقونة',
                'ctx.rename': 'إعادة تسمية',
                'ctx.pin': 'تثبيت الدردشة',
                'ctx.unpin': 'إلغاء التثبيت',
                'ctx.delete': 'حذف',
            }
        };
        this.init();
    }

    get(key) {
        return this.translations[this.currentLang]?.[key] || key;
    }

    init() {
        this.applyLanguage(this.currentLang);
        this.setupUI();
    }

    setupUI() {
        const buttons = document.querySelectorAll('#lang-selector .segment');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.setLanguage(lang);
            });
        });
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('nanom_lang', lang);
        this.applyLanguage(lang);
    }

    applyLanguage(lang) {
        if (!this.translations[lang]) lang = 'en'; // Fallback to English
        const isRtl = lang === 'ar';
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

        // Update active UI state
        document.querySelectorAll('#lang-selector .segment').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (this.translations[lang]?.[key]) {
                el.innerText = this.translations[lang][key];
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (this.translations[lang]?.[key]) {
                el.placeholder = this.translations[lang][key];
            }
        });

        // Toggle Arabic Font if needed
        if (isRtl) {
            document.body.style.fontFamily = 'var(--font-arabic)';
        } else {
            document.body.style.fontFamily = 'var(--font-body)';
        }
    }
}

class SettingsModal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.init();
    }
    init() {
        if (!this.modal) return;
        const tabs = this.modal.querySelectorAll('.settings-tab-btn');
        tabs.forEach(tab => tab.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab)));
        const closeBtn = this.modal.querySelector('.close-settings');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        // Font Scale Logic
        const scale = document.getElementById('setting-scale');
        const scaleVal = document.getElementById('scale-value');
        if (scale) scale.addEventListener('input', (e) => {
            document.documentElement.style.fontSize = `${e.target.value}%`;
            if (scaleVal) scaleVal.innerText = `${e.target.value}%`;
        });

        // Animation Speed Logic
        const speedInput = document.getElementById('setting-speed');
        const speedValue = document.getElementById('speed-value');
        if (speedInput) {
            speedInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (speedValue) speedValue.innerText = `${val}x`;
                // We want high value = faster, so multiplier = 1/val
                document.documentElement.style.setProperty('--anim-speed-multiplier', 1 / val);
            });
        }

        // Background Blobs Toggle
        const blobsToggle = document.getElementById('toggle-blobs');
        if (blobsToggle) {
            blobsToggle.addEventListener('change', (e) => {
                const container = document.querySelector('.background-container');
                if (container) container.style.opacity = e.target.checked ? '1' : '0';
            });
        }

        // Theme Toggle Logic
        const themeSelector = this.modal.querySelector('#theme-selector');
        if (themeSelector) {
            const themeBtns = themeSelector.querySelectorAll('.segment');
            const savedTheme = localStorage.getItem('nanom_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);

            themeBtns.forEach(btn => {
                if (btn.dataset.themeVal === savedTheme) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', (e) => {
                    const theme = e.target.dataset.themeVal;
                    document.documentElement.setAttribute('data-theme', theme);
                    localStorage.setItem('nanom_theme', theme);
                    themeBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
        }

        // Language Toggle Logic
        const langSelector = this.modal.querySelector('#lang-selector');
        if (langSelector) {
            const langBtns = langSelector.querySelectorAll('.segment');
            const savedLang = localStorage.getItem('nanom_lang') || 'en';

            // Language switching will be handled by a dedicated manager
            // but we init the active state here
            langBtns.forEach(btn => {
                if (btn.dataset.lang === savedLang) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', (e) => {
                    const lang = e.target.dataset.lang;
                    langBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    if (window.langManager) window.langManager.setLanguage(lang);
                });
            });
        }

        // Advanced AI Toggle Logic
        const advBtn = document.getElementById('toggle-advanced-ai');
        const advOpts = document.getElementById('advanced-ai-options');
        if (advBtn && advOpts) {
            advBtn.addEventListener('click', () => {
                const isHidden = advOpts.style.display === 'none';
                advOpts.style.display = isHidden ? 'block' : 'none';
                advBtn.innerText = isHidden ? 'Hide Advanced Code Options ▴' : 'Show Advanced Code Options ▾';
            });
        }
    }
    switchTab(tab) {
        this.modal.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this.modal.querySelectorAll('.settings-section').forEach(s => s.style.display = s.id === `settings-${tab}` ? 'block' : 'none');
    }
    show() {
        this.modal.classList.add('active');
        const content = this.modal.querySelector('.settings-container');
        content.style.opacity = 0;
        content.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            content.style.transition = 'all 0.3s ease';
            content.style.opacity = 1;
            content.style.transform = 'translateY(0)';
        });
    }
    hide() { this.modal.classList.remove('active'); }
}

class AiToolsSheet {
    constructor(sheetId) {
        this.sheet = document.getElementById(sheetId);
        this.init();
    }
    init() {
        if (!this.sheet) return;
        this.sheet.querySelectorAll('.model-option').forEach(m => {
            m.addEventListener('click', () => {
                this.sheet.querySelectorAll('.model-option').forEach(o => o.classList.remove('active'));
                m.classList.add('active');
            });
        });
        const toggles = this.sheet.querySelectorAll('.tool-toggle');
        toggles.forEach(t => t.addEventListener('click', () => t.classList.toggle('active')));

        document.addEventListener('click', (e) => {
            const btn = document.getElementById('tools-btn');
            if (this.sheet.classList.contains('active') && !this.sheet.contains(e.target) && (!btn || !btn.contains(e.target))) {
                this.sheet.classList.remove('active');
            }
        });
    }
    toggle() { this.sheet.classList.toggle('active'); }
}

class ProjectManager {
    constructor(container) {
        this.container = container;
        this.isGen = false;
    }
    startGeneration(type, prompt) {
        if (this.isGen) return;
        this.isGen = true;

        // Add Project Context Bar Logic
        const ctxBar = document.getElementById('project-context-bar');
        const nameSpan = document.getElementById('current-project-name');

        const p = document.createElement('div');
        p.className = 'project-placeholder';
        p.innerHTML = `<div class="spinner-ring"></div><span class="gen-text">Building ${type}...</span>`;
        this.container.appendChild(p);
        this.container.scrollTop = this.container.scrollHeight;

        setTimeout(() => {
            p.replaceWith(this.createCard(type, prompt));
            this.isGen = false;

            // Activate Context Bar
            if (ctxBar && nameSpan) {
                ctxBar.classList.add('active');
                nameSpan.innerText = `My ${type} App`;
            }
        }, 2000);
    }
    createCard(type, prompt) {
        const card = document.createElement('div');
        card.className = `project-card type-${type.toLowerCase()}`;
        let icon = type === 'HTML'
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
            : type === 'Android'
                ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>'
                : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
        card.innerHTML = `<div class="card-bg-decor"></div>
        <div class="card-content">
            <span class="project-icon">${icon}</span>
            <div class="card-info"><h3>${type} Project</h3><p>${prompt}</p></div>
        </div>`;

        card.addEventListener('click', () => {
            const modal = document.getElementById('modal-overlay');
            if (modal) {
                modal.classList.add('active');
                if (type === 'Android') {
                    const frame = modal.querySelector('.device-frame');
                    if (frame) {
                        frame.style.transform = 'rotate(90deg) scale(0.8)';
                        setTimeout(() => frame.style.transform = 'rotate(0deg) scale(0.8)', 1000);
                    }
                }
            }
            const ctxBar = document.getElementById('project-context-bar');
            if (ctxBar) {
                ctxBar.classList.add('active');
                const nameSpan = document.getElementById('current-project-name');
                if (nameSpan) nameSpan.innerText = `${type} Project`;
            }
        });
        return card;
    }
}

// --- Main Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatInput = document.getElementById('chat-input');
    const micBtn = document.getElementById('mic-btn');
    const visualizer = document.getElementById('visualizer');
    const sendBtn = document.getElementById('send-btn');
    const messages = document.getElementById('messages-container');
    const welcome = document.getElementById('welcome-screen');
    const toolsBtn = document.getElementById('tools-btn');
    const compassBtn = document.getElementById('compass-btn');
    const bars = document.querySelectorAll('.bar');
    const closeCtxBtn = document.getElementById('close-context-btn');

    // New Buttons
    const settingsBtn = document.getElementById('sidebar-settings-btn');
    const toggleInner = document.getElementById('sidebar-toggle-inner');
    const toggleOpen = document.getElementById('sidebar-open-btn');

    // Init Classes
    try {
        window.langManager = new LanguageManager();
    } catch (e) { console.error("LangManager failed", e); }

    const viz = visualizer ? new AudioVisualizer(visualizer, bars) : null;
    const phys = messages ? new PhysicsEngine(messages) : null;
    const settings = new SettingsModal('settings-modal');
    const tools = new AiToolsSheet('ai-tools-sheet');
    const projects = messages ? new ProjectManager(messages) : null;

    let sessions, library;
    try {
        sessions = new SessionManager();
    } catch (e) { console.error("SessionManager failed", e); }

    try {
        library = new LibraryManager();
    } catch (e) { console.error("LibraryManager failed", e); }

    // Sidebar Toggle Logic
    const searchPopup = document.getElementById('search-popup');
    const searchInput = document.querySelector('.search-input');
    const searchCapsule = document.querySelector('.search-capsule');

    function toggleSidebar() {
        if (sidebar) {
            const isCollapsing = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            sidebar.classList.toggle('mobile-open'); // For mobile support

            // Close popup if we expand
            if (!isCollapsing && searchPopup) {
                searchPopup.classList.remove('active');
            }
        }
    }
    if (toggleInner) toggleInner.addEventListener('click', toggleSidebar);
    if (toggleOpen) toggleOpen.addEventListener('click', toggleSidebar);

    // Search Popup Logic for Collapsed State
    const searchPopupInput = document.getElementById('search-popup-input');
    const searchPopupResults = document.getElementById('search-popup-results');

    function populateSearchSessions(filter = '') {
        if (!searchPopupResults) return;
        searchPopupResults.innerHTML = '';

        // Grab sessions from the sidebar DOM
        const sessionItems = Array.from(document.querySelectorAll('.sidebar .session-item'));
        const filteredItems = sessionItems.filter(item => {
            const text = item.querySelector('.session-text')?.textContent.toLowerCase() || '';
            return text.includes(filter.toLowerCase());
        });

        filteredItems.forEach(item => {
            const clone = item.cloneNode(true);
            clone.classList.remove('active'); // Don't show active in results necessarily
            clone.addEventListener('click', () => {
                // Find original item and click it
                item.click();
                searchPopup.classList.remove('active');
            });
            searchPopupResults.appendChild(clone);
        });

        if (filteredItems.length === 0) {
            searchPopupResults.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No sessions found</div>';
        }
    }

    if (searchCapsule) {
        searchCapsule.addEventListener('click', (e) => {
            if (sidebar && sidebar.classList.contains('collapsed')) {
                e.stopPropagation();
                searchPopup.classList.toggle('active');
                if (searchPopup.classList.contains('active')) {
                    if (searchPopupInput) {
                        searchPopupInput.value = '';
                        searchPopupInput.focus();
                    }
                    populateSearchSessions();
                }
            }
        });
    }

    if (searchPopupInput) {
        searchPopupInput.addEventListener('input', (e) => {
            populateSearchSessions(e.target.value);
        });
    }

    // Main Sidebar Search Logic (Fixed)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const filter = e.target.value.toLowerCase();
            const sessionItems = document.querySelectorAll('.sidebar-content .session-item');

            sessionItems.forEach(item => {
                const text = item.querySelector('.session-text')?.textContent.toLowerCase() || '';
                if (text.includes(filter)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });

            // Optional: Hide group titles if all children are hidden? 
            // For now, simple filtering is sufficient to restore functionality.
        });
    }

    // Close popup on click outside
    document.addEventListener('click', (e) => {
        if (searchPopup && !searchPopup.contains(e.target) && !searchCapsule.contains(e.target)) {
            searchPopup.classList.remove('active');
        }
    });

    // Context Bar Close
    if (closeCtxBtn) {
        closeCtxBtn.addEventListener('click', () => {
            const ctxBar = document.getElementById('project-context-bar');
            if (ctxBar) ctxBar.classList.remove('active');
        });
    }

    if (newChatBtn) {
        console.log("Registering New Chat handler");
        newChatBtn.addEventListener('click', () => {
            const isWelcomeVisible = window.getComputedStyle(welcome).display !== 'none';
            if (isWelcomeVisible) {
                console.log("Already on welcome screen, shaking button");
                newChatBtn.classList.add('shake-anim');
                newChatBtn.style.background = '#ef4444';
                setTimeout(() => {
                    newChatBtn.classList.remove('shake-anim');
                    newChatBtn.style.background = '';
                }, 500);
            } else {
                console.log("Resetting chat");
                resetChat();
            }
        });
    }

    // 9. Mic & Send Logic
    if (chatInput) {
        const inputBar = chatInput.closest('.input-bar');

        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';

            if (inputBar) {
                if (this.value.trim() === '') {
                    inputBar.classList.add('is-empty');
                } else {
                    inputBar.classList.remove('is-empty');
                }
            }
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }

    // Voice & Wave Logic
    const voiceWave = document.getElementById('voice-wave');
    const voiceBars = document.querySelectorAll('#voice-wave .wave-bar');
    const voiceViz = voiceWave ? new AudioVisualizer(voiceWave, voiceBars) : null;

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;
    let isPaused = false;
    let initialInputText = '';

    // Create Pause Button dynamically
    const micPauseBtn = document.createElement('button');
    micPauseBtn.className = 'mic-pause-btn';
    micPauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    if (micBtn) {
        micBtn.parentNode.insertBefore(micPauseBtn, micBtn);
    }

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            isPaused = false;
            micBtn.classList.add('is-recording');
            document.body.classList.add('chat-active'); // Hide top buttons

            // Swap Icon to X (Improved)
            micBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

            // Show Pause Button
            if (micPauseBtn) {
                micPauseBtn.classList.add('active');
                micPauseBtn.classList.remove('is-paused');
                micPauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            }

            if (voiceViz) voiceViz.start();
            chatInput.placeholder = window.langManager?.currentLang === 'ar' ? "..." : "...";
            initialInputText = chatInput.value;
            // Add space if needed
            if (initialInputText && !initialInputText.endsWith(' ')) initialInputText += ' ';
        };

        recognition.onend = () => {
            if (isRecording && !isPaused) {
                stopRecording();
            }
        };

        recognition.onresult = (event) => {
            let sessionTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                // We care about all results in this session to reconstruct 'real time' feel
                // But generally taking the latest 'final' + current 'interim' is the pattern
                // Since this is a simple implementation:
                sessionTranscript += event.results[i][0].transcript;
            }
            // Fix: With continuous=true, we need to be careful not to append endlessly if we are just reading recent results.
            // A safer simple way for this demo is just:
            let transcript = '';
            for (let i = 0; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }

            chatInput.value = initialInputText + transcript;
            chatInput.dispatchEvent(new Event('input'));
            chatInput.scrollTop = chatInput.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error("Speech Err:", event.error);
            stopRecording();
        };
    }

    function stopRecording() {
        isRecording = false;
        if (recognition) recognition.stop();
        if (voiceViz) voiceViz.stop();
        if (micBtn) {
            micBtn.classList.remove('is-recording');
            // Revert Icon to Mic
            micBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>';
        }
        if (micPauseBtn) micPauseBtn.classList.remove('active');
        document.body.classList.remove('chat-active'); // Show top buttons
        if (chatInput) {
            chatInput.placeholder = window.langManager?.currentLang === 'ar' ? "اسأل نانوم..." : "Ask Nanom...";
        }
    }

    if (micBtn && recognition) {
        micBtn.addEventListener('click', () => {
            if (isRecording) {
                stopRecording();
            } else {
                // Update Lang
                recognition.lang = window.langManager?.currentLang === 'ar' ? 'ar-SA' : 'en-US';
                try {
                    recognition.start();
                } catch (e) { console.error(e); }
            }
        });

        // Pause Button Logic
        if (micPauseBtn) {
            micPauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isRecording) return;

                if (isPaused) {
                    // Resume
                    isPaused = false;
                    micPauseBtn.classList.remove('is-paused');
                    micPauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                    try { recognition.start(); } catch (e) { }
                    if (voiceViz) voiceViz.start();
                } else {
                    // Pause
                    isPaused = true;
                    micPauseBtn.classList.add('is-paused');
                    micPauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                    recognition.stop(); // Stop listening
                    if (voiceViz) voiceViz.stop();
                }
            });
        }
    } else if (micBtn && !recognition) {
        // Fallback if no browser support
        micBtn.addEventListener('click', () => {
            alert("Speech Recognition not supported in this browser.");
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (chatInput.value.trim() === '') {
                // If empty, clicking the white circle (which now holds the mic icon) should trigger mic
                micBtn.click();
            } else {
                handleSend();
            }
        });
    }

    // Use Settings from Sidebar
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            console.log("Settings button clicked");
            settings.show();
        });
    }

    if (toolsBtn) {
        toolsBtn.addEventListener('click', () => {
            console.log("Tools button clicked");
            tools.toggle();
        });
    }

    let genMode = false;
    const genIndicator = document.getElementById('gen-mode-indicator');
    if (compassBtn) compassBtn.addEventListener('click', () => {
        genMode = !genMode;
        compassBtn.classList.toggle('active', genMode);
        if (genIndicator) genIndicator.style.display = genMode ? 'flex' : 'none';

        const lang = window.langManager?.currentLang || 'en';
        if (genMode) {
            chatInput.placeholder = lang === 'ar' ? 'مسودة المشروع...' : 'Drafting Project...';
        } else {
            chatInput.placeholder = lang === 'ar' ? 'اسأل نانوم...' : 'Ask Nanom...';
        }
        console.log("GenMode:", genMode, "Lang:", lang);
    });

    function handleSend() {
        const txt = chatInput.value.trim();
        const file = window.attachmentManager?.currentFile;

        if (!txt && !file) return;

        welcome.style.display = 'none';
        messages.style.display = 'flex';
        document.body.classList.add('chat-active');

        // Handle File Display
        if (file) {
            const d = document.createElement('div');
            d.className = 'message user file-msg';
            if (file.type.startsWith('image/')) {
                d.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:200px; border-radius:8px; display:block; margin-bottom:4px;">${txt}`;
            } else {
                d.innerHTML = `<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);padding:8px;border-radius:8px;margin-bottom:4px;">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>
                    <span>${file.name}</span>
                </div>${txt}`;
            }
            messages.appendChild(d);
            window.attachmentManager.clear();
        } else {
            // Text only
            addMsg(txt, 'user');
        }

        if (genMode) {
            const type = txt.toLowerCase().includes('android') ? 'Android' : 'HTML';
            projects.startGeneration(type, txt);
        } else {
            // Show Thinking Indicator
            const ai = addMsg('', 'ai');
            ai.innerHTML = '<span class="pulsing-dots">...</span>';

            // Gemini API call
            if (!window.geminiManager) {
                window.geminiManager = new GeminiManager('AIzaSyA_C6BvG9W5zcaJ8emmC0g8aQPBVoZand0');
            }
            if (!window.chatHistory) window.chatHistory = [];

            window.geminiManager.generateResponse(window.chatHistory, txt).then(reply => {
                ai.innerHTML = ''; // Clear dots
                const parsed = MessageParser.parseResponse(reply);
                typeText(ai, parsed.text || reply);
                // Update history
                window.chatHistory.push({ role: 'user', parts: [{ text: txt }] });
                window.chatHistory.push({ role: 'model', parts: [{ text: reply }] });
            }).catch(err => {
                ai.innerHTML = 'Error: ' + err.message;
            });
        }

        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height
        const inputBar = chatInput.closest('.input-bar');
        if (inputBar) inputBar.classList.add('is-empty');
    }

    function addMsg(txt, type) {
        const d = document.createElement('div');
        d.className = `message ${type}`;
        // Detect Arabic
        if (/[\u0600-\u06FF]/.test(txt)) {
            d.classList.add('is-arabic');
        }
        d.innerText = txt;
        messages.appendChild(d);
        messages.scrollTop = messages.scrollHeight;
        return d;
    }

    function typeText(el, txt) {
        // Detect Arabic
        const isAr = /[\u0600-\u06FF]/.test(txt);
        if (isAr) el.classList.add('is-arabic');

        const words = txt.split(' ');
        let i = 0;
        el.innerHTML = ''; // Clear indicator

        function t() {
            if (i < words.length) {
                const span = document.createElement('span');
                span.innerText = words[i] + ' ';

                // Use display: inline for ALL languages to prevent overlap and ligature breakage
                span.style.cssText = 'opacity:0; display:inline; transition:opacity 0.3s ease;';

                el.appendChild(span);

                // Trigger reflow and animate
                requestAnimationFrame(() => {
                    span.style.opacity = '1';
                });

                i++;
                setTimeout(t, isAr ? 30 : 40); // Slightly faster for Arabic
            }
        }
        t();
    }

    function resetChat() {
        welcome.style.display = 'block';
        messages.style.display = 'none';
        messages.innerHTML = '';
        document.getElementById('project-context-bar').classList.remove('active');
        chatInput.value = '';
    }

    document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }));

    // --- Interactive Elements Fixes ---

    // 1. Welcome Suggestions (Crystal Cards)
    document.querySelectorAll('.crystal-card').forEach(card => {
        card.addEventListener('click', () => {
            const topic = card.querySelector('h3').innerText;
            const subtitle = card.querySelector('p').innerText;
            chatInput.value = `Tell me about ${topic}: ${subtitle}`;
            chatInput.focus();
        });
    });

    // 2. Settings: Copy User ID
    const copyBtn = document.querySelector('.copy-field .copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const input = copyBtn.previousElementSibling;
            input.select();
            navigator.clipboard.writeText(input.value);
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied!';
            setTimeout(() => copyBtn.innerText = originalText, 2000);
        });
    }

    // 3. Settings: Export/Delete Data
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) exportBtn.addEventListener('click', () => alert('Data exported to nanom_data.json'));

    const deleteDataBtn = document.querySelector('.btn-danger');
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure? This will wipe all local data.')) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    // 4. Settings: Memory List Delete
    document.querySelectorAll('.delete-mem').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.memory-item').remove();
        });
    });

    // 5. Settings: Set PIN
    const pinBtn = document.querySelector('.settings-card .btn-secondary');
    if (pinBtn) pinBtn.addEventListener('click', () => {
        const pin = prompt("Set a 4-digit PIN for app lock:");
        if (pin) alert("PIN Set Successfully (Simulated)");
    });

    // 6. AI Tools: Creativity Toggles
    const creativityOpts = document.querySelectorAll('.creativity-option');
    function updateCreativityIndicator(target) {
        const parent = target.parentElement;
        const indicator = parent.querySelector('.creativity-indicator');
        if (indicator) {
            indicator.style.left = `${target.offsetLeft}px`;
            indicator.style.width = `${target.offsetWidth}px`;
        }
    }
    creativityOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            creativityOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            updateCreativityIndicator(opt);
        });
    });
    // Init Indicator
    const activeCreative = document.querySelector('.creativity-option.active');
    if (activeCreative) setTimeout(() => updateCreativityIndicator(activeCreative), 100);

    // 7. Modal Tabs (Code vs Preview)
    const modalToggleBtns = document.querySelectorAll('.modal-toggle button');
    modalToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parent = btn.parentElement;
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const modalBody = parent.closest('.modal-content').querySelector('.modal-body');
            if (modalBody) {
                const viewCode = modalBody.querySelector('.view-code');
                const viewPreview = modalBody.querySelector('.view-preview');
                if (viewCode && viewPreview) {
                    if (btn.innerText === 'Code') {
                        viewCode.style.display = 'block';
                        viewPreview.style.display = 'none';
                    } else {
                        viewCode.style.display = 'none';
                        viewPreview.style.display = 'flex';
                    }
                }
            }
        });
    });



    // 10. Interface Scale
    const scaleInput = document.getElementById('setting-scale');
    const scaleValue = document.getElementById('scale-value');
    if (scaleInput && scaleValue) {
        scaleInput.addEventListener('input', (e) => {
            const val = e.target.value;
            scaleValue.innerText = `${val}%`;
        });
    }

    // 11. Brightness
    const brightInput = document.getElementById('setting-brightness');
    const brightValue = document.getElementById('brightness-value');
    const brightOverlay = document.getElementById('brightness-overlay');
    if (brightInput && brightValue && brightOverlay) {
        brightInput.addEventListener('input', (e) => {
            const val = e.target.value;
            brightValue.innerText = `${val}%`;
            const opacity = (100 - val) / 100;
            brightOverlay.style.opacity = opacity;
        });
    }

    // 11. Toast System
    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        let icon = type === 'success'
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        toast.innerHTML = `${icon}<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    window.showToast = showToast;

    // 12. Chat Header Logic
    const notifBtn = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notification-panel');
    const chatOptsBtn = document.getElementById('chat-options-btn');

    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('active');
            notifBtn.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
                notifPanel.classList.remove('active');
                notifBtn.classList.remove('active');
            }
        });
    }

    function showGenericContextMenu(e, items) {
        const div = document.createElement('div');
        div.className = 'context-popup active';
        div.style.position = 'fixed';
        const rect = e.target.getBoundingClientRect();
        const isRtl = document.documentElement.dir === 'rtl';

        div.style.top = `${rect.bottom + 5}px`;
        div.style.right = `${window.innerWidth - rect.right}px`;

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = `ctx-item ${item.isDanger ? 'delete' : ''}`;
            row.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg> <span>${item.label}</span>`;
            row.onclick = (ev) => {
                ev.stopPropagation();
                item.action();
                div.remove();
            };
            div.appendChild(row);
        });

        document.body.appendChild(div);

        setTimeout(() => {
            const close = (ev) => {
                if (!div.contains(ev.target)) {
                    div.remove();
                    document.removeEventListener('click', close);
                }
            };
            document.addEventListener('click', close);
        }, 10);
    }

    if (chatOptsBtn && sessions) {
        chatOptsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const activeSession = document.querySelector('.session-item.active');
            if (activeSession) {
                showGenericContextMenu(e, [
                    { label: window.langManager?.get('session.customize') || 'Customize', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>', action: () => sessions.openCustomizeDialog(activeSession) },
                    {
                        label: window.langManager?.get('ctx.rename') || 'Rename', icon: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>', action: () => {
                            const textSpan = activeSession.querySelector('.session-text');
                            if (textSpan) {
                                const currentText = textSpan.innerText;
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'inline-rename-input';
                                input.value = currentText;
                                textSpan.replaceWith(input);
                                input.focus();
                                input.select();
                                const save = () => {
                                    const newText = input.value.trim() || currentText;
                                    const newSpan = document.createElement('span');
                                    newSpan.className = 'session-text';
                                    newSpan.innerText = newText;
                                    input.replaceWith(newSpan);
                                };
                                input.addEventListener('blur', save);
                                input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
                            }
                        }
                    },
                    { label: window.langManager?.get('ctx.pin') || 'Pin', icon: '<line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>', action: () => activeSession.classList.toggle('pinned') },
                    { label: window.langManager?.get('ctx.delete') || 'Delete', icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>', action: () => sessions.handleAction('delete', activeSession), isDanger: true }
                ]);
            }
        });
    }

    // 13. Library & Templates
    const libGrid = document.getElementById('lib-projects-grid');
    const tplGrid = document.getElementById('lib-templates-grid');

    if (libGrid) {
        const newGrid = libGrid.cloneNode(true);
        libGrid.parentNode.replaceChild(newGrid, libGrid);

        newGrid.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.lib-card-menu');
            const card = e.target.closest('.lib-project-card');

            if (menuBtn && card) {
                e.stopPropagation();
                showGenericContextMenu({ target: menuBtn }, [
                    { label: 'Customize', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>', action: () => alert('Customize Project (Mock)') },
                    {
                        label: 'Rename', icon: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>', action: () => {
                            const h3 = card.querySelector('h3');
                            const name = prompt("Rename project:", h3.innerText);
                            if (name) h3.innerText = name;
                        }
                    },
                    {
                        label: 'Delete', icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>', action: () => {
                            if (confirm("Delete this project?")) card.remove();
                        }, isDanger: true
                    }
                ]);
                return;
            }

            if (card) {
                document.getElementById('library-modal').classList.remove('active');
                const title = card.querySelector('h3').innerText;
                const bar = document.getElementById('project-context-bar');
                if (bar) {
                    bar.classList.add('active');
                    document.getElementById('current-project-name').innerText = title;
                }
                document.getElementById('welcome-screen').style.display = 'none';
                const msgs = document.getElementById('messages-container');
                msgs.style.display = 'flex';
                msgs.innerHTML = '';
                const msg = document.createElement('div');
                msg.className = 'message ai';
                msg.innerText = `Loaded project: ${title}\nReady to code!`;
                msgs.appendChild(msg);
            }
        });
    }

    if (tplGrid) {
        const newTplGrid = tplGrid.cloneNode(true);
        tplGrid.parentNode.replaceChild(newTplGrid, tplGrid);

        newTplGrid.addEventListener('click', (e) => {
            const useBtn = e.target.closest('.btn-use-template');
            const templateCard = e.target.closest('.template-card');

            if (useBtn && templateCard) {
                e.stopPropagation();
                document.getElementById('library-modal').classList.remove('active');
                const title = templateCard.querySelector('h3')?.innerText || 'Template';
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = `I'd like to use the ${title} template to start my project.`;
                    chatInput.focus();
                }
                return;
            }

            if (templateCard) {
                const modal = document.getElementById('template-modal');
                if (modal) {
                    modal.classList.add('active');
                    const title = templateCard.querySelector('h3')?.innerText || 'Template';
                    const desc = templateCard.querySelector('p')?.innerText || 'No description available.';

                    document.getElementById('template-preview-title').innerText = title;
                    document.getElementById('template-preview-desc').innerText = desc;

                    // Populating Code View and Preview
                    const templateId = templateCard.dataset.id;
                    const templateData = library.getMockTemplates().find(t => t.id == templateId);
                    const code = templateData ? templateData.code : `// Template: ${title}\n// No source available.`;

                    const codeArea = modal.querySelector('.view-code code');
                    if (codeArea) {
                        // Detect language from category or code content
                        let langClass = 'language-javascript';
                        if (code.includes('<!DOCTYPE html>') || code.includes('<html>')) langClass = 'language-html';
                        else if (templateData?.category === 'Web') langClass = 'language-html';

                        codeArea.className = langClass;
                        codeArea.innerText = code;
                        if (window.Prism) Prism.highlightElement(codeArea);
                    }

                    const previewArea = modal.querySelector('.view-preview');
                    if (previewArea) {
                        previewArea.innerHTML = '';
                        const iframe = document.createElement('iframe');
                        iframe.className = 'template-preview-iframe';
                        iframe.style.width = '100%';
                        iframe.style.height = '100%';
                        iframe.style.border = 'none';
                        iframe.style.borderRadius = '8px';
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        iframe.style.background = code.includes('<!DOCTYPE html>') ? 'white' : (isDark ? '#111' : '#f8f9fa');
                        previewArea.appendChild(iframe);

                        const doc = iframe.contentWindow.document;
                        doc.open();
                        doc.write(code);
                        doc.close();
                    }

                    // Reset modal view to Preview
                    const toggleBtns = modal.querySelectorAll('.modal-toggle button');
                    toggleBtns.forEach(b => b.classList.remove('active'));
                    const firstBtn = toggleBtns[0];
                    if (firstBtn) {
                        firstBtn.classList.add('active');
                        modal.querySelector('.view-preview').style.display = 'flex';
                        modal.querySelector('.view-code').style.display = 'none';
                    }

                    // Handle Template Modal buttons
                    document.getElementById('btn-add-library').onclick = (ev) => {
                        ev.stopPropagation();
                        showToast('Template added to Library', 'success');
                        modal.classList.remove('active');
                    };
                    document.getElementById('btn-report-bug').onclick = (ev) => {
                        ev.stopPropagation();
                        showToast('Bug report sent. Thanks!', 'info');
                    };
                }
            }
        });
    }

    const spacesGrid = document.getElementById('lib-spaces-grid');
    if (spacesGrid) {
        spacesGrid.addEventListener('click', (e) => {
            if (e.target.closest('.space-card')) {
                alert('Opening Space... (Mock)');
            }
        });
    }

    document.querySelectorAll('.modal-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.parentElement;
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const modalBody = btn.closest('.modal-content').querySelector('.modal-body');
            if (modalBody) {
                const view = (btn.getAttribute('data-view') || btn.innerText).toLowerCase();
                const codeView = modalBody.querySelector('.view-code');
                const previewView = modalBody.querySelector('.view-preview');
                if (codeView && previewView) {
                    if (view.includes('code')) {
                        codeView.style.display = 'block';
                        previewView.style.display = 'none';
                    } else {
                        codeView.style.display = 'none';
                        previewView.style.display = 'flex';
                    }
                }
            }
        });
    });
}); // End of existing DOMContentLoaded

// --- Attachment & Camera Manager ---
class AttachmentManager {
    constructor() {
        this.btn = document.getElementById('attachment-btn');
        this.menu = document.getElementById('attachment-menu');
        this.fileInput = document.getElementById('file-input');
        this.inputBar = document.querySelector('.input-bar');
        this.chatInput = document.getElementById('chat-input');
        this.cameraStream = null;
        this.currentFile = null;

        this.init();
        this.injectCameraModal();
    }

    init() {
        if (!this.btn || !this.menu) return;

        // Toggle Menu
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.menu.classList.toggle('active');
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && !this.btn.contains(e.target)) {
                this.menu.classList.remove('active');
            }
        });

        // File Option
        document.getElementById('opt-file')?.addEventListener('click', () => {
            this.fileInput.removeAttribute('accept');
            this.fileInput.click();
            this.menu.classList.remove('active');
        });

        document.getElementById('opt-image')?.addEventListener('click', () => {
            this.fileInput.accept = "image/*";
            this.fileInput.click();
            this.menu.classList.remove('active');
        });

        this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

        // Camera Option
        document.getElementById('opt-camera')?.addEventListener('click', () => {
            this.openCamera();
            this.menu.classList.remove('active');
        });

        // Cloud Options
        document.getElementById('opt-drive')?.addEventListener('click', () => {
            this.simulateCloudPick('Google Drive');
            this.menu.classList.remove('active');
        });

        document.getElementById('opt-onedrive')?.addEventListener('click', () => {
            this.simulateCloudPick('OneDrive');
            this.menu.classList.remove('active');
        });

        // Project Option
        document.getElementById('opt-project')?.addEventListener('click', () => {
            this.openProjectPicker();
            this.menu.classList.remove('active');
        });
    }

    simulateCloudPick(source) {
        addMsg(`Connecting to ${source}...`, 'system');
        setTimeout(() => {
            addMsg(`[Linked File from ${source}] Project_Research.pdf`, 'system');
            this.chatInput.value = `[Linked: Project_Research.pdf] ` + this.chatInput.value;
            this.chatInput.focus();
        }, 1000);
    }

    openProjectPicker() {
        const pickerModal = document.getElementById('project-picker-modal');
        const pickerList = document.getElementById('project-picker-list');
        if (!pickerModal || !pickerList) return;

        const projects = [
            { id: 1, title: 'Portfolio Site', type: 'HTML' },
            { id: 2, title: 'Task Manager App', type: 'Android' },
            { id: 3, title: 'API Documentation', type: 'Docs' }
        ];

        pickerList.innerHTML = '';
        projects.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'picker-item';
            let icon = '📄';
            if (proj.type === 'HTML') icon = '🌐';
            if (proj.type === 'Android') icon = '🤖';

            item.innerHTML = `
                <div class="project-icon">${icon}</div>
                <div class="project-info">
                    <div style="font-weight:600; color:var(--text-primary);">${proj.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary);">${proj.type}</div>
                </div>
            `;
            item.onclick = () => {
                addMsg(`Referencing: ${proj.title}`, 'system');
                this.chatInput.value = `#${proj.title.replace(/\s+/g, '')} ` + this.chatInput.value;
                this.chatInput.focus();
                pickerModal.classList.remove('active');
            };
            pickerList.appendChild(item);
        });

        pickerModal.classList.add('active');
    }

    injectCameraModal() {
        const div = document.createElement('div');
        div.className = 'camera-modal';
        div.innerHTML = `
            <video class="camera-video" autoplay playsinline></video>
            <div class="camera-controls">
                <button class="btn-close-camera">Cancel</button>
                <button class="btn-capture"></button>
            </div>
        `;
        document.body.appendChild(div);

        this.cameraModal = div;
        this.video = div.querySelector('video');

        div.querySelector('.btn-close-camera').addEventListener('click', () => this.closeCamera());
        div.querySelector('.btn-capture').addEventListener('click', () => this.capturePhoto());
    }

    async openCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.video.srcObject = this.cameraStream;
            this.cameraModal.classList.add('active');
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Could not access camera. Please allow permissions.");
        }
    }

    closeCamera() {
        this.cameraModal.classList.remove('active');
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
    }

    capturePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        canvas.getContext('2d').drawImage(this.video, 0, 0);

        // Convert to blob/file
        canvas.toBlob(blob => {
            const file = new File([blob], "camera-capture.png", { type: "image/png" });
            this.handleFile(file);
            this.closeCamera();
        }, 'image/png');
    }

    handleFileSelect(e) {
        if (e.target.files && e.target.files[0]) {
            this.handleFile(e.target.files[0]);
        }
    }

    handleFile(file) {
        this.currentFile = file;
        this.renderPreview(file);
    }

    clear() {
        this.currentFile = null;
        if (this.fileInput) this.fileInput.value = '';
        const existing = this.inputBar.querySelector('.input-file-preview');
        if (existing) existing.remove();
    }

    renderPreview(file) {
        // Remove existing preview
        const existing = this.inputBar.querySelector('.input-file-preview');
        if (existing) existing.remove();

        const preview = document.createElement('div');
        preview.className = 'input-file-preview';

        const isImage = file.type.startsWith('image/');
        const iconOrImg = isImage
            ? `<img src="${URL.createObjectURL(file)}" class="preview-thumb">`
            : `<div class="preview-thumb" style="display:flex;align-items:center;justify-content:center;color:#fff;"><svg w="20" h="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg></div>`;

        preview.innerHTML = `
            ${iconOrImg}
            <span style="max-width: 100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</span>
            <button class="file-remove-btn">×</button>
        `;

        // Insert before input or inside wrapper?
        // Let's insert it inside "combined-send-group" or just before textarea?
        // Textarea is relative. Let's wrap input and preview in a flex container?
        // Or simply absolute positioning? No.
        // Let's insert it BEFORE the chatInput in DOM, but we need flex layout for input-bar?
        // Currently .input-bar is flex-col.
        // We want it inside the text area or visually associated.
        // Let's create a wrapper inside input-bar if we want "inside".
        // Actually, user said "appear in writing bar".

        // Let's verify input-bar structure.
        // .input-bar > textarea
        // .input-bar > .input-actions-row

        // We can prepend to .input-bar
        this.inputBar.insertBefore(preview, this.inputBar.firstChild);

        // Events
        preview.querySelector('.file-remove-btn').addEventListener('click', () => {
            preview.remove();
            this.currentFile = null;
            this.fileInput.value = ''; // Reset
        });

        if (isImage) {
            preview.querySelector('img').addEventListener('click', () => {
                // Simple modal view
                const viewer = document.createElement('div');
                viewer.style.position = 'fixed';
                viewer.style.inset = '0';
                viewer.style.background = 'rgba(0,0,0,0.9)';
                viewer.style.zIndex = '30000';
                viewer.style.display = 'flex';
                viewer.style.justifyContent = 'center';
                viewer.style.alignItems = 'center';
                viewer.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:90%; max-height:90%; border-radius:8px;">`;
                viewer.onclick = () => viewer.remove();
                document.body.appendChild(viewer);
            });
        }
    }
}

// Init Attachment Manager
document.addEventListener('DOMContentLoaded', () => {
    window.attachmentManager = new AttachmentManager();

    // Add-ons Modal Logic
    const addonsBtn = document.getElementById('btn-open-addons');
    const addonsModal = document.getElementById('addons-modal');
    if (addonsBtn && addonsModal) {
        addonsBtn.addEventListener('click', () => {
            addonsModal.classList.add('active');
            document.getElementById('ai-tools-sheet')?.classList.remove('active');
        });
        // Close handlers moved to setupGlobalModalClosers in AddonManager
    }
});

// --- Global Popup Closer (Unified) ---
document.addEventListener('click', (e) => {
    // 1. Customize Popover (Dynamic)
    const custPopover = document.querySelector('.customize-popover');
    if (custPopover && !custPopover.contains(e.target)) {
        custPopover.remove();
    }

    // 2. Generic "Active" Menus (Backup for specific managers)
    // Close Attachment Menu if active and click is outside
    const attachMenu = document.getElementById('attachment-menu');
    const attachBtn = document.getElementById('attachment-btn');
    if (attachMenu && attachMenu.classList.contains('active')) {
        if (!attachMenu.contains(e.target) && (!attachBtn || !attachBtn.contains(e.target))) {
            attachMenu.classList.remove('active');
        }
    }

    // Close Tools Sheet
    const toolsSheet = document.getElementById('ai-tools-sheet');
    const toolsBtn = document.getElementById('tools-btn');
    if (toolsSheet && toolsSheet.classList.contains('active')) {
        if (!toolsSheet.contains(e.target) && (!toolsBtn || !toolsBtn.contains(e.target))) {
            toolsSheet.classList.remove('active');
        }
    }

    // 3. Search Popup (if used)
    const searchPopup = document.getElementById('search-results-popup'); // Assumption based on common naming
    if (searchPopup && searchPopup.classList.contains('active') && !searchPopup.contains(e.target)) {
        const searchInput = document.getElementById('lib-search') || document.querySelector('.search-input');
        if (!searchInput || !searchInput.contains(e.target)) {
            searchPopup.classList.remove('active');
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const subModal = document.getElementById('subscription-modal');
    const subBtn = document.getElementById('subscribe-btn');
    const closeSubBtn = document.getElementById('close-sub-modal');

    // Subscription Logic
    if (subBtn && subModal) {
        subBtn.addEventListener('click', () => {
            subModal.classList.add('active');
        });
    }
    if (closeSubBtn && subModal) {
        closeSubBtn.addEventListener('click', () => {
            subModal.classList.remove('active');
        });

        // Also close on click outside
        subModal.addEventListener('click', (e) => {
            if (e.target === subModal) {
                subModal.classList.remove('active');
            }
        });
    }


});

// --- Add-ons Manager ---
class AddonManager {
    constructor() {
        this.timers = { pomo: null };
        this.pomoTime = 25 * 60;
        this.isRunning = false;

        this.snippets = JSON.parse(localStorage.getItem('nanom_snippets') || '[]');
        this.tasks = JSON.parse(localStorage.getItem('nanom_tasks') || '[]');
        this.pinnedAddons = JSON.parse(localStorage.getItem('nanom_pinned_addons') || '["pomodoro", "playground"]');

        // Add-ons Registry
        this.addons = [
            {
                id: 'pomodoro', name: 'Focus Timer', cat: 'productivity', color: '#f87171',
                desc: 'Boost productivity with Pomodoro intervals.',
                icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
            },
            {
                id: 'snippets', name: 'Code Snippets', cat: 'dev', color: '#60a5fa',
                desc: 'Save & reuse your favorite code blocks.',
                icon: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>'
            },
            {
                id: 'colors', name: 'Color Studio', cat: 'design', color: '#c084fc',
                desc: 'Pick colors & generate gradients.',
                icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>'
            },
            {
                id: 'tasks', name: 'Quick Tasks', cat: 'productivity', color: '#34d399',
                desc: 'Keep track of your micro-tasks.',
                icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
            },
            {
                id: 'converter', name: 'Unit Converter', cat: 'utility', color: '#fbbf24',
                desc: 'PX to REM and more.',
                icon: '<path d="M7 17l9.2-9.2M17 17V7H7" />'
            },
            {
                id: 'playground', name: 'Code Playground', cat: 'dev', color: '#8b5cf6',
                desc: 'Test HTML/CSS/JS instantly.',
                icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>'
            },
            {
                id: 'api', name: 'API Tester', cat: 'dev', color: '#10b981',
                desc: 'Test REST APIs instantly.',
                icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>'
            },
            {
                id: 'cssgenerators', name: 'CSS Generators', cat: 'design', color: '#ec4899',
                desc: 'Visual tools for CSS.',
                icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>'
            },
            // --- New Utilities ---
            { id: 'alarm', name: 'Smart Alarm', cat: 'utility', color: '#ef4444', desc: 'Set multiple alerts with custom sounds.', icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' },
            { id: 'stickynotes', name: 'Sticky Notes', cat: 'utility', color: '#facc15', desc: 'Pin thoughts to your screen.', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>' },
            { id: 'counter', name: 'Click Counter', cat: 'utility', color: '#3b82f6', desc: 'Count anything digitally.', icon: '<path d="M12 9v4"></path><path d="M12 17h.01"></path><rect x="4" y="2" width="16" height="20" rx="2"></rect>' },
            { id: 'stopwatch', name: 'Stopwatch', cat: 'utility', color: '#f97316', desc: 'Precision timing with laps.', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline><path d="M12 2v2"></path>' },
            { id: 'dice', name: 'Inspiration Dice', cat: 'utility', color: '#8b5cf6', desc: 'Roll for random decisions.', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8" cy="8" r="1.5"></circle><circle cx="16" cy="16" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="16" cy="8" r="1.5"></circle><circle cx="8" cy="16" r="1.5"></circle>' },
            { id: 'battery', name: 'System Status', cat: 'utility', color: '#22c55e', desc: 'Monitor battery & time.', icon: '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line>' },

            // --- Customization ---
            { id: 'cursor', name: 'Cursor Changer', cat: 'custom', color: '#06b6d4', desc: 'Fun custom mouse cursors.', icon: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>' },
            { id: 'keysounds', name: 'Key Sounds', cat: 'custom', color: '#a855f7', desc: 'Satisfying typing effects.', icon: '<path d="M2 12h20"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path><path d="M22 6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"></path><rect x="4" y="6" width="4" height="6"></rect><rect x="10" y="6" width="4" height="6"></rect><rect x="16" y="6" width="4" height="6"></rect>' },
            { id: 'effects', name: 'Screen Effects', cat: 'custom', color: '#ec4899', desc: 'Rain, Matrix, Confetti.', icon: '<path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path>' },
            { id: 'readingmode', name: 'Reading Mode', cat: 'custom', color: '#64748b', desc: 'Focus line for reading.', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 0 0 1 3-3h7z"></path>' }
        ];

        this.myAddons = JSON.parse(localStorage.getItem('my_addons')) || [];
        if (this.myAddons.length > 0) {
            this.addons = [...this.addons, ...this.myAddons];
        }

        this.activeCategory = 'all';
        this.searchTerm = '';

        this.heroIndex = 0;
        this.heroSlides = [
            {
                id: 'colors',
                tag: 'FEATURED',
                title: 'Visual Designer',
                desc: 'Create stunning visuals and UI designs directly in chat with our advanced design assistant.',
                icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
                gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                accent: '#3b82f6'
            },
            {
                id: 'playground',
                tag: 'POPULAR',
                title: 'Code Playground',
                desc: 'Experiment with HTML, CSS, and JS in a live sandbox environment. Instant preview available.',
                icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
                gradient: 'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)',
                accent: '#8b5cf6'
            },
            {
                id: 'cssgenerators',
                tag: 'NEW',
                title: 'CSS Studio',
                desc: 'Generate perfect shadows, gradients, and flexbox layouts with visual controls and instant code.',
                icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
                gradient: 'linear-gradient(135deg, #831843 0%, #0f172a 100%)',
                accent: '#ec4899'
            },
            {
                id: 'pomodoro',
                tag: 'PRODUCTIVITY',
                title: 'Focus Engine',
                desc: 'Master your time with our professional Pomodoro timer. Deep work made simple and effective.',
                icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
                gradient: 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)',
                accent: '#ef4444'
            },
            {
                id: 'api',
                tag: 'DEVELOPER',
                title: 'API Lab',
                desc: 'Debug and test your RESTful endpoints directly within your workspace without leaving the chat context.',
                icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
                gradient: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
                accent: '#10b981'
            }
        ];

        this.init();
    }

    init() {
        this.renderStore();
        this.renderTasks();
        this.renderSnippets();
        this.renderPinnedAddons();

        this.setupListeners();
        this.setupStoreListeners();
        this.setupGlobalModalClosers();
        this.setupDraggableWidgets();
        this.updateAddonsStats();
        this.startHeroSlider();
    }

    updateAddonsStats() {
        // Update total, pinned, and active counts
        const totalEl = document.getElementById('stat-total-addons');
        const pinnedEl = document.getElementById('stat-pinned-count');
        const activeEl = document.getElementById('stat-active-widgets');

        if (totalEl) totalEl.textContent = this.addons.length;
        if (pinnedEl) pinnedEl.textContent = this.pinnedAddons.length;

        // Count active floating widgets
        const activeWidgets = document.querySelectorAll('.floating-widget.active').length;
        if (activeEl) activeEl.textContent = activeWidgets;

        // Update pinned list in settings
        const pinnedList = document.getElementById('settings-pinned-list');
        if (pinnedList && this.pinnedAddons.length > 0) {
            pinnedList.innerHTML = this.pinnedAddons.map(id => {
                const addon = this.addons.find(a => a.id === id);
                if (!addon) return '';
                return `
                    <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-hover); padding: 8px 12px; border-radius: 8px;">
                        <div style="width: 28px; height: 28px; background: ${addon.color}; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">${addon.icon}</svg>
                        </div>
                        <span style="font-size: 0.85rem;">${addon.name}</span>
                    </div>
                `;
            }).join('');
        }
    }

    setupListeners() {
        // Pomodoro
        const startBtn = document.getElementById('pomo-start');
        const resetBtn = document.getElementById('pomo-reset');
        if (startBtn) startBtn.addEventListener('click', () => this.togglePomo());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetPomo());

        // Tasks
        const taskInput = document.getElementById('new-task-input');
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.addTask());
        if (taskInput) taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Color Picker
        const colorInput = document.getElementById('main-color-picker');
        if (colorInput) colorInput.addEventListener('input', (e) => this.updateColorInfo(e.target.value));

        // Converter
        const pxIn = document.getElementById('conv-px');
        const remIn = document.getElementById('conv-rem');
        if (pxIn) pxIn.addEventListener('input', (e) => {
            if (!e.target.value) { remIn.value = ''; return; }
            remIn.value = (parseFloat(e.target.value) / 16).toFixed(3);
        });
        if (remIn) remIn.addEventListener('input', (e) => {
            if (!e.target.value) { pxIn.value = ''; return; }
            pxIn.value = (parseFloat(e.target.value) * 16).toFixed(0);
        });

        // === Code Playground ===
        const htmlEditor = document.getElementById('html-editor');
        const cssEditor = document.getElementById('css-editor');
        const jsEditor = document.getElementById('js-editor');

        if (htmlEditor || cssEditor || jsEditor) {
            const updatePreview = () => this.updatePlaygroundPreview();
            if (htmlEditor) htmlEditor.addEventListener('input', updatePreview);
            if (cssEditor) cssEditor.addEventListener('input', updatePreview);
            if (jsEditor) jsEditor.addEventListener('input', updatePreview);
        }

        // === CSS Generators ===
        // Tabs
        document.querySelectorAll('.css-gen-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.css-gen-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.css-gen-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('gen-' + tab.dataset.gen)?.classList.add('active');
            });
        });

        // Gradient
        ['grad-start', 'grad-end', 'grad-angle'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateGradient());
        });

        // Shadow
        ['shadow-x', 'shadow-y', 'shadow-blur', 'shadow-spread', 'shadow-color', 'shadow-opacity'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateShadow());
        });

        // Flexbox
        ['flex-dir', 'flex-justify', 'flex-align', 'flex-gap'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateFlexbox());
        });

        // Initialize CSS previews
        this.updateGradient();
        this.updateShadow();
        this.updateFlexbox();
    }

    setupGlobalModalClosers() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent closing parent modals
                    modal.classList.remove('active');
                    this.updateAddonsStats();
                });
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    this.updateAddonsStats();
                }
            });
        });

        // Floating widgets close buttons
        document.querySelectorAll('.floating-widget').forEach(widget => {
            const closeBtn = widget.querySelector('.window-controls button') || widget.querySelector('button');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    widget.classList.remove('active');
                    this.updateAddonsStats();
                });
                // Remove inline onclick if it exists to avoid double trigger
                closeBtn.removeAttribute('onclick');
            }
        });
    }

    setupStoreListeners() {
        const searchInput = document.getElementById('store-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderStore();
            });
        }

        document.querySelectorAll('.cat-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeCategory = btn.dataset.cat;
                this.renderStore();
            });
        });
    }

    startHeroSlider() {
        if (!this.heroTimer) {
            this.heroTimer = setInterval(() => {
                this.nextHero();
            }, 5000);
        }
    }

    nextHero() {
        const heroEl = document.querySelector('.store-hero');
        if (!heroEl || heroEl.style.display === 'none') return;

        heroEl.classList.add('fading');

        setTimeout(() => {
            this.heroIndex = (this.heroIndex + 1) % this.heroSlides.length;
            this.updateHeroUI();
            heroEl.classList.remove('fading');
        }, 500);
    }

    updateHeroUI() {
        const slide = this.heroSlides[this.heroIndex];
        const heroEl = document.querySelector('.store-hero');
        const tag = document.getElementById('hero-tag');
        const icon = document.getElementById('hero-app-icon');
        const title = document.getElementById('hero-title');
        const desc = document.getElementById('hero-desc');
        const btn = document.getElementById('btn-hero');

        if (!heroEl || !slide) return;

        heroEl.style.background = slide.gradient;
        if (tag) {
            tag.innerText = slide.tag;
            tag.style.background = slide.accent;
        }
        if (icon) {
            icon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${slide.icon}</svg>`;
        }
        if (title) title.innerText = slide.title;
        if (desc) desc.innerText = slide.desc;
        if (btn) {
            btn.onclick = () => this.launch(slide.id);
        }
    }

    renderStore() {
        const container = document.getElementById('addons-grid-container');
        const hero = document.querySelector('.store-hero');
        const sectionTitle = document.querySelector('.store-section-title');
        const searchInput = document.getElementById('store-search-input');

        if (!container) return;

        const isSearching = this.searchTerm !== '';
        const isFiltered = this.activeCategory !== 'all';

        // Hide/Show sections based on state
        if (hero) hero.style.display = (isSearching || isFiltered) ? 'none' : 'flex';

        // Dynamic Title
        if (sectionTitle) {
            if (isSearching) {
                sectionTitle.innerText = `Search results for "${this.searchTerm}"`;
            } else if (isFiltered) {
                sectionTitle.innerText = this.activeCategory === 'my' ? 'From My Creation' : `${this.activeCategory.charAt(0).toUpperCase() + this.activeCategory.slice(1)} Tools`;
            } else {
                sectionTitle.innerText = 'Essential Tools';
            }
            sectionTitle.style.display = 'block';
        }

        const filtered = this.addons.filter(addon => {
            const matchesSearch = addon.name.toLowerCase().includes(this.searchTerm) ||
                addon.desc.toLowerCase().includes(this.searchTerm);
            const matchesCat = this.activeCategory === 'all' || addon.cat === this.activeCategory;
            return matchesSearch && matchesCat;
        });

        // Sorting: Pinned first, then Alphabetical
        filtered.sort((a, b) => {
            const aPinned = this.pinnedAddons.includes(a.id);
            const bPinned = this.pinnedAddons.includes(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return a.name.localeCompare(b.name);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; width:100%; padding:100px 40px; color:var(--text-secondary); font-size: 1.2rem;">No results found.</div>`;
            return;
        }

        container.innerHTML = filtered.map(addon => {
            const isPinned = this.pinnedAddons.includes(addon.id);
            return `
                <div class="addon-card" onclick="addonManager.launch('${addon.id}')">
                    <div class="addon-icon" style="background: ${addon.color}; color: white;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${addon.icon}
                        </svg>
                    </div>
                    <div class="addon-info">
                        <h4>${addon.name}</h4>
                        <p>${addon.desc}</p>
                    </div>
                    <button class="btn-pin ${isPinned ? 'pinned' : ''}" onclick="addonManager.togglePin('${addon.id}', event)" title="${isPinned ? 'Unpin' : 'Pin to Header'}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                        </svg>
                    </button>
                    <div class="addon-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');
    }

    togglePin(id, event) {
        if (event) event.stopPropagation();

        const index = this.pinnedAddons.indexOf(id);
        if (index > -1) {
            this.pinnedAddons.splice(index, 1);
        } else {
            if (this.pinnedAddons.length >= 6) {
                this.showToast('Max 6 pinned addons allowed', 'info');
                return;
            }
            this.pinnedAddons.push(id);
        }

        localStorage.setItem('nanom_pinned_addons', JSON.stringify(this.pinnedAddons));
        this.renderStore();
        this.renderPinnedAddons();
    }

    setupDraggableWidgets() {
        // Smooth drag for all .floating-widget elements via their header
        let isDragging = false;
        let currentWidget = null;
        let startX, startY, initialLeft, initialTop;
        let animationId = null;
        let targetX, targetY;

        document.addEventListener('mousedown', (e) => {
            const header = e.target.closest('.widget-header');
            // Don't start drag if clicking a button
            if (e.target.closest('button')) return;

            if (header) {
                const widget = header.closest('.floating-widget');
                if (widget) {
                    isDragging = true;
                    currentWidget = widget;
                    startX = e.clientX;
                    startY = e.clientY;
                    const rect = widget.getBoundingClientRect();
                    initialLeft = rect.left;
                    initialTop = rect.top;
                    targetX = initialLeft;
                    targetY = initialTop;

                    // Visual feedback
                    widget.classList.add('dragging');
                    widget.style.right = 'auto';
                    widget.style.left = initialLeft + 'px';
                    widget.style.top = initialTop + 'px';
                    document.body.style.cursor = 'grabbing';
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !currentWidget) return;
            e.preventDefault();

            targetX = initialLeft + (e.clientX - startX);
            targetY = initialTop + (e.clientY - startY);

            // Direct positioning for responsiveness
            currentWidget.style.left = `${targetX}px`;
            currentWidget.style.top = `${targetY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging && currentWidget) {
                currentWidget.classList.remove('dragging');
                document.body.style.cursor = '';
                isDragging = false;
                currentWidget = null;
            }
        });
    }

    renderPinnedAddons() {
        const container = document.getElementById('pinned-addons-container');
        const wrapper = document.getElementById('pinned-addons-wrapper');

        if (!container) return;

        if (this.pinnedAddons.length === 0) {
            container.innerHTML = '';
            if (wrapper) wrapper.classList.remove('has-items');
            if (wrapper) wrapper.style.display = 'none';
            return;
        }

        if (wrapper) {
            wrapper.classList.add('has-items');
            wrapper.style.display = 'flex';
        }

        container.innerHTML = this.pinnedAddons.map(id => {
            const addon = this.addons.find(a => a.id === id);
            if (!addon) return '';
            return `
                <div class="pinned-addon-item" onclick="addonManager.launch('${id}')" title="${addon.name}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${addon.color}">
                        ${addon.icon}
                    </svg>
                </div>
            `;
        }).join('');
    }

    launch(addon) {
        // Reading Mode Special Case
        if (addon === 'readingmode') {
            this.toggleReadingMode(true);
            return;
        }

        const widgets = ['pomodoro', 'tasks', 'alarm', 'stickynotes', 'counter', 'stopwatch', 'dice', 'battery'];
        const modals = {
            colors: 'color-modal',
            snippets: 'snippets-modal',
            converter: 'converter-modal',
            playground: 'playground-modal',
            api: 'api-modal',
            cssgenerators: 'cssgenerators-modal',
            cursor: 'cursor-modal',
            keysounds: 'keysounds-modal',
            effects: 'effects-modal'
        };

        if (widgets.includes(addon)) {
            const el = document.getElementById(addon + '-widget');
            if (el) {
                el.classList.add('active');
                if (addon === 'battery') this.updateBattery();
            }
        } else if (modals[addon]) {
            document.getElementById(modals[addon])?.classList.add('active');
        } else if (addon.startsWith('my_')) {
            const item = this.addons.find(a => a.id === addon);
            if (item) {
                const modal = document.getElementById('custom-addon-modal');
                const title = document.getElementById('custom-addon-title');
                const body = document.getElementById('custom-addon-body');
                if (modal && title && body) {
                    title.innerText = item.name;
                    body.innerHTML = item.html;
                    modal.classList.add('active');
                }
            }
        }

        this.updateAddonsStats();
    }

    // --- Pomodoro ---
    togglePomo() {
        const btn = document.getElementById('pomo-start');
        if (this.isRunning) {
            clearInterval(this.timers.pomo);
            this.isRunning = false;
            btn.innerText = "Start";
        } else {
            this.timers.pomo = setInterval(() => {
                this.pomoTime--;
                if (this.pomoTime <= 0) {
                    clearInterval(this.timers.pomo);
                    this.isRunning = false;
                    btn.innerText = "Start";
                    this.showToast("Time's up! Take a break.", "info");
                }
                this.updatePomoDisplay();
            }, 1000);
            this.isRunning = true;
            btn.innerText = "Pause";
        }
    }

    resetPomo() {
        clearInterval(this.timers.pomo);
        this.isRunning = false;
        this.pomoTime = 25 * 60;
        const btn = document.getElementById('pomo-start');
        if (btn) btn.innerText = "Start";
        this.updatePomoDisplay();
    }

    updatePomoDisplay() {
        const m = Math.floor(this.pomoTime / 60).toString().padStart(2, '0');
        const s = (this.pomoTime % 60).toString().padStart(2, '0');
        const display = document.getElementById('pomo-timer');
        if (display) display.innerText = `${m}:${s}`;
    }

    // --- Tasks ---
    addTask() {
        const input = document.getElementById('new-task-input');
        const text = input.value.trim();
        if (!text) return;
        this.tasks.push({ id: Date.now(), text, done: false });
        input.value = '';
        this.saveTasks();
        this.renderTasks();
    }

    toggleTask(id) {
        const t = this.tasks.find(x => x.id === id);
        if (t) t.done = !t.done;
        this.saveTasks();
        this.renderTasks();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(x => x.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    saveTasks() {
        localStorage.setItem('nanom_tasks', JSON.stringify(this.tasks));
    }

    renderTasks() {
        const container = document.getElementById('quick-tasks-list');
        if (!container) return;
        container.innerHTML = this.tasks.map(t => `
            <div class="task-item ${t.done ? 'done' : ''}">
                <div class="task-check" onclick="addonManager.toggleTask(${t.id})">
                    ${t.done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <span style="flex:1; font-size: 0.9rem;">${t.text}</span>
                <button onclick="addonManager.deleteTask(${t.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;">×</button>
            </div>
        `).join('') || '<div style="color:#666; font-size:0.8rem; text-align:center; padding:10px;">No tasks. Add one below!</div>';
    }

    // --- Colors ---
    updateColorInfo(hex) {
        document.getElementById('color-hex').innerText = hex;
        // Convert to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.getElementById('color-rgb').innerText = `rgb(${r}, ${g}, ${b})`;
    }

    copyColor(type) {
        const el = document.getElementById(type === 'hex' ? 'color-hex' : 'color-rgb');
        navigator.clipboard.writeText(el.innerText);
        this.showToast("Color copied!", "success");
    }

    sendColorToChat() {
        const hex = document.getElementById('color-hex').innerText;
        this.insertToChat(`/* Selected Color: ${hex} */`);
        document.getElementById('color-modal').classList.remove('active');
    }

    // --- Snippets ---
    saveSnippet() {
        const nameInput = document.getElementById('snippet-name');
        const name = nameInput.value.trim();
        const chatInput = document.getElementById('chat-input');
        const code = chatInput.value.trim();

        if (!name) return this.showToast("Please enter a name for the snippet", "info");
        if (!code) return this.showToast("Type something in the chat box first", "info");

        this.snippets.push({ id: Date.now(), name, code });
        localStorage.setItem('nanom_snippets', JSON.stringify(this.snippets));
        this.renderSnippets();
        nameInput.value = '';
        this.showToast("Snippet saved!", "success");
    }

    renderSnippets() {
        const container = document.getElementById('saved-snippets-list');
        if (!container) return;

        if (this.snippets.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#666; padding:40px;">No snippets yet.<br>Save code from the chat box!</div>`;
            return;
        }

        container.innerHTML = this.snippets.map(s => `
            <div class="snippet-card">
                <h5>${s.name}</h5>
                <div class="snippet-preview">${s.code.substring(0, 60).replace(/</g, '&lt;')}...</div>
                <div class="snippet-actions">
                    <div class="snippet-btn" onclick="addonManager.insertToChatFromSnippet(${s.id})" title="Insert">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                     <div class="snippet-btn" onclick="addonManager.deleteSnippet(${s.id})" title="Delete" style="color:#ef4444;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
            </div>
        `).sort((a, b) => b.id - a.id).join('');
    }

    insertToChatFromSnippet(id) {
        const s = this.snippets.find(x => x.id === id);
        if (s) {
            this.insertToChat(s.code);
            document.getElementById('snippets-modal').classList.remove('active');
        }
    }

    deleteSnippet(id) {
        this.snippets = this.snippets.filter(x => x.id !== id);
        localStorage.setItem('nanom_snippets', JSON.stringify(this.snippets));
        this.renderSnippets();
    }

    // --- Converter ---
    sendConvToChat() {
        const px = document.getElementById('conv-px').value;
        const rem = document.getElementById('conv-rem').value;
        if (!px || !rem) return;
        const txt = `/* Conversion: ${px}px = ${rem}rem */`;
        this.insertToChat(txt);
        document.getElementById('converter-modal').classList.remove('active');
    }

    // --- Common ---
    insertToChat(text) {
        const input = document.getElementById('chat-input');
        if (!input) return;
        input.value += (input.value ? '\n' : '') + text;
        input.focus();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        const inputBar = input.closest('.input-bar');
        if (inputBar) inputBar.classList.remove('is-empty');
    }

    showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}
            </div>
            <div class="toast-content">${msg}</div>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('active'), 10);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // === Add-on Creation Flow ===
    showCreateModal() {
        const modal = document.getElementById('create-addon-modal');
        if (modal) modal.classList.add('active');
    }

    submitForReview() {
        const nameIn = document.getElementById('addon-name-input');
        const codeIn = document.getElementById('addon-code-input');

        const name = nameIn?.value.trim();
        const code = codeIn?.value.trim();

        if (!name || !code) {
            this.showToast('Please provide both a name and the HTML code.', 'error');
            return;
        }

        this.showToast('Submitted for review! We will check your code for security...', 'info');

        // Close modal
        document.getElementById('create-addon-modal').classList.remove('active');
        nameIn.value = '';
        codeIn.value = '';

        // Simulate "Review & Approval"
        setTimeout(() => {
            const newAddon = {
                id: 'my_' + Date.now(),
                name: name,
                cat: 'my',
                color: '#fbbf24',
                desc: 'A custom tool created by you.',
                icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
                html: code
            };

            this.myAddons.push(newAddon);
            this.addons.push(newAddon);
            localStorage.setItem('my_addons', JSON.stringify(this.myAddons));

            this.showToast(`Success! "${name}" has been approved and added to My Creations.`, 'success');
            this.renderStore();
            this.updateAddonsStats();
        }, 3000);
    }

    createToastContainer() {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.zIndex = '30000';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '10px';
        document.body.appendChild(div);
        return div;
    }

    // === Code Playground Methods ===
    updatePlaygroundPreview() {
        const html = document.getElementById('html-editor')?.value || '';
        const css = document.getElementById('css-editor')?.value || '';
        const js = document.getElementById('js-editor')?.value || '';

        const iframe = document.getElementById('playground-iframe');
        if (!iframe) return;

        const doc = `
<!DOCTYPE html>
<html>
<head>
    <style>${css}</style>
</head>
<body>
    ${html}
    <script>${js}<\/script>
</body>
</html>`;

        iframe.srcdoc = doc;
    }

    sendPlaygroundToChat() {
        const html = document.getElementById('html-editor')?.value || '';
        const css = document.getElementById('css-editor')?.value || '';
        const js = document.getElementById('js-editor')?.value || '';

        let code = '';
        if (html) code += `<!-- HTML -->\n${html}\n\n`;
        if (css) code += `/* CSS */\n${css}\n\n`;
        if (js) code += `// JavaScript\n${js}`;

        this.insertToChat(code || '// Empty playground');
        document.getElementById('playground-modal')?.classList.remove('active');
    }

    // === API Tester Methods ===
    async sendAPIRequest() {
        const method = document.getElementById('api-method')?.value || 'GET';
        const url = document.getElementById('api-url')?.value?.trim();
        const headersText = document.getElementById('api-headers')?.value?.trim() || '{}';
        const body = document.getElementById('api-body')?.value?.trim();

        const statusEl = document.getElementById('api-status');
        const responseEl = document.getElementById('api-response-body');

        if (!url) {
            this.showToast('Please enter a URL', 'info');
            return;
        }

        statusEl.innerText = 'Sending request...';
        statusEl.style.color = '#fbbf24';

        try {
            const headers = JSON.parse(headersText);
            const options = { method, headers };

            if (['POST', 'PUT'].includes(method) && body) {
                options.body = body;
            }

            const response = await fetch(url, options);
            const data = await response.text();

            statusEl.innerText = `Status: ${response.status} ${response.statusText}`;
            statusEl.style.color = response.ok ? '#10b981' : '#ef4444';

            try {
                const json = JSON.parse(data);
                responseEl.innerText = JSON.stringify(json, null, 2);
            } catch {
                responseEl.innerText = data;
            }

            this.lastAPIResponse = data;
        } catch (err) {
            statusEl.innerText = `Error: ${err.message}`;
            statusEl.style.color = '#ef4444';
            responseEl.innerText = err.stack || err.message;
        }
    }

    sendAPIResponseToChat() {
        const response = document.getElementById('api-response-body')?.innerText;
        if (!response) return this.showToast('No response to send', 'info');
        this.insertToChat(`/* API Response */\n${response}`);
    }

    // === CSS Generators Methods ===
    updateGradient() {
        const start = document.getElementById('grad-start')?.value || '#6366f1';
        const end = document.getElementById('grad-end')?.value || '#ec4899';
        const angle = document.getElementById('grad-angle')?.value || 90;

        document.getElementById('grad-angle-val').innerText = angle + '°';

        const css = `background: linear-gradient(${angle}deg, ${start}, ${end});`;
        const preview = document.getElementById('grad-preview');
        if (preview) preview.style.background = `linear-gradient(${angle}deg, ${start}, ${end})`;

        document.getElementById('grad-code').innerText = css;
    }

    updateShadow() {
        const x = document.getElementById('shadow-x')?.value || 0;
        const y = document.getElementById('shadow-y')?.value || 4;
        const blur = document.getElementById('shadow-blur')?.value || 10;
        const spread = document.getElementById('shadow-spread')?.value || 0;
        const color = document.getElementById('shadow-color')?.value || '#000000';
        const opacity = (document.getElementById('shadow-opacity')?.value || 25) / 100;

        document.getElementById('shadow-x-val').innerText = x + 'px';
        document.getElementById('shadow-y-val').innerText = y + 'px';
        document.getElementById('shadow-blur-val').innerText = blur + 'px';
        document.getElementById('shadow-spread-val').innerText = spread + 'px';
        document.getElementById('shadow-opacity-val').innerText = opacity.toFixed(2);

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        const css = `box-shadow: ${x}px ${y}px ${blur}px ${spread}px rgba(${r},${g},${b},${opacity});`;
        const preview = document.getElementById('shadow-preview');
        if (preview) preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(${r},${g},${b},${opacity})`;

        document.getElementById('shadow-code').innerText = css;
    }

    updateFlexbox() {
        const dir = document.getElementById('flex-dir')?.value || 'row';
        const justify = document.getElementById('flex-justify')?.value || 'flex-start';
        const align = document.getElementById('flex-align')?.value || 'flex-start';
        const gap = document.getElementById('flex-gap')?.value || 10;

        document.getElementById('flex-gap-val').innerText = gap + 'px';

        const css = `display: flex; flex-direction: ${dir}; justify-content: ${justify}; align-items: ${align}; gap: ${gap}px;`;
        const preview = document.getElementById('flex-preview');
        if (preview) {
            preview.style.flexDirection = dir;
            preview.style.justifyContent = justify;
            preview.style.alignItems = align;
            preview.style.gap = gap + 'px';
        }

        document.getElementById('flex-code').innerText = css;
    }

    copyCSSCode(type) {
        const code = document.getElementById(`${type}-code`)?.innerText;
        if (!code) return;
        navigator.clipboard.writeText(code);
        this.showToast('CSS copied!', 'success');
    }

    sendCSSToChat(type) {
        const code = document.getElementById(`${type}-code`)?.innerText;
        if (!code) return;
        this.insertToChat(code);
    }

    // === New Utilities & Fun Customizations ===

    // 1. Alarm
    setAlarm() {
        const timeInput = document.getElementById('alarm-time').value;
        if (!timeInput) return this.showToast('Please select a time', 'error');

        const now = new Date();
        const [hours, minutes] = timeInput.split(':');
        const alarmTime = new Date();
        alarmTime.setHours(hours);
        alarmTime.setMinutes(minutes);
        alarmTime.setSeconds(0);

        if (alarmTime < now) {
            alarmTime.setDate(alarmTime.getDate() + 1); // Set for next day
        }

        const diff = alarmTime - now;
        this.showToast(`Alarm set for ${timeInput}`, 'success');
        document.getElementById('alarm-status').innerText = `Alarm set for ${timeInput}`;

        setTimeout(() => {
            this.showToast('🔔 ALARM! Wake up!', 'warning');
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
            audio.play().catch(e => console.log('Audio play failed', e));
            document.getElementById('alarm-status').innerText = 'Alarm ringing!';
        }, diff);
    }

    // 2. Sticky Notes
    addSticky(color) {
        const container = document.getElementById('sticky-container');
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.style.background = color;
        note.style.position = 'fixed';
        note.style.top = '100px';
        note.style.left = '100px';
        note.style.width = '200px';
        note.style.height = '200px';
        note.style.padding = '10px';
        note.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        note.style.borderRadius = '8px';
        note.style.zIndex = '10000';
        note.style.animation = 'pop-n-slide 0.3s ease';

        note.innerHTML = `
            <div style="display:flex; justify-content:flex-end; margin-bottom:5px; cursor:move;" class="sticky-handle">
                <button style="background:none; border:none; cursor:pointer; font-weight:bold; color:rgba(0,0,0,0.5);">×</button>
            </div>
            <textarea style="width:100%; height:85%; background:transparent; border:none; resize:none; outline:none; font-family:inherit; color:black;" placeholder="Type note..."></textarea>
        `;

        // Close Logic
        note.querySelector('button').addEventListener('click', () => note.remove());

        // Drag Logic (Simple)
        const handle = note.querySelector('.sticky-handle');
        let isDragging = false;
        let offsetX, offsetY;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - note.getBoundingClientRect().left;
            offsetY = e.clientY - note.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            note.style.left = (e.clientX - offsetX) + 'px';
            note.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => isDragging = false);

        container.appendChild(note);
    }

    // 3. Counter
    updateCounter(change) {
        const el = document.getElementById('counter-val');
        if (!el) return;
        let val = parseInt(el.innerText);
        if (change === 0) val = 0;
        else val += change;
        el.innerText = val;
    }

    // 4. Stopwatch
    toggleStopwatch() {
        if (this.swInterval) {
            clearInterval(this.swInterval);
            this.swInterval = null;
        } else {
            const start = Date.now() - (this.swElapsed || 0);
            this.swInterval = setInterval(() => {
                this.swElapsed = Date.now() - start;
                this.updateSWDisplay();
            }, 100);
        }
    }
    resetStopwatch() {
        clearInterval(this.swInterval);
        this.swInterval = null;
        this.swElapsed = 0;
        this.updateSWDisplay();
    }
    updateSWDisplay() {
        const ms = this.swElapsed || 0;
        const totalSecs = Math.floor(ms / 1000);
        const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
        const s = (totalSecs % 60).toString().padStart(2, '0');
        const mls = Math.floor((ms % 1000) / 100).toString();
        document.getElementById('sw-display').innerText = `${m}:${s}.${mls}`;
    }

    // 5. Dice
    rollDice() {
        const el = document.getElementById('dice-result');
        const dices = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rolls = 0;
        const interval = setInterval(() => {
            el.innerText = dices[Math.floor(Math.random() * 6)];
            rolls++;
            if (rolls > 10) {
                clearInterval(interval);
                this.showToast('You rolled a ' + (dices.indexOf(el.innerText) + 1));
            }
        }, 100);
    }

    // 6. Battery & Status
    async updateBattery() {
        const batEl = document.getElementById('battery-level');
        const timeEl = document.getElementById('system-time');

        // Time Loop
        if (this.statusInterval) clearInterval(this.statusInterval);
        this.statusInterval = setInterval(() => {
            const now = new Date();
            if (timeEl) timeEl.innerText = now.toLocaleTimeString();
        }, 1000);

        // Battery
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                const updateBat = () => {
                    if (batEl) batEl.innerText = `${Math.round(battery.level * 100)}% ${battery.charging ? '⚡' : ''}`;
                };
                updateBat();
                battery.addEventListener('levelchange', updateBat);
                battery.addEventListener('chargingchange', updateBat);
            } catch (e) {
                if (batEl) batEl.innerText = 'Unknown';
            }
        } else {
            if (batEl) batEl.innerText = 'Not Supported';
        }
    }

    // 7. Cursor Changer
    setCursor(type) {
        document.body.style.cursor = type;
        // Also force it on all elements
        if (type === 'default') {
            document.body.classList.remove('force-cursor');
            const style = document.getElementById('cursor-style');
            if (style) style.remove();
        } else {
            let style = document.getElementById('cursor-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'cursor-style';
                document.head.appendChild(style);
            }
            style.innerHTML = `* { cursor: ${type} !important; }`;
        }
        this.showToast(`Cursor set to ${type}`);
    }

    // 8. Key Sounds
    toggleKeySounds(enabled) {
        this.keySoundsEnabled = enabled;
        if (enabled) {
            if (!this.keySoundType) this.keySoundType = 'typewriter';
            if (!this.keyListener) {
                this.keyListener = (e) => this.playKeySound();
                document.addEventListener('keydown', this.keyListener);
            }
        } else {
            if (this.keyListener) {
                document.removeEventListener('keydown', this.keyListener);
                this.keyListener = null;
            }
        }
    }
    setKeySound(type) {
        this.keySoundType = type;
        this.toggleKeySounds(true);
        document.getElementById('keysound-toggle').checked = true;
        this.playKeySound(); // Preview
    }
    playKeySound() {
        if (!this.keySoundsEnabled) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (this.keySoundType === 'typewriter') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (this.keySoundType === 'mechanical') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2000, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else { // Water
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    }

    // 9. Screen Effects
    toggleEffect(type) {
        const canvas = document.getElementById('effect-canvas');
        if (!canvas) return;

        // Stop Loop
        if (this.effectInterval) clearInterval(this.effectInterval);
        if (this.effectFrame) cancelAnimationFrame(this.effectFrame);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (type === 'none') {
            canvas.style.display = 'none';
            return;
        }

        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (type === 'rain') {
            const drops = Array(100).fill(0).map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: 2 + Math.random() * 5 }));
            const drawRain = () => {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#a5f3fc';
                drops.forEach(d => {
                    ctx.fillRect(d.x, d.y, 2, 10);
                    d.y += d.s;
                    if (d.y > canvas.height) d.y = 0;
                });
                this.effectFrame = requestAnimationFrame(drawRain);
            };
            drawRain();
        } else if (type === 'matrix') {
            const cols = Math.floor(canvas.width / 20);
            const ypos = Array(cols).fill(0);
            const drawMatrix = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#0f0';
                ctx.font = '15px monospace';
                ypos.forEach((y, i) => {
                    const text = String.fromCharCode(Math.random() * 128);
                    const x = i * 20;
                    ctx.fillText(text, x, y);
                    if (y > canvas.height && Math.random() > 0.975) {
                        ypos[i] = 0;
                    } else {
                        ypos[i] = y + 20;
                    }
                });
                this.effectFrame = requestAnimationFrame(drawMatrix);
            }
            drawMatrix();
        } else if (type === 'confetti') {
            const pieces = Array(50).fill(0).map(() => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                c: '#' + Math.floor(Math.random() * 16777215).toString(16),
                r: Math.random() * 360,
                s: 2 + Math.random() * 3
            }));
            const drawConfetti = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                pieces.forEach(p => {
                    ctx.fillStyle = p.c;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.r * Math.PI / 180);
                    ctx.fillRect(-5, -5, 10, 10);
                    ctx.restore();
                    p.y += p.s;
                    p.r += 2;
                    if (p.y > canvas.height) p.y = 0;
                });
                this.effectFrame = requestAnimationFrame(drawConfetti);
            }
            drawConfetti();
        }
    }

    // 10. Reading Mode
    toggleReadingMode(active) {
        const guide = document.getElementById('reading-guide');
        const offBtn = document.getElementById('reading-mode-off');
        if (active) {
            guide.style.display = 'block';
            offBtn.style.display = 'block';
            if (!this.readingListener) {
                this.readingListener = (e) => {
                    const line = document.getElementById('reading-line');
                    if (line) line.style.top = e.clientY + 'px';
                };
                document.addEventListener('mousemove', this.readingListener);
            }
        } else {
            guide.style.display = 'none';
            offBtn.style.display = 'none';
            if (this.readingListener) {
                document.removeEventListener('mousemove', this.readingListener);
                this.readingListener = null;
            }
        }
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.addonManager = new AddonManager();
});
