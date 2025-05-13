// Configuration file for Ollama Chat frontend

// API endpoints
const CONFIG = {
    // API routes
    API: {
        MODELS: '/api/models',
        GENERATE: '/api/generate',
        GENERATE_STREAM: '/api/generate/stream',
        CHAT: '/api/chat',
        CHAT_STREAM: '/api/chat/stream'
    },
    
    // Default model
    DEFAULT_MODEL: 'mistral:7b',
    
    // UI configuration
    UI: {
        TYPING_INDICATOR_TIMEOUT: 30000, // 30 seconds max for typing indicator
        ERROR_MESSAGE_TIMEOUT: 5000,     // 5 seconds for error messages
        MAX_MESSAGE_LENGTH: 12000,       // Maximum message length to display
    }
};

// Export the configuration
window.CHAT_CONFIG = CONFIG;
