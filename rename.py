#!/usr/bin/env python3
"""
Script to rename image files in the input_images directory to sequential numbers.
"""

import os
import sys
from pathlib import Path

def rename_images(input_dir='input_images'):
    """
    Rename all image files in the specified directory to sequential numbers.
    
    Args:
        input_dir (str): Path to the directory containing images to rename
    """
    # Check if directory exists
    if not os.path.isdir(input_dir):
        print(f"Error: Directory '{input_dir}' not found.")
        return False
    
    # Get all files in the directory
    try:
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
    except Exception as e:
        print(f"Error accessing directory: {e}")
        return False
    
    # Sort files to ensure consistent ordering
    files.sort()
    
    # Track successful renames
    success_count = 0
    
    # Rename each file
    for i, filename in enumerate(files, 1):
        # Get file extension
        _, ext = os.path.splitext(filename)
        
        # Create new filename
        new_filename = f"{i}{ext}"
        
        # Full paths
        old_path = os.path.join(input_dir, filename)
        new_path = os.path.join(input_dir, new_filename)
        
        # Rename file
        try:
            print(f"Renaming: {filename} -> {new_filename}")
            os.rename(old_path, new_path)
            success_count += 1
        except Exception as e:
            print(f"Error renaming {filename}: {e}")
    
    print(f"\nRenamed {success_count} of {len(files)} files successfully.")
    return True

if __name__ == "__main__":
    # Allow specifying a different directory via command line
    input_dir = sys.argv[1] if len(sys.argv) > 1 else 'input_images'
    rename_images(input_dir)
