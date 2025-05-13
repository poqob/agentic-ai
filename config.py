"""
Configuration file for Ollama Flask application
"""

import os

# API Configuration
OLLAMA_API_HOST = os.environ.get("OLLAMA_API_HOST", "http://localhost:11434")

# Server Configuration
HOST = '0.0.0.0'
PORT = 5000
DEBUG = True

# Default Model Configuration
DEFAULT_MODEL = 'mistral:7b'

# Model Parameters (can be used for future enhancements)
DEFAULT_PARAMETERS = {
    'temperature': 0.7,
    'top_p': 0.9,
    'top_k': 40,
    'max_tokens': 2000
}

# CORS Configuration
CORS_ORIGINS = '*'  # Allow all origins, change to specific domains if needed
