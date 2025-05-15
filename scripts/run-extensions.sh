#!/bin/bash

# Define the extensions directory
EXTENSIONS_DIR="../extensions"

# Check if the extensions directory exists
if [ ! -d "$EXTENSIONS_DIR" ]; then
    echo "Error: Extensions directory does not exist at $EXTENSIONS_DIR"
    echo "Please run get-extensions.sh first to download the extensions"
    exit 1
fi

# Enter the extensions directory
cd "$EXTENSIONS_DIR" || exit 1
echo "Entered extensions directory: $(pwd)"

# Find and run service.py files
echo "Starting extension services..."

# Function to run a service in the background
run_service() {
    local dir=$1
    local service_file="$dir/service.py"
    
    # Check which Python command is available
    local PYTHON_CMD=""
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "Error: Neither python nor python3 command was found."
        echo "Please install Python or make sure it's in your PATH."
        return 1
    fi
    
    if [ -f "$service_file" ]; then
        echo "Starting service in $dir using $PYTHON_CMD"
        cd "$dir" || return
        $PYTHON_CMD service.py &
        local PID=$!
        echo "Service started with PID: $PID"
        cd ..
    else
        echo "No service.py found in $dir, checking for alternative main files..."
    fi
}

# Get list of subdirectories
subdirs=$(find . -maxdepth 1 -type d | grep -v "^\.$")

# Run service in each subdirectory
for dir in $subdirs; do
    run_service "$dir"
done

echo "All extension services have been started"
echo "Use 'ps aux | grep python' to view running services"
echo "Use 'kill <PID>' to stop a service"
