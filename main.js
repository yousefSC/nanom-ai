// Classes are now loaded globally via script tags
// const { AudioVisualizer, PhysicsEngine, StorageSystem, MessageParser, SettingsModal, AiToolsSheet, ProjectManager, CloudIntegrations, GeminiManager, SupabaseManager } = window;

// Global function to force show auth modal - available immediately
window.forceShowAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        alert('Auth Modal not found!');
        return;
    }
    console.log('forceShowAuthModal called');
    modal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; z-index: 999999 !important; position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.8) !important; align-items: center !important; justify-content: center !important;';
    modal.classList.add('active');
};

// Global function to hide auth modal
window.hideAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) errorMsg.style.display = 'none';
};

// Global Sign In handler
window.handleAuthSignIn = async function () {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error-msg');

    if (errorMsg) errorMsg.style.display = 'none';

    if (!window.supabaseManager) {
        alert('Supabase not initialized');
        return;
    }

    const { data, error } = await window.supabaseManager.signIn(email, password);
    if (error) {
        if (errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        }
    } else {
        window.hideAuthModal();
    }
};

// Global Google Sign In handler
window.handleAuthGoogle = async function () {
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) errorMsg.style.display = 'none';

    if (!window.supabaseManager) {
        alert('Supabase not initialized');
        return;
    }

    // Google Sign In initiates a redirect, so we don't usually get a result immediately
    const { data, error } = await window.supabaseManager.signInWithGoogle();

    if (error) {
        if (errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        }
    }
    // Redirect will happen automatically if successful
};

// Global GitHub Sign In handler
window.handleAuthGithub = async function () {
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) errorMsg.style.display = 'none';

    if (!window.supabaseManager) {
        alert('Supabase not initialized');
        return;
    }

    // GitHub Sign In initiates a redirect
    const { data, error } = await window.supabaseManager.signInWithGithub();

    if (error) {
        if (errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        }
    }
    // Redirect will happen automatically if successful
};

