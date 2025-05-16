#!/bin/bash
# filepath: /mnt/newdisk/dosyalar/Dosyalar/projeler/py/ollama-flask/scripts/kill-extensions.sh

# Define the base directory and extensions directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSIONS_DIR="$BASE_DIR/extensions"

echo "Stopping all running extension services..."

# Check if any services are running
PYTHON_PROCESSES=$(ps aux | grep "[p]ython.*service.py" || true)

if [ -z "$PYTHON_PROCESSES" ]; then
    echo "No Python extension services found running."
    exit 0
fi

# Find and kill all Python processes running service.py
echo "Found the following extension services running:"
echo "$PYTHON_PROCESSES"
echo ""

# Kill all python processes running service.py from extensions directory
# We use pkill with a pattern that matches extensions directory path and service.py
echo "Terminating extension services..."
pkill -f "python.*$EXTENSIONS_DIR.*service\.py" || true

# Double-check if any processes are still running
REMAINING_PROCESSES=$(ps aux | grep "[p]ython.*service.py" || true)
if [ -n "$REMAINING_PROCESSES" ]; then
    echo "Some extension services might still be running. Trying with SIGKILL..."
    pkill -9 -f "python.*$EXTENSIONS_DIR.*service\.py" || true
    
    # Final check
    FINAL_CHECK=$(ps aux | grep "[p]ython.*service.py" || true)
    if [ -n "$FINAL_CHECK" ]; then
        echo "Warning: Some processes might still be running:"
        echo "$FINAL_CHECK"
        echo "You may need to manually terminate these processes."
    else
        echo "All extension services have been terminated successfully."
    fi
else
    echo "All extension services have been terminated successfully."
fi

echo "Done."