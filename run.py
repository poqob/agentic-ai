from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
import requests
import os
from flask_cors import CORS
import json
from config import (
    OLLAMA_API_HOST, HOST, PORT, DEBUG, DEFAULT_MODEL, CORS_ORIGINS, 
    REGRESSION_API_HOST, REGRESSION_PREDICT_ENDPOINT,
    IMAGE_API_HOST, IMAGE_PREDICT_ENDPOINT
)

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

@app.route('/api/regression/predict', methods=['POST'])
def regression_predict():
    try:
        data = request.json
        response = requests.post(
            f"{REGRESSION_API_HOST}{REGRESSION_PREDICT_ENDPOINT}",
            json=data
        )
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/regression/status', methods=['GET'])
def regression_status():
    """Check and return the status of the regression service"""
    try:
        from client import test_regression_service
        
        results = test_regression_service()
        if results["overall_success"]:
            return jsonify({
                "success": True,
                "message": "Regression service is running correctly",
                "details": results
            })
        else:
            return jsonify({
                "success": False,
                "message": "Regression service test failed",
                "details": results
            }), 503
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/regression/predict_from_text', methods=['POST'])
def regression_predict_from_text():
    try:
        from client import process_regression_request_from_prompt, check_regression_service
        
        # Check if regression service is running first
        if not check_regression_service():
            return jsonify({
                "success": False, 
                "error": f"Regression service not running at {REGRESSION_API_HOST}. Please start the service on port 5001."
            }), 503
        
        data = request.json
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({"success": False, "error": "Missing 'message' field"}), 400
            
        model = data.get('model', DEFAULT_MODEL)
        
        result = process_regression_request_from_prompt(user_message, model)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback_str
        }), 500

@app.route('/api/image/predict', methods=['POST'])
def image_predict():
    """
    Endpoint to handle image prediction requests.
    Accepts an image file and forwards it to the image prediction service.
    """
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No image file selected"
            }), 400
        
        # Forward the image file to the image prediction API
        files = {'image': (image_file.filename, image_file.read(), image_file.content_type)}
        
        try:
            response = requests.post(
                f"{IMAGE_API_HOST}{IMAGE_PREDICT_ENDPOINT}",
                files=files
            )
            
            if response.status_code == 200:
                return jsonify({
                    "success": True,
                    "prediction": response.json()
                })
            else:
                return jsonify({
                    "success": False,
                    "error": f"Image API Error: {response.status_code}",
                    "details": response.text
                }), response.status_code
                
        except requests.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Failed to connect to image prediction service at {IMAGE_API_HOST}: {str(e)}"
            }), 503
            
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback_str
        }), 500

@app.route('/api/image/predict_with_explanation', methods=['POST'])
def image_predict_with_explanation():
    """
    Enhanced endpoint that processes an image prediction and then asks
    the language model to provide a natural language explanation of the results.
    """
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No image file selected"
            }), 400
        
        # Get the LLM model to use for explanation
        data = request.form.to_dict()
        model = data.get('model', DEFAULT_MODEL)
        
        # Forward the image file to the image prediction API
        files = {'image': (image_file.filename, image_file.read(), image_file.content_type)}
        
        try:
            # Step 1: Get image prediction
            response = requests.post(
                f"{IMAGE_API_HOST}{IMAGE_PREDICT_ENDPOINT}",
                files=files
            )
            
            if response.status_code != 200:
                return jsonify({
                    "success": False,
                    "error": f"Image API Error: {response.status_code}",
                    "details": response.text
                }), response.status_code
                
            prediction_results = response.json()
            
            # Step 2: Ask LLM to explain the results
            system_prompt = """
            You are an AI assistant that explains image classification results in a friendly, conversational way.
            Based on the image classification results provided, explain what the image contains, the confidence level,
            and any other interesting insights. Be concise but informative.
            """
            
            # Prepare the user message with prediction results
            user_message = f"""
            The image classification results are:
            - Prediction: {prediction_results.get('prediction')}
            - Confidence: {prediction_results.get('confidence')}
            - Score: {prediction_results.get('score')}
            - Status: {prediction_results.get('status')}
            
            Please explain these results in a conversational way. The user uploaded an image and wants to understand what the AI detected.
            """
            
            # Call LLM for explanation
            try:
                print(f"Sending request to Ollama API at {OLLAMA_API_HOST}/api/chat with model: {model}")
                
                llm_response = requests.post(
                    f"{OLLAMA_API_HOST}/api/chat",
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message}
                        ]
                    },
                    timeout=30  # 30 saniye timeout ekleyelim
                )
                
                print(f"Ollama API response status: {llm_response.status_code}")
                
                if llm_response.status_code != 200:
                    # Hata durumunda daha fazla bilgi toplama
                    error_details = {
                        "status_code": llm_response.status_code,
                        "response_text": llm_response.text[:500],  # İlk 500 karakter
                        "ollama_host": OLLAMA_API_HOST,
                        "model": model
                    }
                    
                    print(f"Ollama API error: {error_details}")
                    
                    return jsonify({
                        "success": True, 
                        "prediction": prediction_results,
                        "explanation": "Prediction successful, but couldn't generate explanation.",
                        "error_details": error_details
                    })
            
            except requests.RequestException as e:
                # Bağlantı hataları (Ollama çalışmıyor olabilir)
                print(f"Failed to connect to Ollama: {str(e)}")
                return jsonify({
                    "success": True,
                    "prediction": prediction_results,
                    "explanation": f"Görsel analiz başarılı, ancak açıklama üretilemedi. Ollama servisine bağlanılamadı: {str(e)}"
                })
            
            # Extract explanation from LLM response
            explanation = None
            llm_data = llm_response.json()
            
            # Handle different response formats
            if "message" in llm_data and "content" in llm_data["message"]:
                explanation = llm_data["message"]["content"]
            elif "response" in llm_data:
                explanation = llm_data["response"]
            
            # Return combined results
            return jsonify({
                "success": True,
                "prediction": prediction_results,
                "explanation": explanation or "No explanation available"
            })
                
        except requests.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Service connection error: {str(e)}"
            }), 503
            
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback_str
        }), 500

