#!/bin/bash

# Define directories
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSIONS_DIR="$BASE_DIR/extensions"
SCRIPTS_DIR="$BASE_DIR/scripts"
APP_DIR="$BASE_DIR"

echo "Starting the Ollama Flask application with extensions..."

# Check if Python is available
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Neither python nor python3 command was found."
    echo "Please install Python or make sure it's in your PATH."
    exit 1
fi
echo "Using Python command: $PYTHON_CMD"

# Check if extensions directory exists
if [ ! -d "$EXTENSIONS_DIR" ]; then
    echo "Extensions directory not found. Would you like to download extensions? (y/n)"
    read -r answer
    if [[ "$answer" == [Yy]* ]]; then
        echo "Running get-extensions.sh..."
        bash "$SCRIPTS_DIR/get-extensions.sh"
    else
        echo "Continuing without extensions..."
    fi
fi

# Run extensions if they exist
if [ -d "$EXTENSIONS_DIR" ]; then
    echo "Running extensions..."
    bash "$SCRIPTS_DIR/run-extensions.sh"
    echo "Extensions started in the background."
else
    echo "No extensions directory found. Skipping extensions."
fi

# Run the main application
echo "Starting main application..."
cd "$APP_DIR" || exit 1
echo "Running main app from directory: $(pwd)"

if [ -f "service.py" ]; then
    echo "Running service.py..."
    $PYTHON_CMD service.py
elif [ -f "app.py" ]; then
    echo "Running app.py..."
    $PYTHON_CMD app.py
else
    echo "Error: Could not find service.py or app.py in the main application directory."
    exit 1
fi

echo "Application has been terminated."
