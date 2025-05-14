document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modelSelect = document.getElementById('model-select');
    const chatTab = document.getElementById('chat-tab');
    const imageTab = document.getElementById('image-tab');
    const chatView = document.getElementById('chat-view');
    const imageView = document.getElementById('image-view');
    const imageUploadForm = document.getElementById('image-upload-form');
    const imageInput = document.getElementById('image-input');
    const fileNameSpan = document.getElementById('file-name');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const predictionResult = document.getElementById('prediction-result');
    const predictionContent = document.getElementById('prediction-content');
    
    let messages = [];
    let isGenerating = false;
    
    // Tab switching
    chatTab.addEventListener('click', () => {
        chatTab.classList.add('active');
        imageTab.classList.remove('active');
        chatView.style.display = 'block';
        imageView.style.display = 'none';
    });
    
    imageTab.addEventListener('click', () => {
        imageTab.classList.add('active');
        chatTab.classList.remove('active');
        imageView.style.display = 'block';
        chatView.style.display = 'none';
    });
    
    // Handle file selection
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            
            // Show image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Hide previous results
            predictionResult.style.display = 'none';
        } else {
            fileNameSpan.textContent = 'Dosya seçilmedi';
            imagePreviewContainer.style.display = 'none';
        }
    });
    
    // Handle image upload and analysis
    imageUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = imageInput.files[0];
        if (!file) {
            alert('Lütfen bir görsel seçin');
            return;
        }
        
        // Prepare form data
        const formData = new FormData();
        formData.append('image', file);
        
        // Check if explanation is requested and whether to use streaming
        const explainResults = document.getElementById('explain-results').checked;
        const useStreaming = document.getElementById('stream-results').checked;
        
        // Add model selection for explanation
        if (explainResults) {
            formData.append('model', modelSelect.value);
        }
        
        // Show loading state
        predictionContent.innerHTML = 'Görsel analiz ediliyor...';
        predictionResult.style.display = 'block';
        
        // If streaming is enabled and explanation is requested
        if (useStreaming && explainResults) {
            handleStreamingImageAnalysis(formData, modelSelect.value);
            return;
        }
        
        // For non-streaming requests
        try {
            // Send image for prediction (with or without explanation)
            const apiEndpoint = explainResults 
                ? window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION 
                : window.CHAT_CONFIG.API.IMAGE_PREDICT;
                
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.prediction) {
                // Format and display prediction
                let formattedResult = '';
                
                if (typeof result.prediction === 'object') {
                    // If it's a complex object
                    formattedResult = JSON.stringify(result.prediction, null, 2);
                } else {
                    // If it's a simple string
                    formattedResult = result.prediction;
                }
                
                // Check if we have an explanation from the language model
                if (result.explanation) {
                    predictionContent.innerHTML = `
                        <div class="prediction-raw">
                            <h4>Model Çıktısı:</h4>
                            <pre>${formattedResult}</pre>
                        </div>
                        <div class="prediction-explanation">
                            <h4>Açıklama:</h4>
                            <div class="explanation-text">${renderMarkdown(result.explanation)}</div>
                        </div>
                    `;
                } else {
                    predictionContent.innerHTML = `<pre>${formattedResult}</pre>`;
                }
                
                // Debug information for errors
                if (result.error_details) {
                    console.log("API error details:", result.error_details);
                    predictionContent.innerHTML += `
                        <div class="error-details" style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; font-size: 0.9em;">
                            <h4>Hata Ayrıntıları:</h4>
                            <p>Dil modeli çalışırken bir sorun oluştu.</p>
                            <pre style="font-size: 0.8em; max-height: 100px; overflow: auto;">${JSON.stringify(result.error_details, null, 2)}</pre>
                        </div>
                    `;
                }
            } else {
                // Enhanced error display with additional details if available
                let errorMessage = result.error || 'Bilinmeyen bir hata oluştu';
                let errorDetails = '';
                
                // Check if we have traceback information
                if (result.traceback) {
                    console.error("API Error Traceback:", result.traceback);
                    errorDetails = `
                        <details>
                            <summary>Teknik Detaylar</summary>
                            <pre style="font-size: 0.8em; max-height: 200px; overflow: auto;">${result.traceback}</pre>
                        </details>
                    `;
                }
                
                predictionContent.innerHTML = `
                    <div class="error-container">
                        <h4>Hata Oluştu:</h4>
                        <p>${errorMessage}</p>
                        ${errorDetails}
                        <div class="error-help">
                            <p>Aşağıdakileri kontrol edin:</p>
                            <ul>
                                <li>Görüntü servisinin çalıştığından emin olun (Port 5003)</li>
                                <li>Ollama servisinin çalıştığından emin olun (Port 11434)</li>
                                <li>Uygun boyutta bir görsel yüklediğinizden emin olun</li>
                            </ul>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Image prediction error:', error);
            
            // Enhanced error display with request debugging info
            const apiEndpoint = document.getElementById('explain-results').checked 
                ? window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION 
                : window.CHAT_CONFIG.API.IMAGE_PREDICT;
                
            predictionContent.innerHTML = `
                <div class="error-container">
                    <h4>Hata Oluştu:</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Debug Bilgisi</summary>
                        <div class="debug-info">
                            <p><strong>Kullanılan Endpoint:</strong> ${apiEndpoint}</p>
                            <p><strong>API Yolları:</strong></p>
                            <ul>
                                <li>Image Predict: ${window.CHAT_CONFIG.API.IMAGE_PREDICT}</li>
                                <li>Image Predict with Explanation: ${window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION}</li>
                            </ul>
                            <p class="help-note">Not: API yolları "/api/" önekiyle veya öneksiz çalışmalıdır.</p>
                        </div>
                    </details>
                    <div class="error-help">
                        <p>Aşağıdakileri kontrol edin:</p>
                        <ul>
                            <li>Görüntü servisinin çalıştığından emin olun (Port 5003)</li>
                            <li>Ollama servisinin çalıştığından emin olun (Port 11434)</li>
                            <li>Uygun bir görsel yüklediğinizden emin olun</li>
                            <li>Model seçiminizin doğru olduğundan emin olun</li>
                        </ul>
                    </div>
                    <details>
                        <summary>Teknik Detaylar</summary>
                        <pre>${JSON.stringify(error, null, 2)}</pre>
                    </details>
                    <p class="error-help">Hata büyük olasılıkla Ollama API servisinden kaynaklanmaktadır. Aşağıdakileri kontrol edin:</p>
                    <ul class="error-tips">
                        <li>Ollama servisi çalışıyor mu? (Port 11434)</li>
                        <li>İstenen model (${modelSelect.value}) yüklü mü?</li>
                        <li>Görüntü dosyası çok büyük olmadığından emin olun.</li>
                    </ul>
                </div>
            `;
        }
    });
    
    // Function to handle streaming image analysis
    async function handleStreamingImageAnalysis(formData, modelName) {
        try {
            // Prepare the DOM to show streaming results
            predictionContent.innerHTML = `
                <div class="prediction-raw">
                    <h4>Model Çıktısı:</h4>
                    <pre id="prediction-raw-content">Yükleniyor...</pre>
                </div>
                <div class="prediction-explanation">
                    <h4>Açıklama (Gerçek Zamanlı):</h4>
                    <div id="streaming-explanation" class="explanation-text">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                    </div>
                </div>
            `;
            
            // Get references to the elements we'll update
            const predictionRawContent = document.getElementById('prediction-raw-content');
            const streamingExplanation = document.getElementById('streaming-explanation');
            
            // Start the streaming request
            const response = await fetch(window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION_STREAM, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            // Get a reader to process the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let explanationText = '';
            
            // Process the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream complete');
                    break;
                }
                
                // Decode the chunk and process each line
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            // Parse the JSON data
                            const eventData = JSON.parse(line.substring(6));
                            
                            // Handle different event types
                            if (eventData.type === 'prediction') {
                                // Display the prediction results
                                const prediction = eventData.data;
                                predictionRawContent.textContent = JSON.stringify(prediction, null, 2);
                                
                                // Update the UI to show we're waiting for explanation
                                streamingExplanation.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
                            }
                            else if (eventData.type === 'explanation') {
                                // Handle Ollama response format
                                try {
                                    const llmData = JSON.parse(eventData.content);
                                    
                                    // Extract text from different Ollama response formats
                                    let contentToAdd = '';
                                    if (llmData.message && llmData.message.content) {
                                        // Chat response format
                                        contentToAdd = llmData.message.content;
                                    } else if (llmData.response) {
                                        // Generate response format
                                        contentToAdd = llmData.response;
                                    }
                                    
                                    if (contentToAdd) {
                                        explanationText += contentToAdd;
                                        // Update UI with the accumulated explanation
                                        streamingExplanation.innerHTML = renderMarkdown(explanationText);
                                        
                                        // Scroll to bottom if needed
                                        streamingExplanation.scrollTop = streamingExplanation.scrollHeight;
                                    }
                                } catch (e) {
                                    console.warn('Error parsing LLM response:', e, eventData.content);
                                }
                            }
                            else if (eventData.type === 'error') {
                                // Display error message
                                streamingExplanation.innerHTML = `<div class="error">Hata: ${eventData.message}</div>`;
                                console.error('Streaming error:', eventData.message);
                            }
                        } catch (error) {
                            console.error('Error parsing SSE data:', error, line);
                        }
                    }
                }
            }
        } catch (error) {
            // Handle any errors
            console.error('Image prediction streaming error:', error);
            predictionContent.innerHTML = `
                <div class="error-container">
                    <h4>Streaming Hatası:</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Teknik Detaylar</summary>
                        <pre>${JSON.stringify(error, null, 2)}</pre>
                    </details>
                    <p class="error-help">Lütfen API servislerin çalıştığından emin olun.</p>
                </div>
            `;
        }
    }
    
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
