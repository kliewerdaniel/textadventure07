#!/bin/bash
# Example script to demonstrate how to use the text adventure generator
# with different command-line arguments

# Process all images with default settings
# python main.py

# Process images with a specific narrative style
# python main.py --style fantasy

# Process a subset of images to avoid memory issues
# This will process images 1.jpg through 10.jpg
python main.py --start 1 --end 10 --batch-size 5 --delay 10

# Process another subset of images
# This will process images 11.jpg through 20.jpg
# python main.py --start 11 --end 20 --batch-size 5 --delay 10

# Process images with a different narrative style and longer stories
# python main.py --style sci-fi --length 500

# Process images with custom input and output directories
# python main.py --input my_images --output my_adventure

# Process images with a configuration file
# python main.py --config my_config.json
