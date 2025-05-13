document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modelSelect = document.getElementById('model-select');
    
    let messages = [];
    let isGenerating = false;
    
    // Load available models from API
    fetchModels().then(models => {
        const select = document.getElementById('model-select');
        // Clear existing options
        select.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            
            // Default select mistral:7b if available
            if (model.name === 'mistral:7b') {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    }).catch(error => {
        showError('Model listesi yüklenemedi. API çalışıyor mu?');
        console.error(error);
    });
    
    // Send message when button is clicked
    sendButton.addEventListener('click', sendMessage);
    
    // Send message when Enter is pressed (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    async function sendMessage() {
        if (isGenerating) return;
        
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;
        
        // Add user message to chat
        addMessage('user', userMessage);
        
        // Clear input
        userInput.value = '';
        
        // Add to messages array
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        // Show typing indicator
        const aiMessageDiv = addMessage('ai', '');
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        aiMessageDiv.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        try {
            isGenerating = true;
            
            // Get selected model
            const modelName = modelSelect.value;
            
            // Create AbortController to cancel fetch if needed
            const controller = new AbortController();
            const signal = controller.signal;
            
            // Attempt to fetch streaming response
            fetch(window.CHAT_CONFIG.API.CHAT_STREAM, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages
                }),
                signal
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                // Get a reader to process the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                
                // Remove typing indicator
                if (typingIndicator.parentNode) {
                    typingIndicator.parentNode.removeChild(typingIndicator);
                }
                
                // Function to process stream chunks
                function processText(result) {
                    if (result.done) {
                        console.log('Stream complete');
                        isGenerating = false;
                        
                        // Add assistant message to messages array
                        messages.push({
                            role: 'assistant',
                            content: fullResponse
                        });
                        return;
                    }
                    
                    // Decode the chunk
                    const chunk = decoder.decode(result.value, { stream: true });
                    
                    // Handle Server-Sent Events format
                    const lines = chunk.split('\n');
                    
                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                // Parse the JSON data
                                const data = JSON.parse(line.substring(6));
                                
                                // Extract the response content
                                if (data.message && data.message.content) {
                                    // Chat API format
                                    const content = data.message.content;
                                    fullResponse += content;
                                } else if (data.response) {
                                    // Generate API format
                                    fullResponse += data.response;
                                }
                                
                                // Update the UI
                                aiMessageDiv.innerHTML = renderMarkdown(fullResponse);
                                
                                // Scroll to latest content
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            } catch (error) {
                                console.error('Error parsing SSE data:', error, line);
                            }
                        }
                    });
                    
                    // Continue reading
                    return reader.read().then(processText);
                }
                
                // Start processing the stream
                return reader.read().then(processText);
            }).catch(error => {
                console.error('Fetch error:', error);
                isGenerating = false;
                
                // Show error in the message area
                aiMessageDiv.textContent = 'Bir hata oluştu: ' + error.message;
                
                // Log browser console for debugging
                console.error('Streaming error:', error);
            });
            
        } catch (error) {
            console.error('Error:', error);
            isGenerating = false;
            showError('Bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }
    
    function addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (content) {
            if (sender === 'ai') {
                messageDiv.innerHTML = renderMarkdown(content);
            } else {
                messageDiv.textContent = content;
            }
        }
        
        chatContainer.appendChild(messageDiv);
        return messageDiv;
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        chatContainer.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    async function fetchModels() {
        try {
            const response = await fetch(window.CHAT_CONFIG.API.MODELS);
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }
    
    function renderMarkdown(text) {
        if (!text) return '';
        
        // Very simple Markdown rendering
        // This is not a complete Markdown implementation, just handles basics
        
        // Code blocks
        text = text.replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
        
        // Headers
        text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Lists (simple implementation)
        text = text.replace(/^- (.+)$/gm, '• $1<br>');
        
        // Paragraphs
        text = text.replace(/\n\n/g, '<br><br>');
        
        return text;
    }
});
