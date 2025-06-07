document.addEventListener('DOMContentLoaded', () => {
    // On page load, set llama3.2:latest as selected in the model menu
    // (This ensures the button is visually selected)
    const modelMenu = document.getElementById('model-menu');
    if (modelMenu) {
        const llamaBtn = modelMenu.querySelector('[data-model="llama3.2:latest"]');
        if (llamaBtn) {
            modelMenu.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            llamaBtn.classList.add('selected');
        }
    }

    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const chatView = document.getElementById('chat-view');
    const imageView = document.getElementById('image-view');
    const imageUploadForm = document.getElementById('image-upload-form');
    const imageInput = document.getElementById('image-input');
    const fileNameSpan = document.getElementById('file-name');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const predictionResult = document.getElementById('prediction-result');
    const predictionContent = document.getElementById('prediction-content');
    const uploadPdf = document.getElementById('upload-pdf');
    const uploadPhoto = document.getElementById('upload-photo');

    let messages = [];
    let isGenerating = false;

    // Butonları tekrar seç (özellikle input-container içindeki sıralama değiştiyse)
    const sendButton = document.getElementById('send-button');
    const plusButton = document.getElementById('plus-button');
    const plusMenu = document.getElementById('plus-menu');
    const chatTab = document.getElementById('chat-tab');
    const imageTab = document.getElementById('image-tab');

    // Tab switching (event listener'ları tekrar ata, önce var olanları kaldır)
    if (chatTab) {
        chatTab.replaceWith(chatTab.cloneNode(true));
        const newChatTab = document.getElementById('chat-tab');
        newChatTab.addEventListener('click', () => {
            newChatTab.classList.add('active');
            if (imageTab) imageTab.classList.remove('active');
            chatView.style.display = 'block';
            imageView.style.display = 'none';

            // Clear chat history when "New Chat" is clicked
            chatContainer.innerHTML = '';
            messages = [];

            // Add welcome message
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome-message';
            welcomeDiv.innerHTML = `
                <h2>Esenlikler!</h2>
                <p>Type a message below to chat with our AI models.</p>
            `;
            chatContainer.appendChild(welcomeDiv);

            // --- FINAL FIX: Remove all height/minHeight/maxHeight/flex from chatContainer and its parents ---
            function resetBoxSizing(el) {
                if (!el) return;
                el.style.height = '';
                el.style.minHeight = '';
                el.style.maxHeight = '';
                el.style.flexGrow = '';
                el.style.flexShrink = '';
                el.style.flexBasis = '';
                el.style.display = '';
                el.style.justifyContent = '';
                el.style.alignItems = '';
                el.style.alignSelf = '';
            }
            resetBoxSizing(chatContainer);
            let parent = chatContainer.parentElement;
            // Traverse up to 3 levels to clear any flex/grid/height settings
            for (let i = 0; i < 3 && parent; i++) {
                resetBoxSizing(parent);
                parent = parent.parentElement;
            }
            // Also reset input container
            const inputContainer = document.getElementById('input-container');
            if (inputContainer) {
                inputContainer.style.position = '';
                inputContainer.style.bottom = '';
                inputContainer.style.left = '';
                inputContainer.style.right = '';
                inputContainer.style.marginTop = '';
                inputContainer.style.marginBottom = '';
                inputContainer.style.transform = '';
                inputContainer.style.alignSelf = '';
            }
        });
    }
    if (imageTab) {
        imageTab.replaceWith(imageTab.cloneNode(true));
        const newImageTab = document.getElementById('image-tab');
        newImageTab.addEventListener('click', () => {
            newImageTab.classList.add('active');
            if (chatTab) chatTab.classList.remove('active');
            imageView.style.display = 'block';
            chatView.style.display = 'none';
        });
    }

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
            fileNameSpan.textContent = 'No file selected';
            imagePreviewContainer.style.display = 'none';
        }
    });

    // Handle image upload and analysis
    imageUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = imageInput.files[0];
        if (!file) {
            alert('Please select an image');
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
            formData.append('model', getCurrentModel());
        }

        // Show loading state
        predictionContent.innerHTML = 'Analyzing image...';
        predictionResult.style.display = 'block';

        // If streaming is enabled and explanation is requested
        if (useStreaming && explainResults) {
            handleStreamingImageAnalysis(formData, getCurrentModel());
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
                            <h4>Model Output:</h4>
                            <pre>${formattedResult}</pre>
                        </div>
                        <div class="prediction-explanation">
                            <h4>Explanation:</h4>
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
                            <h4>Error Details:</h4>
                            <p>An issue occurred while running the language model.</p>
                            <pre style="font-size: 0.8em; max-height: 100px; overflow: auto;">${JSON.stringify(result.error_details, null, 2)}</pre>
                        </div>
                    `;
                }
            } else {
                // Enhanced error display with additional details if available
                let errorMessage = result.error || 'Unknown error occurred';
                let errorDetails = '';

                // Check if we have traceback information
                if (result.traceback) {
                    console.error("API Error Traceback:", result.traceback);
                    errorDetails = `
                        <details>
                            <summary>Technical Details</summary>
                            <pre style="font-size: 0.8em; max-height: 200px; overflow: auto;">${result.traceback}</pre>
                        </details>
                    `;
                }

                predictionContent.innerHTML = `
                    <div class="error-container">
                        <h4>Error Occurred:</h4>
                        <p>${errorMessage}</p>
                        ${errorDetails}
                        <div class="error-help">
                            <p>Please check:</p>
                            <ul>
                                <li>Make sure the image service is running (Port 5003)</li>
                                <li>Make sure the Ollama service is running (Port 11434)</li>
                                <li>Make sure you uploaded an appropriate image size</li>
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
                    <h4>Error Occurred:</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Debug Information</summary>
                        <div class="debug-info">
                            <p><strong>Endpoint Used:</strong> ${apiEndpoint}</p>
                            <p><strong>API Paths:</strong></p>
                            <ul>
                                <li>Image Predict: ${window.CHAT_CONFIG.API.IMAGE_PREDICT}</li>
                                <li>Image Predict with Explanation: ${window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION}</li>
                            </ul>
                            <p class="help-note">Note: API paths should work with or without "/api/" prefix.</p>
                        </div>
                    </details>
                    <div class="error-help">
                        <p>Please check:</p>
                        <ul>
                            <li>Make sure the image service is running (Port 5003)</li>
                            <li>Make sure the Ollama service is running (Port 11434)</li>
                            <li>Make sure you uploaded an appropriate image</li>
                            <li>Make sure your model selection is correct</li>
                        </ul>
                    </div>
                    <details>
                        <summary>Technical Details</summary>
                        <pre>${JSON.stringify(error, null, 2)}</pre>
                    </details>
                    <p class="error-help">The error is likely coming from the Ollama API service. Please check:</p>
                    <ul class="error-tips">
                        <li>Is the Ollama service running? (Port 11434)</li>
                        <li>Is the requested model (${getCurrentModel()}) installed?</li>
                        <li>Make sure the image file is not too large.</li>
                    </ul>
                </div>
            `;
        }
    });

    // --- DOGS-CATS CLASSIFIER INTEGRATION ---
    // If the user is on the image analysis tab, override the default endpoint to use the dogs-cats classifier
    imageUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = imageInput.files[0];
        if (!file) {
            alert('Please select an image');
            return;
        }

        // Prepare form data
        const formData = new FormData();
        formData.append('image', file);

        // Show loading state
        predictionContent.innerHTML = 'Analyzing image...';
        predictionResult.style.display = 'block';

        // Send image to dogs-cats classifier backend
        try {
            const response = await fetch('http://localhost:5003/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success' && result.prediction) {
                predictionContent.innerHTML = `<b>Prediction:</b> ${result.prediction}<br><b>Confidence:</b> ${(result.confidence * 100).toFixed(2)}%`;
            } else {
                predictionContent.innerHTML = `<b>Error:</b> ${result.error || 'Unknown error'}`;
            }
        } catch (error) {
            predictionContent.innerHTML = `<b>Error:</b> ${error.message}`;
        }
    });
    // --- END DOGS-CATS CLASSIFIER INTEGRATION ---

    // Function to handle streaming image analysis
    async function handleStreamingImageAnalysis(formData, modelName) {
        try {
            // Set generation state and update button
            isGenerating = true;
            updateSendButton(); // Update button to show "Stop"

            // Create AbortController for image streaming
            currentController = new AbortController();
            const signal = currentController.signal;

            // Prepare the DOM to show streaming results
            predictionContent.innerHTML = `
                <div class="prediction-raw">
                    <h4>Model Output:</h4>
                    <pre id="prediction-raw-content">Loading...</pre>
                </div>
                <div class="prediction-explanation">
                    <h4>Explanation:</h4>
                    <div id="streaming-explanation" class="explanation-text">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                    </div>
                </div>
            `;

            // Add stop button for image analysis
            const stopButtonDiv = document.createElement('div');
            stopButtonDiv.className = 'stop-generation-container';
            stopButtonDiv.innerHTML = `
                <button id="stop-image-generation" class="stop-button">Stop</button>
            `;
            predictionContent.appendChild(stopButtonDiv);

            // Add event listener to stop button
            const stopButton = document.getElementById('stop-image-generation');
            stopButton.addEventListener('click', stopGenerating);

            // Get references to the elements we'll update
            const predictionRawContent = document.getElementById('prediction-raw-content');
            const streamingExplanation = document.getElementById('streaming-explanation');

            // Start the streaming request
            const response = await fetch(window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION_STREAM, {
                method: 'POST',
                body: formData,
                signal
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
                    // Cleanup when stream completes successfully
                    isGenerating = false;
                    currentController = null;
                    updateSendButton();

                    // Remove the stop button since generation is complete
                    const stopButton = document.getElementById('stop-image-generation');
                    if (stopButton) stopButton.remove();
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
                                streamingExplanation.innerHTML = `<div class="error">Error: ${eventData.message}</div>`;
                                console.error('Streaming error:', eventData.message);
                            }
                        } catch (error) {
                            console.error('Error parsing SSE data:', error, line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Image prediction streaming error:', error);

            // Reset state
            isGenerating = false;
            currentController = null;
            updateSendButton(); // Reset button to "Send"

            // Handle user-initiated abort separately from other errors
            if (error.name === 'AbortError') {
                // If we have explanation text, keep it and add a note
                const streamingExplanation = document.getElementById('streaming-explanation');
                if (streamingExplanation && explanationText.trim() !== '') {
                    streamingExplanation.innerHTML = renderMarkdown(explanationText) +
                        '<div class="generation-stopped" style="color: #e53935; margin-top: 8px; font-style: italic; border-top: 1px solid #eee; padding-top: 8px;">Image analysis generation stopped by user</div>';
                } else {
                    // If no explanation text yet, show a simple message
                    predictionContent.innerHTML += `
                        <div class="generation-stopped" style="text-align: center; margin-top: 15px;">
                            Image analysis explanation stopped by user.
                        </div>
                    `;
                }

                // Remove the stop button since generation is already stopped
                const stopButton = document.getElementById('stop-image-generation');
                if (stopButton) stopButton.remove();
            } else {
                // For other errors, show the full error message
                predictionContent.innerHTML = `
                    <div class="error-container">
                        <h4>Streaming Error:</h4>
                        <p>${error.message}</p>
                        <details>
                            <summary>Technical Details</summary>
                            <pre>${JSON.stringify(error, null, 2)}</pre>
                        </details>
                        <p class="error-help">Please make sure API services are running.</p>
                    </div>
                `;
            }
        } finally {
            // Make sure to always reset these states
            isGenerating = false;
            currentController = null;
            updateSendButton();
        }
    }

    // Update the send button appearance based on generation state
    function updateSendButton() {
        if (isGenerating) {
            sendButton.textContent = "Stop";
            sendButton.classList.add("stop-button");
            sendButton.title = "Stop generation";
        } else {
            sendButton.textContent = "Send";
            sendButton.classList.remove("stop-button");
            sendButton.title = "Send message";
        }
    }

    // Initial button state
    updateSendButton();

    // Set up event listener for send button to toggle between send and stop functionality
    sendButton.addEventListener('click', () => {
        if (isGenerating) {
            stopGenerating();
        } else {
            sendMessage();
        }
    });

    // Function to abort ongoing generation
    let currentController = null;
    function stopGenerating() {
        if (currentController) {
            // Add a small visual feedback on click
            sendButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                sendButton.style.transform = '';
            }, 150);

            currentController.abort();
            currentController = null;
            isGenerating = false;
            updateSendButton();
            console.log("Generation aborted by user");
        }
    }

    // Send message when Enter is pressed (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating) {
                sendMessage();
            }
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
            // Set generation state and update button to "Stop"
            isGenerating = true;
            updateSendButton();

            // Show tip message about stopping generation (first time only)
            if (!localStorage.getItem('stopTipShown')) {
                const tipMessage = document.createElement('div');
                tipMessage.className = 'tip-message';
                tipMessage.innerHTML = 'Tip: You can click the <span class="button-highlight">Stop</span> button at any time to stop the AI from generating more text.';
                chatContainer.appendChild(tipMessage);
                chatContainer.scrollTop = chatContainer.scrollHeight;

                // Only show this tip once
                localStorage.setItem('stopTipShown', 'true');

                // Remove the tip after 10 seconds
                setTimeout(() => {
                    if (tipMessage.parentNode) {
                        tipMessage.parentNode.removeChild(tipMessage);
                    }
                }, 10000);
            }

            // Get selected model
            const modelName = getCurrentModel();

            // Create AbortController to cancel fetch if needed
            currentController = new AbortController();
            const signal = currentController.signal;

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
                let stoppedByUser = false; // <-- Add this flag

                // Remove typing indicator
                if (typingIndicator.parentNode) {
                    typingIndicator.parentNode.removeChild(typingIndicator);
                }

                // Function to process stream chunks
                function processText(result) {
                    if (result.done) {
                        console.log('Stream complete');
                        isGenerating = false;
                        currentController = null;
                        updateSendButton(); // Reset button to "Send"
                        // Only add message if not stopped by user
                        if (!stoppedByUser) {
                            messages.push({
                                role: 'assistant',
                                content: fullResponse
                            });
                        }
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

                                    // Check if this is a lights control response
                                    if (data.lights_action) {
                                        const lightsAction = data.lights_action;
                                        const room = lightsAction.room;
                                        const status = lightsAction.status;

                                        // Show lights control visual indicator
                                        setTimeout(() => {
                                            showLightsActionIndicator(aiMessageDiv, room, status === 'on');
                                        }, 100);
                                    }
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

                // Reset generating state and update button
                isGenerating = false;
                currentController = null;
                updateSendButton(); // Reset button to "Send"

                // Show error in the message area if it's not an abort error or BodyStreamBuffer abort
                if (
                    error.name !== 'AbortError' &&
                    error.message !== 'BodyStreamBuffer was aborted'
                ) {
                    aiMessageDiv.textContent = 'An error occurred: ' + error.message;
                } else {
                    // User initiated cancel or BodyStreamBuffer was aborted - keep the partial output, but do not append further text
                    stoppedByUser = true;
                    // Optionally, show a subtle note
                    if (fullResponse.trim() === '') {
                        aiMessageDiv.textContent = 'Response generation stopped.';
                    } else {
                        aiMessageDiv.innerHTML = renderMarkdown(fullResponse) +
                            '<div class="generation-stopped" style="color: #e53935; margin-top: 8px; font-style: italic; border-top: 1px solid #eee; padding-top: 8px;">Generation stopped by user</div>';
                    }
                    // Do NOT push the partial response to messages array
                }
            });

        } catch (error) {
            console.error('Error:', error);
            isGenerating = false;
            currentController = null;
            updateSendButton(); // Reset button to "Send"
            showError('An error occurred. Please try again.');
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

    // Function to stop generating
    // This function already exists earlier in the code - REMOVED DUPLICATE

    // Function to display a visual indication of light control
    function showLightsActionIndicator(messageDiv, room, isOn) {
        // Create a light indicator element
        const lightIndicator = document.createElement('div');
        lightIndicator.className = `lights-indicator ${isOn ? 'lights-on' : 'lights-off'}`;

        // Set content based on light status
        const statusText = isOn ? 'ON' : 'OFF';
        const icon = isOn ? '💡' : '⚪';

        lightIndicator.innerHTML = `
            <div class="lights-room">${room.toUpperCase()}</div>
            <div class="lights-status">${icon} ${statusText}</div>
        `;

        // Append to message div
        messageDiv.appendChild(lightIndicator);

        // Add animation class after a brief delay (for transition effect)
        setTimeout(() => {
            lightIndicator.classList.add('show');
        }, 100);
    }

    // Plus button menu toggle (dropdown gibi açılır menü için kesin çözüm)
    plusButton.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close model menu if it's open
        const modelMenu = document.getElementById('model-menu');
        if (modelMenu && modelMenu.classList.contains('show')) {
            modelMenu.classList.remove('show');
        }

        plusMenu.classList.toggle('show');
    });
    // Menü dışına tıklanınca menüyü kapat
    document.addEventListener('click', (e) => {
        if (plusMenu.classList.contains('show')) {
            plusMenu.classList.remove('show');
        }
    });
    // Menüye tıklanırsa kapanmasın
    plusMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    // Upload PDF (şimdilik boş)
    uploadPdf.addEventListener('click', () => {
        plusMenu.classList.remove('show');
        // TODO: PDF yükleme işlemi burada yapılacak
        alert('PDF upload coming soon!');
    });
    // Upload a Photo: only open file picker, do not show or switch any view
    uploadPhoto.addEventListener('click', (e) => {
        plusMenu.classList.remove('show');
        chatImageInput.click();
    });

    // --- IMAGE UPLOAD PREVIEW FRAME FOR CHAT ---
    // Create image preview frame above chat input
    let chatImagePreviewFrame = document.getElementById('chat-image-preview-frame');
    if (!chatImagePreviewFrame) {
        chatImagePreviewFrame = document.createElement('div');
        chatImagePreviewFrame.id = 'chat-image-preview-frame';
        chatImagePreviewFrame.style.display = 'none';
        chatImagePreviewFrame.style.textAlign = 'center';
        chatImagePreviewFrame.style.margin = '16px 0 8px 0'; // More margin above and below
        chatImagePreviewFrame.innerHTML = `
            <img id="chat-image-preview-img" style="max-width:180px;max-height:120px;display:block;margin:0 auto 10px auto;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1.5px solid #e0e0e0;padding:10px;background:#fafbfc;" />
            <button id="remove-chat-image" style="background:#ff4d4f;color:#fff;border:none;padding:6px 18px;border-radius:20px;cursor:pointer;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.07);transition:background 0.2s;">✖ Remove</button>
        `;
        userInput.parentNode.insertBefore(chatImagePreviewFrame, userInput);
    }
    let chatImagePreviewImg = document.getElementById('chat-image-preview-img');
    let removeChatImageBtn = document.getElementById('remove-chat-image');

    // Add a hidden file input for photo upload in chat view
    let chatImageInput = document.getElementById('chat-image-input');
    if (!chatImageInput) {
        chatImageInput = document.createElement('input');
        chatImageInput.type = 'file';
        chatImageInput.accept = 'image/*';
        chatImageInput.style.display = 'none';
        chatImageInput.id = 'chat-image-input';
        document.body.appendChild(chatImageInput);
    }

    // Upload a Photo: trigger file input, show preview frame
    uploadPhoto.addEventListener('click', () => {
        plusMenu.classList.remove('show');
        // Reset the value so the same file can be selected again
        chatImageInput.value = '';
        chatImageInput.click();
    });

    // When image selected, show preview frame
    let chatImageFile = null;
    chatImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        chatImageFile = file;
        chatImagePreviewImg.src = URL.createObjectURL(file);
        chatImagePreviewFrame.style.display = 'block';
    });
    // Remove image button
    removeChatImageBtn.addEventListener('click', () => {
        chatImageFile = null;
        chatImagePreviewFrame.style.display = 'none';
        chatImagePreviewImg.src = '';
    });

    // --- OVERRIDE SEND BUTTON TO HANDLE IMAGE+TEXT ---
    // Save original sendMessage
    const originalSendMessage = sendMessage;
    sendButton.removeEventListener('click', sendMessage);
    sendButton.addEventListener('click', async () => {
        if (isGenerating) {
            stopGenerating();
            return;
        }
        const userMessage = userInput.value.trim();
        // If no image selected, use original send
        if (!chatImageFile) {
            originalSendMessage();
            return;
        }
        // If image selected, send image+text
        // Show user message in chat (do not show '[Image uploaded]' text)
        const userMsgDiv = addMessage('user', userMessage);
        // Show image preview in chat
        const imgPreview = document.createElement('img');
        imgPreview.src = URL.createObjectURL(chatImageFile);
        imgPreview.style.maxWidth = '200px';
        imgPreview.style.display = 'block';
        userMsgDiv.appendChild(imgPreview);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        // Prepare form data
        const formData = new FormData();
        formData.append('image', chatImageFile);
        if (userMessage) formData.append('text', userMessage);
        // Add AI message for classification
        let aiMsg = addMessage('ai', 'Analyzing image...');
        chatContainer.scrollTop = chatContainer.scrollHeight;
        // Clear preview and input
        chatImageFile = null;
        chatImagePreviewFrame.style.display = 'none';
        chatImagePreviewImg.src = '';
        userInput.value = '';
        // Set generation state and update button
        isGenerating = true;
        updateSendButton();
        // Create AbortController for streaming
        currentController = new AbortController();
        const signal = currentController.signal;
        try {
            const response = await fetch(window.CHAT_CONFIG.API.IMAGE_PREDICT_WITH_EXPLANATION_STREAM, {
                method: 'POST',
                body: formData,
                signal
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let explanationText = '';
            aiMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const eventData = JSON.parse(line.substring(6));
                            if (eventData.type === 'explanation') {
                                let contentToAdd = '';
                                try {
                                    const llmData = JSON.parse(eventData.content);
                                    if (llmData.message && llmData.message.content) {
                                        contentToAdd = llmData.message.content;
                                    } else if (llmData.response) {
                                        contentToAdd = llmData.response;
                                    }
                                } catch {
                                    contentToAdd = eventData.content;
                                }
                                if (contentToAdd) {
                                    explanationText += contentToAdd;
                                    aiMsg.innerHTML = renderMarkdown(explanationText);
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                }
                            } else if (eventData.type === 'error') {
                                aiMsg.innerHTML = `<b>Error:</b> ${eventData.message}`;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } catch (error) {
            aiMsg.innerHTML = `<b>Error:</b> ${error.message}`;
        } finally {
            isGenerating = false;
            currentController = null;
            updateSendButton();
        }
    });

    // Stream LLM explanation as a chat message (send full prediction result as JSON)
    async function streamLlmExplanation(predictionResult, userText) {
        const aiMsg = addMessage('ai', '');
        aiMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        chatContainer.scrollTop = chatContainer.scrollHeight;
        try {
            const response = await fetch(window.CHAT_CONFIG.API.GENERATE_STREAM, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: getCurrentModel(),
                    messages: [
                        { role: 'system', content: 'You are an expert in image classification.' },
                        { role: 'user', content: `I uploaded a photo. Here is the full prediction result as JSON:\n\n${JSON.stringify(predictionResult, null, 2)}${userText ? '\n\nUser said: ' + userText : ''}\n\nPlease interpret and explain the result in detail for a non-technical user.` }
                    ]
                })
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let done = false;
            aiMsg.innerHTML = '';
            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    chunk.split('\n').forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                if (data.message && data.message.content) {
                                    fullText += data.message.content;
                                    aiMsg.innerHTML = renderMarkdown(fullText);
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                } else if (data.response) {
                                    fullText += data.response;
                                    aiMsg.innerHTML = renderMarkdown(fullText);
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                }
                            } catch (e) { /* ignore parse errors */ }
                        }
                    });
                }
            }
        } catch (error) {
            aiMsg.innerHTML = `<b>LLM Error:</b> ${error.message}`;
        }
    }

    // Helper to get current model, defaulting to llama3.2:latest if not selected
    function getCurrentModel() {
        const modelMenu = document.getElementById('model-menu');
        if (modelMenu) {
            // Always set llama3.2:latest as selected visually and logically
            const llamaBtn = modelMenu.querySelector('[data-model="llama3.2:latest"]');
            if (llamaBtn) {
                // Remove .selected from all
                modelMenu.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                llamaBtn.classList.add('selected');
                return 'llama3.2:latest';
            }
            // Fallback: if not found, use any selected
            const selected = modelMenu.querySelector('.selected');
            if (selected && selected.dataset && selected.dataset.model) {
                return selected.dataset.model;
            }
        }
        // Default model
        return 'llama3.2:latest';
    }

    // Add padding to the input container (ask something box and buttons)
    const inputContainer = document.getElementById('input-container');
    if (inputContainer) {
        inputContainer.style.paddingBottom = '100px'; // Adjust value as needed
    }

    // Widen the chat container (if not already present)
    if (chatContainer) {
        chatContainer.style.maxWidth = '750px';
        chatContainer.style.width = '100%';
        chatContainer.style.marginLeft = 'auto';
        chatContainer.style.marginRight = 'auto';
    }

    // --- FORCE WHITE THEME (quick JS override, for full effect update your CSS) ---
    document.body.style.background = '#fff';
    document.body.style.color = '#222';
    // Remove purple backgrounds from common elements
    const elements = document.querySelectorAll('[style*="background"], .purple, .theme-mor, .header, .footer');
    elements.forEach(el => {
        el.style.background = '#fff';
        el.style.backgroundColor = '#fff';
        el.style.color = '#222';
        el.style.borderColor = '#eee';
    });
    // Optionally, override links and buttons
    const links = document.querySelectorAll('a, button');
    links.forEach(el => {
        el.style.background = '#fff';
        el.style.color = '#222';
        el.style.borderColor = '#eee';
    });

    // --- FIX LOGO INVERSION ---
    // If the logo was inverted via CSS filter, remove it
    const logo = document.querySelector('.app-logo, #app-logo, .logo, img[alt="logo"]');
    if (logo) {
        logo.style.filter = '';
        logo.style.webkitFilter = '';
        logo.classList.remove('inverted', 'invert', 'logo-invert');
    }
});
