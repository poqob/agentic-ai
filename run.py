from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
import requests
import os
from flask_cors import CORS
import json
from config import (
    OLLAMA_API_HOST, HOST, PORT, DEBUG, DEFAULT_MODEL, CORS_ORIGINS, 
    REGRESSION_API_HOST, REGRESSION_PREDICT_ENDPOINT,
    IMAGE_API_HOST, IMAGE_PREDICT_ENDPOINT,
    LIGHTS_API_HOST, LIGHTS_API_ENDPOINT
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
        print(f"Received messages: {messages}")
        
        # Check if this is a lights control command
        if len(messages) > 0 and messages[-1].get('role') == 'user':
            user_message = messages[-1].get('content', '').lower()
            
            # Check if the message is related to lights
            light_keywords = ['ışık', 'lamba', 'aydınlat', 'aç', 'kapat', 'söndür', 'yak', 'turn on', 'turn off', 'lights', 'switch on', 'switch off', 'light', 'lamp']
            room_keywords = ['salon', 'mutfak', 'yatak', 'banyo', 'tuvalet', 'toilet', 'wc', 'çocuk', 'ofis', 'koridor', 'living', 'kitchen', 'bedroom', 'bathroom', 'hallway', 'office']
            
            is_light_command = any(keyword in user_message for keyword in light_keywords) and \
                              any(keyword in user_message for keyword in room_keywords)
            
            print(is_light_command)
            if is_light_command:
                from client import process_lights_command_from_text
                
                # Process the command through our lights control function
                print(user_message)
                lights_result = process_lights_command_from_text(user_message, model)
                
                if lights_result["success"]:
                    # Create a response from the lights result
                    action = "açıldı" if lights_result.get("status") == "on" else "kapatıldı"
                    action_eng = "turned on" if lights_result.get("status") == "on" else "turned off"
                    room = lights_result.get("room", "belirtilen oda")
                    
                    # Check if the original message was in English
                    is_english_query = any(word in user_message for word in ['turn', 'switch', 'lights', 'on', 'off'])
                    
                    # Create assistant message to add to chat history
                    if is_english_query:
                        assistant_message = f"The {room} lights have been {action_eng}. Would you like to control lights in another room?"
                    else:
                        assistant_message = f"{room.capitalize()} ışıkları {action}. Başka bir odada ışık kontrolü yapmamı ister misiniz?"
                    
                    # Return formatted chat response
                    return jsonify({
                        "message": {
                            "role": "assistant",
                            "content": assistant_message
                        },
                        "lights_action": {
                            "room": room,
                            "status": lights_result.get("status")
                        }
                    })
                else:
                    # If there was an error with the lights control, inform the user
                    error_message = lights_result.get("error", "Işıklar kontrol edilemedi, bir hata oluştu.")
                    return jsonify({
                        "message": {
                            "role": "assistant", 
                            "content": f"Üzgünüm, ışıkları kontrol ederken bir sorun oluştu: {error_message}"
                        }
                    })
        
        # If not a lights command, proceed with regular chat
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
        
        # Check if this is a lights control command
        if len(messages) > 0 and messages[-1].get('role') == 'user':
            user_message = messages[-1].get('content', '').lower()
            
            # Check if the message is related to lights
            light_keywords = ['ışık', 'lamba', 'aydınlat', 'aç', 'kapat', 'söndür', 'yak', 'turn on', 'turn off', 'lights', 'switch on', 'switch off', 'light', 'lamp']
            room_keywords = ['salon', 'mutfak', 'yatak', 'banyo', 'tuvalet', 'toilet', 'wc', 'çocuk', 'ofis', 'koridor', 'living', 'kitchen', 'bedroom', 'bathroom', 'hallway', 'office']
            
            is_light_command = any(keyword in user_message for keyword in light_keywords) and \
                              any(keyword in user_message for keyword in room_keywords)
            
            if is_light_command:
                from client import process_lights_command_from_text
                import json
                # Process the command through our lights control function
                lights_result = process_lights_command_from_text(user_message, model)
                print (lights_result)
                def generate_lights_response():
                    if lights_result["success"]:
                        # Create a response from the lights result
                        action = "açıldı" if lights_result.get("status") == "on" else "kapatıldı"
                        action_eng = "turned on" if lights_result.get("status") == "on" else "turned off"
                        room = lights_result.get("room", "belirtilen oda")
                        
                        # Check if the original message was in English
                        is_english_query = any(word in user_message for word in ['turn', 'switch', 'lights', 'on', 'off'])
                        
                        # Create assistant message
                        if is_english_query:
                            assistant_message = f"The {room} lights have been {action_eng}. Would you like to control lights in another room?"
                        else:
                            assistant_message = f"{room.capitalize()} ışıkları {action}. Başka bir odada ışık kontrolü yapmamı ister misiniz?"
                        
                        # Stream the response in chunks to simulate typing
                        chunks = [assistant_message[i:i+10] for i in range(0, len(assistant_message), 10)]
                        
                        for i, chunk in enumerate(chunks):
                            # First chunk starts the message
                            if i == 0:
                                response_data = {
                                    "message": {"role": "assistant", "content": chunk},
                                    "lights_action": {
                                        "room": room,
                                        "status": lights_result.get("status")
                                    }
                                }
                            else:
                                response_data = {
                                    "message": {"role": "assistant", "content": chunk}
                                }
                                
                            yield f"data: {json.dumps(response_data)}\n\n"
                            
                    else:
                        # If there was an error with the lights control, inform the user
                        error_message = lights_result.get("error", "Işıklar kontrol edilemedi, bir hata oluştu.")
                        response_data = {
                            "message": {
                                "role": "assistant", 
                                "content": f"Üzgünüm, ışıkları kontrol ederken bir sorun oluştu: {error_message}"
                            }
                        }
                        yield f"data: {json.dumps(response_data)}\n\n"
                
                return Response(stream_with_context(generate_lights_response()), content_type='text/event-stream')
        
        # If not a lights command, proceed with regular chat stream
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

@app.route('/api/lights/status', methods=['GET'])
def lights_status():
    """
    Check if the lights service is running
    
    Returns:
        JSON response with service status
    """
    from client import check_lights_service
    
    is_running = check_lights_service()
    
    return jsonify({
        "success": True,
        "service_running": is_running,
        "host": LIGHTS_API_HOST
    })

@app.route('/api/lights/control', methods=['POST'])
def lights_control():
    """
    Control the lights in a specified room
    
    Expects JSON:
    {
        "room": "room_name",
        "lights": true/false (true to turn on, false to turn off)
    }
    
    Returns:
        JSON response with the result
    """
    from client import control_home_lights
    
    try:
        data = request.json
        room = data.get('room')
        turn_on = data.get('lights', True)
        
        if not room:
            return jsonify({
                "success": False,
                "error": "Room parameter is required"
            }), 400
        
        result = control_home_lights(room, turn_on)
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/lights/control_from_text', methods=['POST'])
def lights_control_from_text():
    """
    Process natural language command to control home lights
    
    Expects JSON:
    {
        "text": "Natural language command to control lights",
        "model": "LLM model to use" (optional)
    }
    
    Returns:
        JSON response with the result
    """
    from client import process_lights_command_from_text
    
    try:
        data = request.json
        text = data.get('text')
        model = data.get('model', DEFAULT_MODEL)
        
        if not text:
            return jsonify({
                "success": False,
                "error": "Text parameter is required"
            }), 400
        
        result = process_lights_command_from_text(text, model)
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/lights/test', methods=['GET'])
def test_lights():
    """
    Simple test endpoint for lights service connectivity
    """
    from client import check_lights_service, control_home_lights
    
    # First test service availability
    is_running = check_lights_service()
    
    if (is_running):
        # If service is running, attempt a test command
        result = control_home_lights("salon", True)
        return jsonify({
            "success": True,
            "service_status": "running",
            "test_result": result
        })
    else:
        return jsonify({
            "success": False,
            "service_status": "not running",
            "error": "Işık kontrol servisi bağlantısı kurulamadı"
        })

@app.route('/api/lights/toilet/<action>', methods=['GET'])
def toilet_lights_quick_control(action):
    """
    Quick endpoint to directly control toilet lights
    
    Args:
        action: "on" or "off" to control the lights
        
    Returns:
        JSON response with the result
    """
    from client import control_home_lights
    
    # Determine if we're turning lights on or off
    if action.lower() == "on":
        turn_on = True
    elif action.lower() == "off":
        turn_on = False
    else:
        return jsonify({
            "success": False,
            "error": "Invalid action. Use 'on' or 'off'."
        }), 400
    
    # Control the lights
    result = control_home_lights("tuvalet", turn_on)
    
    # Return result
    if result["success"]:
        return jsonify(result)
    else:
        return jsonify(result), 500

@app.route('/api/lights/control_from_text', methods=['POST'])
def control_lights_from_text():
    """
    Process natural language light control commands
    
    Request JSON format:
    {
        "text": "Turn on the living room lights",
        "model": "mistral:7b" (optional)
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        model = data.get('model', DEFAULT_MODEL)
        
        # Use the light processing function
        from client import process_lights_command_from_text
        result = process_lights_command_from_text(text, model)
        
        # Return the result
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500
        
@app.route('/api/lights/control', methods=['POST'])
def control_lights():
    """
    Direct control of home lights (no natural language processing)
    
    Request JSON format:
    {
        "room": "kitchen",
        "lights": true/false
    }
    """
    try:
        data = request.json
        room = data.get('room')
        lights = data.get('lights')
        
        # Validate input
        if room is None:
            return jsonify({
                "success": False,
                "error": "Room name is required"
            }), 400
            
        if lights is None:
            return jsonify({
                "success": False, 
                "error": "Lights status (true/false) is required"
            }), 400
        
        # Use the light control function
        from client import control_home_lights
        result = control_home_lights(room, lights)
        
        # Return the result
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
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

@app.route('/lights/status', methods=['GET'])
def lights_status_shortcut():
    """Redirect shortcut for backward compatibility"""
    return lights_status()

@app.route('/lights/control', methods=['POST'])
def lights_control_shortcut():
    """Redirect shortcut for backward compatibility"""
    return lights_control()

@app.route('/lights/control_from_text', methods=['POST'])
def lights_control_from_text_shortcut():
    """Redirect shortcut for backward compatibility"""
    return lights_control_from_text()

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG)