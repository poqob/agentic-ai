"""
Client utilities for accessing the Ollama and Regression API services
"""

import requests
import json
import traceback
from config import OLLAMA_API_HOST, REGRESSION_API_HOST, REGRESSION_PREDICT_ENDPOINT

def test_regression_service():
    """
    Test regression service connectivity and provide detailed diagnostics
    
    Returns:
        Dictionary with test results and diagnostics
    """
    results = {
        "service_url": REGRESSION_API_HOST,
        "endpoint": REGRESSION_PREDICT_ENDPOINT,
        "full_url": f"{REGRESSION_API_HOST}{REGRESSION_PREDICT_ENDPOINT}",
        "tests": []
    }
    
    # Test 1: Basic connection to host
    try:
        response = requests.get(REGRESSION_API_HOST, timeout=5)
        results["tests"].append({
            "name": "Basic connection to host",
            "success": True,
            "status_code": response.status_code,
            "response_size": len(response.text) if hasattr(response, "text") else "unknown"
        })
    except Exception as e:
        results["tests"].append({
            "name": "Basic connection to host",
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        })
    
    # Test 2: Connection to predict endpoint
    test_data = {"age": 30, "sex": "male", "bmi": 25.0, "children": 1, "smoker": "no", "region": "northeast"}
    try:
        response = requests.post(
            f"{REGRESSION_API_HOST}{REGRESSION_PREDICT_ENDPOINT}",
            json=test_data,
            timeout=5
        )
        results["tests"].append({
            "name": "Predict endpoint test",
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "response": response.text[:500]  # Truncate if too long
        })
    except Exception as e:
        results["tests"].append({
            "name": "Predict endpoint test",
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        })
    
    # Overall status
    results["overall_success"] = all(test["success"] for test in results["tests"])
    return results

def check_regression_service():
    """
    Check if the regression service is running
    
    Returns:
        Boolean indicating if service is accessible
    """
    try:
        # Most ML APIs might not support HEAD requests, try using GET or a more specific endpoint
        # First try the predict endpoint with a minimal request to see if it's alive
        try:
            # Try a small probe request - not all APIs support GET on the root
            response = requests.get(
                f"{REGRESSION_API_HOST}{REGRESSION_PREDICT_ENDPOINT}", 
                timeout=3
            )
            return True
        except:
            # If that fails, try the root URL
            try:
                response = requests.get(
                    f"{REGRESSION_API_HOST}", 
                    timeout=3
                )
                return True
            except:
                # If all connection attempts fail, service is likely down
                return False
    except:
        return False

def get_regression_prediction(data):
    """
    Get a prediction from the regression model API
    
    Args:
        data: Dictionary with regression model input features
        
    Returns:
        Dictionary with prediction results or error
    """
    # First check if regression service is reachable
    if not check_regression_service():
        return {
            "success": False,
            "error": f"Regression service not running at {REGRESSION_API_HOST}. Please start the service on port 5001."
        }
    
    try:
        response = requests.post(
            f"{REGRESSION_API_HOST}{REGRESSION_PREDICT_ENDPOINT}",
            json=data
        )
        
        if response.status_code == 200:
            return {
                "success": True,
                "prediction": response.json()
            }
        else:
            return {
                "success": False,
                "error": f"API Error: {response.status_code}",
                "details": response.text
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Request Error: {str(e)}"
        }
        
def process_regression_request_from_prompt(user_message, model="mistral:7b"):
    """
    Process a user prompt to extract regression input data and get a prediction
    
    This function:
    1. Asks the LLM to extract structured data from the user message
    2. Sends that data to the regression model
    3. Returns the prediction with an explanation
    
    Args:
        user_message: String with user's natural language request
        model: LLM model to use for extraction
        
    Returns:
        Dictionary with the regression result and explanation
    """
    # Define system prompt for extraction
    system_prompt = """
    Extract structured data for a regression model prediction from the user message.
    The output must be valid JSON with these fields:
    - age: numeric value
    - sex: "male" or "female"
    - bmi: numeric value (body mass index)
    - children: integer (number of children)
    - smoker: "yes" or "no"
    - region: one of "northeast", "northwest", "southeast", "southwest"
    - model: optional, defaults to "random_forest"
    
    Only output the JSON object, nothing else.
    """
    
    # Ask LLM to extract structured data
    try:
        extraction_response = requests.post(
            f"{OLLAMA_API_HOST}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            }
        )
        
        if extraction_response.status_code != 200:
            return {
                "success": False,
                "error": f"LLM API Error: {extraction_response.status_code}"
            }
        
        # Get the extracted JSON from the LLM response
        try:
            response_json = extraction_response.json()
            # Check Ollama API response format (might be different based on version)
            if "message" in response_json and "content" in response_json["message"]:
                llm_content = response_json["message"]["content"]
            elif "response" in response_json:
                # Alternative format in some Ollama versions
                llm_content = response_json["response"]
            else:
                # Debug output to see what format we're actually getting
                return {
                    "success": False,
                    "error": f"Unexpected LLM API response format",
                    "response_structure": str(response_json.keys())
                }
            
            # Try to find and extract JSON from the text (LLM might add explanations)
            import re
            json_match = re.search(r'\{.*\}', llm_content, re.DOTALL)
            if json_match:
                llm_content = json_match.group(0)
                
            # Parse the JSON data
            regression_data = json.loads(llm_content)
            
            # Make prediction with regression model
            prediction_result = get_regression_prediction(regression_data)
            
            if prediction_result["success"]:
                # Format nice explanation
                prediction_data = prediction_result["prediction"]
                explanation = {
                    "success": True,
                    "input_data": regression_data,
                    "prediction_result": prediction_data,
                    "explanation": f"Based on the input features (age: {regression_data.get('age')}, sex: {regression_data.get('sex')}, etc.), the regression model predicts: {prediction_data}"
                }
                return explanation
            else:
                return prediction_result
                
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Failed to parse LLM output as JSON",
                "llm_output": llm_content
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Processing error: {str(e)}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"LLM request error: {str(e)}"
        }