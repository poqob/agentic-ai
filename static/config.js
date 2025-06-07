// Configuration file for Ollama Chat frontend

// API endpoints
const CONFIG = {
    // API routes
    API: {
        MODELS: '/api/models',
        GENERATE: '/api/generate',
        GENERATE_STREAM: '/api/generate/stream',
        CHAT: '/api/chat',
        CHAT_STREAM: '/api/chat/stream',
        REGRESSION_PREDICT: '/api/regression/predict',
        REGRESSION_PREDICT_FROM_TEXT: '/api/regression/predict_from_text',
        IMAGE_PREDICT: '/api/image/predict',
        IMAGE_PREDICT_WITH_EXPLANATION: '/api/image/predict_with_explanation',
        IMAGE_PREDICT_WITH_EXPLANATION_STREAM: '/api/image/predict_with_explanation/stream',
        LIGHTS_STATUS: '/api/lights/status',
        LIGHTS_CONTROL: '/api/lights/control',
        LIGHTS_CONTROL_FROM_TEXT: '/api/lights/control_from_text'
    },

    // Default model
    DEFAULT_MODEL: 'llama3.2:latest',

    // UI configuration
    UI: {
        TYPING_INDICATOR_TIMEOUT: 30000, // 30 seconds max for typing indicator
        ERROR_MESSAGE_TIMEOUT: 5000,     // 5 seconds for error messages
        MAX_MESSAGE_LENGTH: 12000,       // Maximum message length to display
    }
};

// Export the configuration
window.CHAT_CONFIG = CONFIG;
