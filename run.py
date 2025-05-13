from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
import requests
import os
from flask_cors import CORS
import json
from config import OLLAMA_API_HOST, HOST, PORT, DEBUG, DEFAULT_MODEL, CORS_ORIGINS

app = Flask(__name__, static_folder='static')
CORS(app, origins=CORS_ORIGINS)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        response = requests.get(f"{OLLAMA_API_HOST}/api/tags")
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        model = data.get('model', DEFAULT_MODEL)
        prompt = data.get('prompt', '')
        
        response = requests.post(
            f"{OLLAMA_API_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }
        )
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate/stream', methods=['POST'])
def generate_stream():
    try:
        data = request.json
        model = data.get('model', DEFAULT_MODEL)
        prompt = data.get('prompt', '')
        
        def generate():
            response = requests.post(
                f"{OLLAMA_API_HOST}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True
                },
                stream=True
            )
            
            for line in response.iter_lines():
                if line:
                    yield f"data: {line.decode('utf-8')}\n\n"
        
        return Response(stream_with_context(generate()), content_type='text/event-stream')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        model = data.get('model', DEFAULT_MODEL)
        messages = data.get('messages', [])
        
        response = requests.post(
            f"{OLLAMA_API_HOST}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False
            }
        )
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    try:
        data = request.json
        model = data.get('model', DEFAULT_MODEL)
        messages = data.get('messages', [])
        
        def generate():
            response = requests.post(
                f"{OLLAMA_API_HOST}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True
                },
                stream=True
            )
            
            for line in response.iter_lines():
                if line:
                    yield f"data: {line.decode('utf-8')}\n\n"
        
        return Response(stream_with_context(generate()), content_type='text/event-stream')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG)