#!/bin/bash

echo "Starting test script..."

# Create test directories
echo "Creating test directories..."
mkdir -p test_input_dir
mkdir -p test_output_dir

# Run the Python script with test parameters
echo "Running Python script..."
python3 main.py --input test_input_dir --output test_output_dir --style adventure --length 300 --temperature 0.3
RESULT=$?

# Check the exit code
echo "Python script finished with exit code: $RESULT"
if [ $RESULT -eq 0 ]; then
  echo "Python script executed successfully!"
else
  echo "Python script execution failed with exit code $RESULT"
fi

echo "Test script completed."