// Global Sign Up handler
window.handleAuthSignUp = async function () {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error-msg');

    if (errorMsg) errorMsg.style.display = 'none';

    if (!window.supabaseManager) {
        alert('Supabase not initialized');
        return;
    }

    const { data, error } = await window.supabaseManager.signUp(email, password);
    if (error) {
        if (errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        }
    } else {
        alert('Check your email for confirmation link!');
        window.hideAuthModal();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Access classes from window
    const AudioVisualizer = window.AudioVisualizer;
    const PhysicsEngine = window.PhysicsEngine;
    const StorageSystem = window.StorageSystem;
    const MessageParser = window.MessageParser;
    const SettingsModal = window.SettingsModal;
    const AiToolsSheet = window.AiToolsSheet;
    const ProjectManager = window.ProjectManager;
    const CloudIntegrations = window.CloudIntegrations;
    const GeminiManager = window.GeminiManager;
    const SupabaseManager = window.SupabaseManager;

    // Core Elements
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatInput = document.getElementById('chat-input');
    const micBtn = document.getElementById('mic-btn');
    const visualizerOverlay = document.getElementById('visualizer');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const optionBtn = document.getElementById('option-btn');
    const compassBtn = document.getElementById('compass-btn');

    const attachBtn = document.getElementById('attachment-btn');
    const attachMenu = document.getElementById('attachment-menu');
    const fileInput = document.getElementById('file-input');

    // Modules & Managers
    const audioViz = new AudioVisualizer(visualizerOverlay, document.querySelectorAll('.visualizer-overlay .bar'));
    const physics = new PhysicsEngine(messagesContainer);
    const settingsManager = new SettingsModal('settings-modal', StorageSystem);
    const aiToolsManager = new AiToolsSheet('ai-tools-sheet');
    const cloudManager = new CloudIntegrations();
    const supabaseManager = new SupabaseManager();
    window.supabaseManager = supabaseManager; // Make globally accessible

    const previewModal = document.getElementById('modal-overlay');
    const projectManager = new ProjectManager(messagesContainer, previewModal);

    // Gemini Integration
    const gemini = new GeminiManager('AIzaSyA_C6BvG9W5zcaJ8emmC0g8aQPBVoZand0');
    let chatHistory = [];
    let currentSessionId = null;

    // --- Session Rendering Logic ---
    const sessionsList = document.getElementById('sessions-list');

    async function loadSessions() {
        if (!supabaseManager.isReady() || !supabaseManager.getUser()) {
            if (sessionsList) {
                sessionsList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">Sign in to see your chats.</div>';
            }
            return;
        }

        const sessions = await supabaseManager.getSessions();
        renderSessions(sessions);
    }

    function renderSessions(sessions) {
        if (!sessionsList) return;

        if (sessions.length === 0) {
            sessionsList.innerHTML = '<div class="empty-sessions-msg" style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">No recent chats. Start a new one!</div>';
            return;
        }

        sessionsList.innerHTML = '';

        // Group sessions (simple implementation for now: just list them)
        const title = document.createElement('div');
        title.className = 'session-group-title';
        title.innerText = 'Recent Chats';
        sessionsList.appendChild(title);

        sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = `session-item ${currentSessionId === session.id ? 'active' : ''}`;

            const icon = `<span class="session-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>`;

            item.innerHTML = `
                ${icon}
                <span class="session-text">${session.title || 'Untitled Chat'}</span>
                <button class="delete-session-btn" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px; opacity:0; transition:opacity 0.3s; margin-left:auto;">×</button>
            `;

            // Hover effects handled by CSS (mostly) but for the delete btn:
            item.addEventListener('mouseenter', () => { item.querySelector('.delete-session-btn').style.opacity = '1'; });
            item.addEventListener('mouseleave', () => { item.querySelector('.delete-session-btn').style.opacity = '0'; });

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-session-btn')) {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                } else {
                    loadSession(session.id);
                }
            });

            sessionsList.appendChild(item);
        });
    }

    async function loadSession(sessionId) {
        if (!supabaseManager.isReady()) return;

        const sessions = await supabaseManager.getSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            currentSessionId = sessionId;
            chatHistory = session.history || [];

            // UI Updates
            welcomeScreen.style.display = 'none';
            messagesContainer.style.display = 'flex';
            messagesContainer.innerHTML = '';
            toggleHeaderActions(true);

            // Re-render messages
            chatHistory.forEach(msg => {
                const type = msg.role === 'user' ? 'user' : 'ai';
                const text = msg.parts[0].text;
                addMessage(text, type);
            });

            // Highlight in sidebar
            renderSessions(sessions);
        }
    }

    async function handleDeleteSession(sessionId) {
        if (confirm('Delete this chat?')) {
            const success = await supabaseManager.deleteSession(sessionId);
            if (success) {
                if (currentSessionId === sessionId) resetChat();
                loadSessions();
            }
        }
    }

    // Header Actions (Notifications & Chat Options)
    const notifBtn = document.getElementById('notif-btn');
    const chatOptionsWrapper = document.querySelector('.chat-options-wrapper');

    // Pinned Addons Toggle Logic (Event Delegation for Robustness)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.pinned-addons-trigger');
        if (trigger) {
            e.stopPropagation(); // Stop bubbling
            const wrapper = document.getElementById('pinned-addons-wrapper');
            if (wrapper) wrapper.classList.toggle('active');
        }
    });

    const subscribeBtn = document.getElementById('subscribe-btn');

    function toggleHeaderActions(show) {
        if (notifBtn) {
            // Show notification button ONLY when chat is EMPTY (show = false)
            notifBtn.classList.toggle('hide-action', show);
            notifBtn.style.display = show ? 'none' : 'flex';
        }
        if (chatOptionsWrapper) {
            // Show chat options ONLY when chat is ACTIVE (show = true)
            chatOptionsWrapper.classList.toggle('hide-action', !show);
            chatOptionsWrapper.style.display = show ? 'flex' : 'none';
        }
        if (subscribeBtn) {
            // Show subscribe button ONLY when chat is EMPTY (show = false)
            subscribeBtn.classList.toggle('hide-action', show);
            subscribeBtn.style.display = show ? 'none' : 'flex';
        }
    }

    // Initial State: Notification visible, Options hidden (Empty Chat)
    toggleHeaderActions(false);

    // New Buttons
    // --- Moved Listeners for Reliability ---
    if (toolsBtn) toolsBtn.addEventListener('click', () => {
        console.log('AI Tools Clicked');
        if (aiToolsManager) aiToolsManager.toggle();
    });

    if (attachBtn && attachMenu) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Attachment Btn Clicked');
            attachMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (attachMenu.classList.contains('active') && !attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
                attachMenu.classList.remove('active');
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const count = e.target.files.length;
                chatInput.value = `[Attached ${count} file${count > 1 ? 's' : ''}] ` + chatInput.value;
                chatInput.focus();
            }
        });
    }

    // Real Cloud Handlers
    function handleCloudSelection(fileData) {
        addMessage(`Attached: [${fileData.source}] ${fileData.name}`, 'system');
        chatInput.value = `[Linked File: ${fileData.name} (${fileData.url})] ` + chatInput.value;
        chatInput.focus();
    }

    function handleProjectSelection(project) {
        addMessage(`Referencing Project: ${project.title}`, 'system');
        // Prepend #ProjectName to the input
        const refText = `#${project.title.replace(/\s+/g, '')} `;
        if (!chatInput.value.includes(refText)) {
            chatInput.value = refText + chatInput.value;
        }
        chatInput.focus();
        if (document.getElementById('project-picker-modal')) {
            document.getElementById('project-picker-modal').classList.remove('active');
        }
    }

    function openProjectPicker() {
        const pickerModal = document.getElementById('project-picker-modal');
        const pickerList = document.getElementById('project-picker-list');
        if (!pickerModal || !pickerList) return;

        // Use mock data similar to LibraryManager
        const projects = [
            { id: 1, title: 'Portfolio Site', type: 'HTML' },
            { id: 2, title: 'Task Manager App', type: 'Android' },
            { id: 3, title: 'API Documentation', type: 'Docs' },
            { id: 4, title: 'E-commerce UI', type: 'HTML' },
            { id: 5, title: 'Promotion Guide', type: 'Docs' }
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
            item.onclick = () => handleProjectSelection(proj);
            pickerList.appendChild(item);
        });

        pickerModal.classList.add('active');
    }


    ['opt-drive', 'opt-onedrive', 'opt-file', 'opt-image', 'opt-camera', 'opt-project'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (id === 'opt-drive') {
                    cloudManager.pickFromGoogleDrive(handleCloudSelection);
                    attachMenu.classList.remove('active');
                }
                else if (id === 'opt-onedrive') {
                    cloudManager.pickFromOneDrive(handleCloudSelection);
                    attachMenu.classList.remove('active');
                }
                else if (id === 'opt-project') {
                    openProjectPicker();
                    attachMenu.classList.remove('active');
                }
                else {
                    if (fileInput) fileInput.click();
                    attachMenu.classList.remove('active');
                }
            });
        }
    });


    // Initial Listeners
    if (optionBtn) optionBtn.addEventListener('click', () => settingsManager.show());


    // Compass / Generation Mode
    let isGenerationMode = false;
    if (compassBtn) {
        compassBtn.addEventListener('click', () => {
            isGenerationMode = !isGenerationMode;
            compassBtn.style.color = isGenerationMode ? '#818cf8' : '';
            compassBtn.style.background = isGenerationMode ? 'rgba(129, 140, 248, 0.1)' : '';
            chatInput.placeholder = isGenerationMode ? "Describe Project to Build..." : "Ask Nanom...";
        });
    }

    // Sidebar Toggle
    const toggleBtn = document.createElement('button');
    const chevronLeft = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    const chevronRight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    toggleBtn.innerHTML = chevronLeft;
    toggleBtn.style.cssText = 'position: absolute; right: -12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-app-alt); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s;';
    sidebar.appendChild(toggleBtn);

    let isCollapsed = false;
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        toggleBtn.innerHTML = isCollapsed ? chevronRight : chevronLeft;
    });

    // New Chat
    newChatBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) {
            newChatBtn.classList.add('shake-anim');
            setTimeout(() => newChatBtn.classList.remove('shake-anim'), 400);
        } else {
            resetChat();
        }
    });

    // Inital session load
    loadSessions();

    // Input Resize
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Mic
    let isMicActive = false;
    micBtn.addEventListener('click', () => {
        isMicActive = !isMicActive;
        if (isMicActive) {
            micBtn.style.color = '#818cf8';
            audioViz.start();
        } else {
            micBtn.style.color = '';
            audioViz.stop();
        }
    });

    // Send Logic
    sendBtn.addEventListener('click', () => handleSend());
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    async function handleSend(overrideText) {
        const text = overrideText || chatInput.value.trim();
        if (!text) return;

        // UI Updates
        welcomeScreen.style.display = 'none';
        messagesContainer.style.display = 'flex';
        toggleHeaderActions(true); // Show header actions when chat starts

        if (isGenerationMode) {
            const type = text.toLowerCase().includes('android') ? 'Android' :
                text.toLowerCase().includes('html') ? 'HTML' : 'Code';

            projectManager.startGeneration(type, text);
            if (!overrideText) chatInput.value = '';
            chatInput.style.height = 'auto';
            return;
        }

        // Add User Message
        addMessage(text, 'user');
        if (!overrideText) chatInput.value = '';
        chatInput.style.height = 'auto';

        // Update History locally
        chatHistory.push({ role: 'user', parts: [{ text }] });

        // Show "Thinking" Pulsing Dots
        const loadingId = addLoadingIndicator();

        // Gemini API Call
        const response = await gemini.generateResponse(chatHistory, text);

        removeLoadingIndicator(loadingId);

        // Update History with AI response
        chatHistory.push({ role: 'model', parts: [{ text: response }] });

        // --- Save to Supabase ---
        if (supabaseManager.isReady() && supabaseManager.getUser()) {
            // If new session, generate a title
            let title = chatHistory[0].parts[0].text;
            if (title.length > 30) title = title.substring(0, 27) + '...';

            const session = await supabaseManager.upsertSession(currentSessionId, title, chatHistory);
            if (session && !currentSessionId) {
                currentSessionId = session.id;
                loadSessions(); // Refresh sidebar to show new chat
            }
        }

        const parsed = MessageParser.parseResponse(response);
        const aiMsg = addMessage('', 'ai');
        const finalText = typeof parsed === 'string' ? parsed : (parsed.text || JSON.stringify(parsed, null, 2));
        animateText(aiMsg, finalText);
    }

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;

        if (type === 'user') {
            div.style.cssText = 'align-self: flex-end; background: var(--accent-primary); padding: 12px 16px; border-radius: 20px 20px 4px 20px; margin-bottom: 20px; color: #fff; border: 1px solid var(--border-color); max-width: 80%;';
        } else if (type === 'system') {
            div.style.cssText = 'align-self: center; background: rgba(128,128,128,0.15); padding: 6px 12px; border-radius: 12px; margin-bottom: 20px; color: var(--text-secondary); font-size: 0.85rem; border: 1px solid var(--border-color);';
        } else {
            // AI default
            div.style.cssText = 'align-self: flex-start; padding: 12px 16px; margin-bottom: 20px; color: var(--text-primary); max-width: 80%; line-height: 1.6;';
        }

        div.innerText = text;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return div;
    }

    function addLoadingIndicator() {
        const div = document.createElement('div');
        div.id = 'loading-' + Date.now();
        div.style.cssText = 'align-self: flex-start; margin-bottom: 20px; color: var(--accent-primary); font-size: 24px; padding-left: 20px;';
        div.innerHTML = '<span class="pulsing-dot">.</span><span class="pulsing-dot" style="animation-delay: 0.2s">.</span><span class="pulsing-dot" style="animation-delay: 0.4s">.</span>';

        // Add pulse animation style dynamically if not exists
        if (!document.getElementById('pulse-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-style';
            style.innerHTML = `
                .pulsing-dot { animation: pulseDot 1s infinite; opacity: 0.5; display: inline-block; transform-origin: center; }
                @keyframes pulseDot { 0%, 100% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
                .word-fade-in { animation: wordFade 0.3s forwards; opacity: 0; display: inline-block; white-space: pre-wrap; }
                @keyframes wordFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
        }

        messagesContainer.appendChild(div);
        return div.id;
    }

    function removeLoadingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function animateText(element, text) {
        const words = text.split(' ');
        let i = 0;

        function type() {
            if (i < words.length) {
                const span = document.createElement('span');
                span.innerText = words[i] + ' ';
                span.className = 'word-fade-in';
                element.appendChild(span);
                i++;
                requestAnimationFrame(() => setTimeout(type, 50));
            }
        }
        type();
    }

    function resetChat() {
        welcomeScreen.style.display = 'block';
        messagesContainer.style.display = 'none';
        messagesContainer.innerHTML = '';
        chatInput.value = '';
        chatHistory = []; // Clear AI History
        currentSessionId = null; // Reset session ID for new chats
        toggleHeaderActions(false); // Hide header actions when chat is cleared

        // Refresh sidebar highlighting
        const sessions = Array.from(document.querySelectorAll('.session-item'));
        sessions.forEach(s => s.classList.remove('active'));
    }

    // --- Dynamic Suggestion System ---
    const mainSuggestionsGrid = document.getElementById('suggestions-grid');
    const subSuggestionsGrid = document.getElementById('sub-suggestions-grid');
    const backBtnContainer = document.getElementById('suggestions-back-btn-container');
    const backBtn = document.getElementById('back-suggestions');

    const suggestionData = {
        python: [
            { title: "Analysis Script", desc: "Create a Python script for complex data visualization and cleaning" },
            { title: "Flask Server", desc: "Build a robust RESTful API backend using Flask and SQLAlchemy" },
            { title: "Automation", desc: "Write a script to automate repetitive file management and reporting" },
            { title: "Machine Learning", desc: "Scaffold a basic predictive model using Scikit-Learn for data classification" }
        ],
        react: [
            { title: "Custom Hooks", desc: "Design advanced React hooks for state management and local storage" },
            { title: "Animation Engine", desc: "Implement Framer Motion transitions for a smooth, app-like UI experience" },
            { title: "Next.js Setup", desc: "Initialize a high-performance Next.js project with Tailwind CSS and TypeScript" },
            { title: "UI Components", desc: "Build a library of reusable glassmorphism components with accessible roles" }
        ],
        debug: [
            { title: "Logic Trace", desc: "Debug this complex JavaScript logic and fix potential memory leaks" },
            { title: "CORS Config", desc: "Resolve Cross-Origin resource sharing issues for my local development" },
            { title: "Style Audit", desc: "Inspect my CSS for layout shifts and z-index overlap issues" },
            { title: "API Errors", desc: "Trace failed fetch requests and handle common HTTP error codes gracefully" }
        ],
        deploy: [
            { title: "Cloud Vercel", desc: "Automate my CI/CD pipeline for instant deployment to Vercel" },
            { title: "Docker Build", desc: "Containerize my full-stack application for consistent environment scaling" },
            { title: "AWS Hosting", desc: "Setup a secure S3 and CloudFront distribution for my static assets" },
            { title: "GitHub Logic", desc: "Configure GitHub Actions to run tests and linters on every pull request" }
        ]
    };

    function renderSubSuggestions(topic) {
        const data = suggestionData[topic];
        if (!data) return;

        // Transition Hide Main
        mainSuggestionsGrid.style.display = 'none';
        subSuggestionsGrid.style.display = 'flex'; // Stack layout

        subSuggestionsGrid.innerHTML = data.map(item => `
            <div class="crystal-card sub-suggestion" data-prompt="${item.desc}">
                <div class="sub-content">
                    <h3>${item.title}</h3>
                    <p>${item.desc}</p>
                </div>
                <div class="sub-send-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </div>
            </div>
        `).join('');

        backBtnContainer.style.display = 'block';

        // Bind sub-suggestion clicks
        subSuggestionsGrid.querySelectorAll('.sub-suggestion').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                handleSend(prompt);
            });
        });
    }

    function resetToMainSuggestions() {
        subSuggestionsGrid.style.display = 'none';
        mainSuggestionsGrid.style.display = 'grid';
        backBtnContainer.style.display = 'none';
    }

    function bindMainSuggestionListeners() {
        mainSuggestionsGrid.querySelectorAll('.crystal-card').forEach(card => {
            card.addEventListener('click', () => {
                const topic = card.dataset.topic;
                if (topic) renderSubSuggestions(topic);
            });
        });
    }

    if (backBtn) backBtn.addEventListener('click', resetToMainSuggestions);
    bindMainSuggestionListeners();

    // Modal & Card Logic
    const modal = document.getElementById('modal-overlay');
    const closeModalBtn = document.querySelector('.close-modal');
    const viewButtons = document.querySelectorAll('.modal-toggle button');
    const viewCode = document.querySelector('.view-code');
    const viewPreview = document.querySelector('.view-preview');

    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    // View Toggle with Rotation Logic
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.innerText === 'Code') {
                viewCode.style.display = 'block';
                viewPreview.style.display = 'none';
            } else {
                viewCode.style.display = 'none';
                viewPreview.style.display = 'flex';
                // Rotation Logic: Frame rotates 90deg, Screen content rotates -90deg to keep orientation if needed
                const frame = viewPreview.querySelector('.device-frame');
                const screen = viewPreview.querySelector('.screen-content');

                frame.style.transition = 'transform 0.5s ease';
                screen.style.transition = 'transform 0.5s ease';

                // Simulate "Landscape" Mode
                frame.style.transform = 'rotate(90deg) scale(0.8)';
                screen.style.transform = 'rotate(-90deg)';
                screen.style.width = '812px'; // Invert dimensions for logic
                screen.style.height = '375px';

                // Reset for demo purposes after delay or keep it?
                // The user prompt implies this is a "Device Simulator" feature.
                // We'll keep it active while in this view or add a toggle.
                // For now, let's just animate it to show we have the control.
            }
        });
    });

    // file export Mock Logic
    window.exportToImage = async () => {
        // Architecture:
        // 1. Clone DOM to hidden container
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.id = 'export-container';
        document.body.appendChild(hiddenContainer);

        // 2. Apply "Export Specific" classes (user requested specific fonts/bg)
        // ... implementation of cloning ...

        // 3. html2canvas (Hypothetical call)
        // const canvas = await html2canvas(hiddenContainer);
        // download(canvas);

        console.log('Export logic structure ready. Install html2canvas to activate.');
    };

    // --- Supabase Auth UI Logic ---
    const authModal = document.getElementById('auth-modal');
    const authBtn = document.getElementById('sidebar-auth-btn');
    const authAvatar = document.getElementById('auth-avatar');
    const authLabel = document.getElementById('auth-label');
    const btnSignin = document.getElementById('btn-signin');
    const btnSignup = document.getElementById('btn-signup');
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const errorMsg = document.getElementById('auth-error-msg');
    const closeAuthBtn = document.querySelector('.close-auth-modal');

    // Old Auth Listener Removed - Replaced by forceShowAuthModal logic below

    // Helper to hide auth modal
    function hideAuthModal() {
        if (authModal) {
            authModal.style.display = 'none';
            authModal.classList.remove('active');
        }
        if (errorMsg) errorMsg.style.display = 'none';
    }

    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            hideAuthModal();
        });
    }

    // Close on overlay click
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                hideAuthModal();
            }
        });
    }

    // Sign In
    if (btnSignin) {
        btnSignin.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passInput.value;
            errorMsg.style.display = 'none';

            const { data, error } = await supabaseManager.signIn(email, password);
            if (error) {
                errorMsg.innerText = error.message;
                errorMsg.style.display = 'block';
            } else {
                hideAuthModal();
                // UI update will happen via event listener
            }
        });
    }

    // --- Embedded Settings Auth Logic ---
    const settingsSignInBtn = document.getElementById('settings-signin-btn');
    const settingsSignUpBtn = document.getElementById('settings-signup-btn');
    const settingsLogoutBtn = document.getElementById('settings-logout-btn');
    const settingsEmailInput = document.getElementById('settings-email');
    const settingsPassInput = document.getElementById('settings-password');
    const settingsMsgBox = document.getElementById('settings-auth-msg-box');

    function showSettingsMsg(type, text) {
        if (!settingsMsgBox) return;

        settingsMsgBox.className = 'auth-message-box ' + type;
        settingsMsgBox.style.display = 'flex';

        const icon = type === 'error' ? '⚠️' : '✅';
        settingsMsgBox.innerHTML = `<span style="font-size:1.2em">${icon}</span><span>${text}</span>`;
    }

    // Sign In from Settings
    if (settingsSignInBtn) {
        settingsSignInBtn.addEventListener('click', async () => {
            const email = settingsEmailInput.value;
            const password = settingsPassInput.value;
            if (settingsMsgBox) settingsMsgBox.style.display = 'none';

            const { data, error } = await supabaseManager.signIn(email, password);
            if (error) {
                showSettingsMsg('error', error.message);
            } else {
                showSettingsMsg('success', 'Login successful!');
                console.log('Settings Login Success');
            }
        });
    }

    // Sign Up from Settings
    if (settingsSignUpBtn) {
        settingsSignUpBtn.addEventListener('click', async () => {
            const email = settingsEmailInput.value;
            const password = settingsPassInput.value;
            if (settingsMsgBox) settingsMsgBox.style.display = 'none';

            const { data, error } = await supabaseManager.signUp(email, password);
            if (error) {
                showSettingsMsg('error', error.message);
            } else {
                showSettingsMsg('success', 'Account created! Check your email.');
            }
        });
    }

    // Log Out from Settings
    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', () => {
            if (confirm('Log out?')) {
                supabaseManager.signOut();
            }
        });
    }

    const deleteDataBtn = document.getElementById('settings-delete-data-btn');
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', async () => {
            if (confirm('⚠️ Are you SURE you want to delete all your saved cloud data? This cannot be undone.')) {
                if (confirm('Really delete? Last warning.')) {
                    const success = await supabaseManager.removeUserData();
                    if (success) {
                        alert('Cloud data deleted.');
                        location.reload();
                    } else {
                        alert('Failed to delete data. Check network or permissions.');
                    }
                }
            }
        });
    }

    // Update Settings UI and Handle Auth Modal Visibility
    window.addEventListener('supabase:authstate', (e) => {
        const user = e.detail.session ? e.detail.session.user : null;

        // Settings Views
        const authView = document.getElementById('account-authenticated-view');
        const guestView = document.getElementById('account-guest-view');
        const settingsName = document.getElementById('settings-account-name');

        // Sidebar Elements
        const sidebarAuthBtn = document.getElementById('sidebar-auth-btn');
        const sidebarUserInfo = document.getElementById('sidebar-user-info');

        // Inside sidebar-user-info
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');

        if (user) {
            // Profile Data for Settings & Sidebar
            const email = user.email;
            const metadata = user.user_metadata || {};
            const fullName = metadata.full_name || metadata.name || email.split('@')[0];
            const avatarChar = fullName.charAt(0).toUpperCase();
            const avatarUrl = metadata.avatar_url || metadata.picture;

            // Auto-hide Auth Modal
            if (window.hideAuthModal) window.hideAuthModal();

            // --- Sidebar UI Toggle ---
            if (sidebarAuthBtn) sidebarAuthBtn.style.display = 'none';
            if (sidebarUserInfo) {
                sidebarUserInfo.style.display = 'flex';
                if (sidebarUserName) sidebarUserName.innerText = fullName;
                if (sidebarUserEmail) sidebarUserEmail.innerText = email;
                if (sidebarUserAvatar) {
                    if (avatarUrl) {
                        sidebarUserAvatar.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    } else {
                        sidebarUserAvatar.innerText = avatarChar;
                        sidebarUserAvatar.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
                        sidebarUserAvatar.style.color = 'white';
                        sidebarUserAvatar.innerHTML = avatarChar; // Ensure it's reset to char
                    }
                }
            }

            // --- Settings Tab Sync ---
            const settingsTabLabel = document.getElementById('settings-tab-account-label');
            const settingsTabIcon = document.getElementById('settings-tab-account-icon');
            if (settingsTabLabel) settingsTabLabel.innerText = fullName;
            if (settingsTabIcon) {
                if (avatarUrl) {
                    settingsTabIcon.innerHTML = `<img src="${avatarUrl}" style="width:18px; height:18px; border-radius:50%; object-fit:cover; border: 1px solid var(--border-color);">`;
                } else {
                    settingsTabIcon.innerHTML = `<div style="width:18px; height:18px; border-radius:50%; background:var(--accent-primary); color:white; font-size:10px; display:flex; align-items:center; justify-content:center; font-weight:bold;">${avatarChar}</div>`;
                }
            }

            // Load Chat Sessions
            loadSessions();

            // --- Settings Account Section Update ---
            if (authView) authView.style.display = 'block';
            if (guestView) guestView.style.display = 'none';

            if (settingsName) settingsName.innerText = fullName;
            const settingsEmail = document.getElementById('settings-account-email');
            if (settingsEmail) settingsEmail.innerText = email;

            const settingsAvatar = document.getElementById('settings-user-avatar');
            if (settingsAvatar) {
                if (avatarUrl) {
                    settingsAvatar.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border: 2px solid var(--accent-primary);">`;
                } else {
                    settingsAvatar.innerText = avatarChar;
                    settingsAvatar.style.backgroundImage = '';
                }
            }

        } else {
            // Sidebar Reset
            if (sidebarAuthBtn) sidebarAuthBtn.style.display = 'flex';
            if (sidebarUserInfo) sidebarUserInfo.style.display = 'none';

            // --- Settings Tab Reset ---
            const settingsTabLabel = document.getElementById('settings-tab-account-label');
            const settingsTabIcon = document.getElementById('settings-tab-account-icon');
            if (settingsTabLabel) settingsTabLabel.innerText = 'Account';
            if (settingsTabIcon) {
                settingsTabIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
            }

            // Settings Reset
            if (authView) authView.style.display = 'none';
            if (guestView) guestView.style.display = 'block';

            // Clear sessions
            resetChat();
            loadSessions();
        }
    });

    // Global Error Trap
    window.onerror = function (msg, url, line, col, error) {
        alert("Script Error: " + msg + "\nLine: " + line);
        console.error("Global Error:", error);
        return false;
    };

    // Modal Visibility Force Fix - Aggressive
    window.forceShowAuthModal = function () {
        const modal = document.getElementById('auth-modal');
        if (!modal) {
            alert('Error: Auth Modal element not found in DOM');
            return;
        }
        // Force override all styles
        modal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; z-index: 999999 !important; position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.8) !important;';
        modal.classList.add('active');
        console.log('Force Show Auth Modal Triggered');
    };

    // Wire up Sidebar Auth Button to this Force Fix
    if (sidebarAuthBtn) {
        sidebarAuthBtn.addEventListener('click', (e) => {
            console.log('Main.js: Sidebar Auth Click');
            e.stopPropagation();
            window.forceShowAuthModal();
        });
    }

    // Sidebar Logout Btn
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Log out?')) {
                supabaseManager.signOut();
            }
        });
    }

    // Sign Up
    if (btnSignup) {
        btnSignup.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passInput.value;
            errorMsg.style.display = 'none';

            const { data, error } = await supabaseManager.signUp(email, password);
            if (error) {
                errorMsg.innerText = error.message;
                errorMsg.style.display = 'block';
            } else {
                alert('Check your email for the confirmation link!');
                hideAuthModal();
            }
        });
    }

    // Listen for Auth Changes
});
