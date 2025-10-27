 // DOM Elements
        const themeToggle = document.getElementById('themeToggle');
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const chatHistory = document.getElementById('chatHistory');
        const customPrompt = document.getElementById('customPrompt');
        const savePrompt = document.getElementById('savePrompt');
        const historyList = document.getElementById('historyList');
        const clearHistory = document.getElementById('clearHistory');
        const templateGrid = document.getElementById('templateGrid');
        const newChatBtn = document.getElementById('newChatBtn');

        // Template Prompts
        const promptTemplates = [
            {
                title: "Asisten Penulis",
                description: "Bantu menulis konten kreatif dan profesional",
                prompt: "Anda adalah asisten penulis yang ahli. Bantu saya menulis konten yang menarik, informatif, dan sesuai dengan audiens target. Berikan saran untuk meningkatkan kualitas tulisan dan pastikan konten mudah dipahami."
            },
            {
                title: "Tutor Pembelajaran",
                description: "Jelaskan konsep kompleks dengan sederhana",
                prompt: "Anda adalah tutor yang sabar dan berpengetahuan luas. Jelaskan konsep-konsep kompleks dengan cara yang mudah dipahami, berikan contoh-contoh praktis, dan ajukan pertanyaan untuk memastikan pemahaman yang mendalam."
            },
            {
                title: "Perencana Perjalanan",
                description: "Bantu merencanakan itinerary perjalanan",
                prompt: "Anda adalah perencana perjalanan profesional. Bantu saya merencanakan perjalanan yang efisien, menyenangkan, dan sesuai budget. Rekomendasikan destinasi, akomodasi, transportasi, dan aktivitas yang sesuai dengan preferensi saya."
            },
            {
                title: "Konsultan Karir",
                description: "Bimbing pengembangan karir dan profesional",
                prompt: "Anda adalah konsultan karir yang berpengalaman. Bantu saya mengidentifikasi kekuatan, kelemahan, peluang karir, dan berikan saran untuk pengembangan profesional serta persiapan menghadapi wawancara kerja."
            },
            {
                title: "Ahli Kesehatan",
                description: "Berikan informasi kesehatan yang akurat",
                prompt: "Anda adalah asisten kesehatan virtual. Berikan informasi kesehatan yang akurat, saran gaya hidup sehat, dan rekomendasi umum. Ingatkan untuk selalu berkonsultasi dengan profesional medis untuk masalah kesehatan serius."
            }
        ];

        // State Management
        let isDarkMode = localStorage.getItem('darkMode') === 'true';
        let currentPrompt = localStorage.getItem('customPrompt') || "Anda adalah asisten AI yang membantu dan ramah. Berikan jawaban yang informatif dan relevan dengan pertanyaan pengguna.";
        let chatSessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
        let currentSessionId = localStorage.getItem('currentSessionId') || generateSessionId();
        let isWaitingForResponse = false;

        // Initialize Application
        function init() {
            // Set theme
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            }
            
            // Set custom prompt
            customPrompt.value = currentPrompt;
            
            // Load templates
            renderTemplates();
            
            // Load chat history
            loadCurrentSession();
            renderHistoryList();
        }

        // Render Templates
        function renderTemplates() {
            templateGrid.innerHTML = '';
            
            promptTemplates.forEach((template, index) => {
                const templateElement = document.createElement('div');
                templateElement.classList.add('template-item');
                templateElement.innerHTML = `
                    <div class="template-title">${template.title}</div>
                    <div class="template-desc">${template.description}</div>
                `;
                
                templateElement.addEventListener('click', () => {
                    customPrompt.value = template.prompt;
                    showNotification(`Template "${template.title}" telah dipilih`);
                });
                
                templateGrid.appendChild(templateElement);
            });
        }

        // Theme Toggle
        themeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            document.body.classList.toggle('dark-mode', isDarkMode);
            localStorage.setItem('darkMode', isDarkMode);
        });

        // Save Custom Prompt
        savePrompt.addEventListener('click', () => {
            currentPrompt = customPrompt.value;
            localStorage.setItem('customPrompt', currentPrompt);
            showNotification('Prompt berhasil disimpan!');
        });

        // Create New Chat
        newChatBtn.addEventListener('click', createNewChat);

        function createNewChat() {
            // Generate new session ID
            currentSessionId = generateSessionId();
            localStorage.setItem('currentSessionId', currentSessionId);
            
            // Create empty session
            const newSession = {
                id: currentSessionId,
                title: "Percakapan Baru",
                messages: [],
                timestamp: new Date().toISOString(),
                context: [] // Untuk menyimpan konteks percakapan
            };
            
            // Add to sessions array
            chatSessions.unshift(newSession);
            
            // Save to localStorage
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            
            // Load the new session
            loadCurrentSession();
            
            // Update history list
            renderHistoryList();
            
            showNotification('Percakapan baru dibuat!');
        }

        // Send Message
        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message || isWaitingForResponse) return;
            
            // Add user message to chat
            addMessageToChat(message, 'user');
            chatInput.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            // Set waiting state
            isWaitingForResponse = true;
            sendButton.disabled = true;
            
            // Send to API with conversation context
            fetchAIResponse(message);
        }

        // Add Message to Chat
        function addMessageToChat(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
            
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageElement.innerHTML = `
                ${message}
                <div class="message-time">${time}</div>
            `;
            
            chatHistory.appendChild(messageElement);
            scrollToBottom();
            
            // Save to session with context
            saveMessageToSession(message, sender);
        }

        // Show Typing Indicator
        function showTypingIndicator() {
            const typingElement = document.createElement('div');
            typingElement.classList.add('typing-indicator');
            typingElement.id = 'typingIndicator';
            
            typingElement.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
            
            chatHistory.appendChild(typingElement);
            scrollToBottom();
        }

        // Hide Typing Indicator
        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // Fetch AI Response with Context
        async function fetchAIResponse(userMessage) {
            try {
                const currentSession = getCurrentSession();
                
                // Build conversation context (last 5 messages)
                const recentMessages = currentSession.messages.slice(-5);
                let conversationContext = recentMessages.map(msg => 
                    `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
                ).join('\n');
                
                // Combine custom prompt with conversation context and new message
                const fullPrompt = `${currentPrompt}\n\nKonteks percakapan sebelumnya:\n${conversationContext}\n\nPertanyaan pengguna: ${userMessage}`;
                
                // Encode the prompt for the URL
                const encodedMessage = encodeURIComponent(fullPrompt);
                
                // Make API request
                const response = await fetch(`https://zelapioffciall.koyeb.app/ai/claude?text=${encodedMessage}`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                // Remove typing indicator
                hideTypingIndicator();
                
                // Reset waiting state
                isWaitingForResponse = false;
                sendButton.disabled = false;
                
                // Extract the message from JSON response
                const aiMessage = data.message || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.';
                
                // Add AI response to chat
                addMessageToChat(aiMessage, 'ai');
            } catch (error) {
                console.error('Error fetching AI response:', error);
                hideTypingIndicator();
                
                // Reset waiting state
                isWaitingForResponse = false;
                sendButton.disabled = false;
                
                // Show error message
                addMessageToChat('Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.', 'ai');
            }
        }

        // Get Current Session
        function getCurrentSession() {
            return chatSessions.find(s => s.id === currentSessionId) || createNewSession();
        }

        // Create New Session
        function createNewSession() {
            const newSession = {
                id: currentSessionId,
                title: "Percakapan Baru",
                messages: [],
                timestamp: new Date().toISOString(),
                context: []
            };
            
            chatSessions.unshift(newSession);
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            
            return newSession;
        }

        // Save Message to Session
        function saveMessageToSession(message, sender) {
            const session = getCurrentSession();
            
            // Add message to session
            session.messages.push({
                text: message,
                sender: sender,
                timestamp: new Date().toISOString()
            });
            
            // Update session title if it's the first user message
            if (session.messages.length === 1 && sender === 'user') {
                session.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            }
            
            // Update timestamp
            session.timestamp = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            localStorage.setItem('currentSessionId', currentSessionId);
            
            // Update history list
            renderHistoryList();
        }

        // Load Current Session
        function loadCurrentSession() {
            const session = getCurrentSession();
            
            // Clear current chat
            chatHistory.innerHTML = '';
            
            if (session.messages.length > 0) {
                // Add messages from session
                session.messages.forEach(msg => {
                    addMessageToChat(msg.text, msg.sender);
                });
            } else {
                // Show welcome message
                addMessageToChat('Halo! Saya asisten AI Anda. Silakan ajukan pertanyaan atau pilih template prompt untuk memulai percakapan.', 'ai');
            }
        }

        // Render History List
        function renderHistoryList() {
            historyList.innerHTML = '';
            
            if (chatSessions.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <p>Belum ada percakapan</p>
                    </div>
                `;
                return;
            }
            
            // Sort sessions by timestamp (newest first)
            const sortedSessions = [...chatSessions].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            sortedSessions.forEach(session => {
                const historyItem = document.createElement('div');
                historyItem.classList.add('history-item');
                if (session.id === currentSessionId) {
                    historyItem.classList.add('active');
                }
                
                // Format date
                const date = new Date(session.timestamp);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                historyItem.innerHTML = `
                    <div>
                        <div style="font-weight: 600;">${session.title}</div>
                        <div style="font-size: 12px; opacity: 0.7;">${timeString}</div>
                    </div>
                    <i class="fas fa-times delete-history"></i>
                `;
                
                historyItem.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('delete-history')) {
                        currentSessionId = session.id;
                        localStorage.setItem('currentSessionId', currentSessionId);
                        loadCurrentSession();
                        renderHistoryList();
                    }
                });
                
                const deleteBtn = historyItem.querySelector('.delete-history');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                });
                
                historyList.appendChild(historyItem);
            });
        }

        // Delete Chat Session
        function deleteChatSession(sessionId) {
            chatSessions = chatSessions.filter(s => s.id !== sessionId);
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            
            if (currentSessionId === sessionId) {
                if (chatSessions.length > 0) {
                    currentSessionId = chatSessions[0].id;
                    localStorage.setItem('currentSessionId', currentSessionId);
                } else {
                    currentSessionId = generateSessionId();
                    localStorage.setItem('currentSessionId', currentSessionId);
                }
                loadCurrentSession();
            }
            
            renderHistoryList();
            showNotification('Percakapan telah dihapus');
        }

        // Clear All History
        clearHistory.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin menghapus semua riwayat percakapan?')) {
                chatSessions = [];
                localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
                currentSessionId = generateSessionId();
                localStorage.setItem('currentSessionId', currentSessionId);
                loadCurrentSession();
                renderHistoryList();
                showNotification('Semua riwayat percakapan telah dihapus');
            }
        });

        // Generate Session ID
        function generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Scroll to Bottom of Chat
        function scrollToBottom() {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        // Show Notification
        function showNotification(message) {
            // Create notification element
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = 'var(--card-bg)';
            notification.style.color = 'var(--text-color)';
            notification.style.padding = '12px 20px';
            notification.style.borderRadius = '12px';
            notification.style.boxShadow = 'var(--shadow)';
            notification.style.zIndex = '1000';
            notification.style.borderLeft = '4px solid var(--primary-color)';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'transform 0.3s ease';
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        // Event Listeners
        sendButton.addEventListener('click', sendMessage);
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize App
        init();