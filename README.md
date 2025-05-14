# Ollama Flask API

A Flask application that provides a web interface for Ollama LLM models with additional capabilities for regression modeling and image classification through AI-powered interpretation.

## Features

- Ollama API integration for text generation and chat
- Web-based chat interface with Markdown rendering
- Real-time streaming responses
- Regression model integration
- Natural language queries to regression models
- Image classification with AI explanations
- Real-time streaming image analysis and explanations
- Cross-origin request support
- Mobile responsive design

## Feature Highlights

### Real-time Streaming Responses
Both chat and image analysis support real-time streaming responses, providing immediate feedback to users while the model is generating content.

### LLM-enhanced ML Model Interpretation
The application combines traditional ML models with LLMs to provide natural language explanations of model outputs:
- Regression results are analyzed by LLMs to provide context and explanations
- Image classification results are enhanced with detailed LLM descriptions

### Service Integration
The application acts as an orchestration layer between multiple AI services:
- Ollama for LLM capabilities (text generation and chat)
- Regression service (port 5001)
- Image classification service (port 5003)

## API Endpoints

### LLM API Endpoints

- `GET /api/models`: List available models
- `POST /api/generate`: Generate text
- `POST /api/generate/stream`: Generate text with streaming response
- `POST /api/chat`: Chat completion
- `POST /api/chat/stream`: Chat completion with streaming response

### Regression API Endpoints

- `POST /api/regression/predict`: Forward request directly to regression model
- `POST /api/regression/predict_from_text`: Extract data from text and send to regression model
- `GET /api/regression/status`: Check regression service status

### Image API Endpoints

- `POST /api/image/predict`: Process image with classification model
- `POST /api/image/predict_with_explanation`: Process image and explain with LLM
- `POST /api/image/predict_with_explanation/stream`: Process image and stream LLM explanation in real-time

> Note: All API endpoints also work without the `/api/` prefix for backward compatibility.

## Usage Examples

### Direct Regression Prediction

```bash
curl -X POST http://localhost:5000/api/regression/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 30,
    "sex": "male",
    "bmi": 25.0,
    "children": 1,
    "smoker": "no",
    "region": "northeast", 
    "model": "random_forest"
  }'
```

### Text-Based Regression Prediction

```bash
curl -X POST http://localhost:5000/api/regression/predict_from_text \
  -H "Content-Type: application/json" \
  -d '{
    "message": "The patient is a 30-year-old male with a BMI of 25, has one child, does not smoke and lives in the northeast region. Make a regression prediction for this patient.",
    "model": "mistral:7b"
  }'
```

### Image Classification with Explanation

```bash
# Using curl with form data for image upload
curl -X POST http://localhost:5000/api/image/predict_with_explanation \
  -F "image=@path/to/your/image.jpg" \
  -F "model=mistral:7b"
```

### Streaming Image Analysis

```javascript
// JavaScript example for streaming image analysis
fetch('/api/image/predict_with_explanation/stream', {
    method: 'POST',
    body: formData // FormData with image and model
})
.then(response => {
    const reader = response.body.getReader();
    // Process the stream chunks as they arrive...
})
```

## Setup

1. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Flask application:
   ```bash
   python run.py
   ```

3. Open http://localhost:5000 in your browser

4. Ensure the following services are running:
   - Ollama API on port 11434 (default)
   - Regression service on port 5001
   - Image classification service on port 5003

## Configuration

The application can be configured in `config.py`:

### Backend configuration (`config.py`):
- Ollama API host (default: `http://localhost:11434`)
- Regression API host and endpoint
- Image classification API host and endpoint
- Server host, port and debug settings
- Default LLM model
- CORS settings

### Frontend configuration (`static/config.js`):
- API endpoint paths
- Default model settings
- UI parameters (timeouts, display limits)

## Requirements

### Required Services
- **Ollama**: Running on port 11434 with models like `mistral:7b` installed
- **Regression Service**: A machine learning service running on port 5001
- **Image Classification Service**: An image processing service running on port 5003

### Dependencies
- Flask and Flask-CORS
- Requests
- Python 3.8+

## Future Development

Potential enhancements for future versions:
- User authentication and session management
- Enhanced mobile responsiveness
- Comprehensive unit tests
- Support for more LLM models
- Extended error handling for edge cases
- Performance optimizations for large images and complex queries

## Architecture

The application is designed with a modular architecture:

1. **Flask Backend**: Handles API routing and service integration
2. **Ollama Integration**: Provides LLM capabilities via the Ollama API
3. **Regression Service**: External ML service for regression predictions
4. **Image Classification Service**: External ML service for image analysis
5. **Web Interface**: Responsive UI with chat and image analysis tabs

## Mobile Compatibility

The application is designed to work well on mobile devices with a responsive layout.