@app.route('/api/image/predict_with_explanation/stream', methods=['POST'])
def image_predict_with_explanation_stream():
    """
    Enhanced endpoint that processes an image prediction and then streams
    the language model's explanation of the results in real-time.
    """
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No image file selected"
            }), 400
        
        # Get the LLM model to use for explanation
        data = request.form.to_dict()
        model = data.get('model', DEFAULT_MODEL)
        
        # Forward the image file to the image prediction API
        files = {'image': (image_file.filename, image_file.read(), image_file.content_type)}
        
        try:
            # Step 1: Get image prediction
            response = requests.post(
                f"{IMAGE_API_HOST}{IMAGE_PREDICT_ENDPOINT}",
                files=files
            )
            
            if response.status_code != 200:
                return jsonify({
                    "success": False,
                    "error": f"Image API Error: {response.status_code}",
                    "details": response.text
                }), response.status_code
                
            prediction_results = response.json()
            print(f"Got prediction results: {prediction_results}")
            
            # Step 2: Stream the LLM explanation
            system_prompt = """
            You are an AI assistant that explains image classification results in a friendly, conversational way.
            Based on the image classification results provided, explain what the image contains, the confidence level,
            and any other interesting insights. Be concise but informative.
            """
            
            # Prepare the user message with prediction results
            user_message = f"""
            The image classification results are:
            - Prediction: {prediction_results.get('prediction')}
            - Confidence: {prediction_results.get('confidence')}
            - Score: {prediction_results.get('score')}
            - Status: {prediction_results.get('status')}
            
            Please explain these results in a conversational way. The user uploaded an image and wants to understand what the AI detected.
            """

            def generate():
                # First yield the prediction results as a single JSON object
                yield f"data: {json.dumps({'type': 'prediction', 'data': prediction_results})}\n\n"
                
                # Then start streaming the LLM explanation
                try:
                    response = requests.post(
                        f"{OLLAMA_API_HOST}/api/chat",
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_message}
                            ],
                            "stream": True
                        },
                        stream=True
                    )
                    
                    if not response.ok:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Ollama API error: {response.status_code}'})}\n\n"
                        return
                    
                    for line in response.iter_lines():
                        if line:
                            # Add metadata to identify this as explanation content
                            yield f"data: {json.dumps({'type': 'explanation', 'content': line.decode('utf-8')})}\n\n"
                            
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                    
            return Response(stream_with_context(generate()), content_type='text/event-stream')
                
        except requests.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Service connection error: {str(e)}"
            }), 503
            
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback_str
        }), 500

@app.route('/image/predict', methods=['POST'])
def image_predict_shortcut():
    """Redirect shortcut for backward compatibility"""
    return image_predict()

@app.route('/image/predict_with_explanation', methods=['POST']) 
def image_predict_with_explanation_shortcut():
    """Redirect shortcut for backward compatibility"""
    return image_predict_with_explanation()

@app.route('/image/predict_with_explanation/stream', methods=['POST']) 
def image_predict_with_explanation_stream_shortcut():
    """Redirect shortcut for backward compatibility"""
    return image_predict_with_explanation_stream()

@app.route('/models', methods=['GET'])
def get_models_shortcut():
    """Redirect shortcut for backward compatibility"""
    return get_models()

@app.route('/generate', methods=['POST'])
def generate_shortcut():
    """Redirect shortcut for backward compatibility"""
    return generate()

@app.route('/generate/stream', methods=['POST'])
def generate_stream_shortcut():
    """Redirect shortcut for backward compatibility"""
    return generate_stream()

@app.route('/chat', methods=['POST'])
def chat_shortcut():
    """Redirect shortcut for backward compatibility"""
    return chat()

@app.route('/chat/stream', methods=['POST'])
def chat_stream_shortcut():
    """Redirect shortcut for backward compatibility"""
    return chat_stream()

@app.route('/regression/predict', methods=['POST'])
def regression_predict_shortcut():
    """Redirect shortcut for backward compatibility"""
    return regression_predict()

@app.route('/regression/predict_from_text', methods=['POST'])
def regression_predict_from_text_shortcut():
    """Redirect shortcut for backward compatibility"""
    return regression_predict_from_text()

@app.route('/regression/status', methods=['GET'])
def regression_status_shortcut():
    """Redirect shortcut for backward compatibility"""
    return regression_status()

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG)