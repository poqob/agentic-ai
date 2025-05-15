#!/bin/bash

# Create extensions directory if it doesn't exist
EXTENSIONS_DIR="../extensions"
mkdir -p $EXTENSIONS_DIR
echo "Created extensions directory at $EXTENSIONS_DIR"

# Clone repositories
echo "Downloading extensions..."

# Home Lights Simulation API
echo "Downloading Home Lights Simulation API..."
git clone https://github.com/poqob/home-lights-simulation-api.git "$EXTENSIONS_DIR/home-lights-simulation-api"
if [ $? -eq 0 ]; then
    echo "✓ Successfully downloaded Home Lights Simulation API"
else
    echo "✗ Failed to download Home Lights Simulation API"
fi

# Dogs-Cats MobileNet Flask API
echo "Downloading Dogs-Cats MobileNet Flask API..."
git clone https://github.com/poqob/dogs-cats-mobilnet-flask.git "$EXTENSIONS_DIR/dogs-cats-mobilnet-flask"
if [ $? -eq 0 ]; then
    echo "✓ Successfully downloaded Dogs-Cats MobileNet Flask API"
else
    echo "✗ Failed to download Dogs-Cats MobileNet Flask API"
fi

echo "All downloads completed!"
echo "Extensions are available in $EXTENSIONS_DIR"

# Create combined requirements file for all extensions
echo "Creating combined requirements-extensions.txt file..."
REQUIREMENTS_FILE="../requirements-extensions.txt"
echo "# Combined requirements for all extensions" > $REQUIREMENTS_FILE
echo "# Generated on $(date)" >> $REQUIREMENTS_FILE
echo "" >> $REQUIREMENTS_FILE

# Function to extract requirements from a directory
extract_requirements() {
    local dir="$1"
    local req_file=""
    
    # Find requirements file (could be named requirements.txt or similar)
    if [ -f "$dir/requirements.txt" ]; then
        req_file="$dir/requirements.txt"
    elif [ -f "$dir/requirements/requirements.txt" ]; then
        req_file="$dir/requirements/requirements.txt"
    elif [ -f "$dir/requirements/base.txt" ]; then
        req_file="$dir/requirements/base.txt"
    fi
    
    # If requirements file exists, append to combined file
    if [ -n "$req_file" ]; then
        echo "# Requirements from $(basename "$dir")" >> $REQUIREMENTS_FILE
        cat "$req_file" >> $REQUIREMENTS_FILE
        echo "" >> $REQUIREMENTS_FILE
        echo "  Added requirements from $(basename "$dir")"
    else
        echo "  No requirements file found in $(basename "$dir")"
    fi
}

# Process each extension directory
for ext_dir in "$EXTENSIONS_DIR"/*; do
    if [ -d "$ext_dir" ]; then
        extract_requirements "$ext_dir"
    fi
done

echo "Combined requirements file created at $REQUIREMENTS_FILE"
echo "You can install all requirements with: pip install -r $REQUIREMENTS_FILE"