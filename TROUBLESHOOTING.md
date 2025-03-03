# Troubleshooting Guide

This guide addresses common issues you might encounter when using the Image-Based Text Adventure Generator.

## Memory Issues

### Symptoms
- Error messages like "llama runner process has terminated: signal: killed"
- The script crashes when processing images
- The Ollama process is killed by the operating system

### Solutions

1. **Process fewer images at a time**
   - Use the `--start` and `--end` parameters to process a subset of images
   - Example: `python main.py --start 1 --end 10`
   - Then process the next batch: `python main.py --start 11 --end 20`

2. **Increase delays between image processing**
   - Use the `--delay` parameter to add more time between processing images
   - Example: `python main.py --delay 15`

3. **Reduce batch size**
   - Use the `--batch-size` parameter to process fewer images before taking a longer break
   - Example: `python main.py --batch-size 5`

4. **Use smaller models**
   - If you have access to smaller models, you can modify the configuration file
   - Edit `sample_config.json` to use less memory-intensive models

5. **Enable caching**
   - Make sure caching is enabled (it is by default)
   - This will save API responses and reduce the need to reprocess images

## Connection Issues

### Symptoms
- Error messages related to connecting to Ollama
- "Failed to connect to Ollama server"

### Solutions

1. **Ensure Ollama is running**
   - Start Ollama before running the script
   - On macOS/Linux: `ollama serve`
   - On Windows: Start the Ollama application

2. **Check model availability**
   - Make sure the required models are downloaded
   - Run: `ollama list` to see available models
   - If needed, download models: `ollama pull gemma2:27b` and `ollama pull llama3.3:latest`

## Output Issues

### Symptoms
- Missing or incomplete story files
- Broken links between story segments

### Solutions

1. **Check the logs**
   - Look for error messages in the console output
   - Address any specific errors mentioned

2. **Verify image naming**
   - Make sure your images are named with sequential numbers (1.jpg, 2.jpg, etc.)
   - You can use the included `rename.py` script to rename your images

3. **Inspect the cache**
   - If you suspect cache corruption, you can clear the cache directory
   - Delete the `.cache` directory and run the script again

## General Tips

1. **Start small**
   - Begin with a small set of images to test the process
   - Once successful, gradually increase the number of images

2. **Monitor system resources**
   - Keep an eye on memory usage while the script is running
   - If memory usage gets too high, consider reducing batch size or increasing delays

3. **Use the example script**
   - The `example.sh` script provides examples of different configurations
   - Modify it to suit your needs

4. **Check for updates**
   - Make sure you're using the latest version of the script
   - Check for updates to Ollama and the models
