from PIL import Image
import numpy as np

def make_transparent(input_path, output_path):
    """
    Convert white/light backgrounds to transparent in an image
    """
    # Open the image
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Convert to numpy array
    data = np.array(img)
    
    # Define the white/light colors to make transparent
    # This targets white and very light colors (RGB values > 240)
    white_mask = (data[:, :, 0] > 240) & (data[:, :, 1] > 240) & (data[:, :, 2] > 240)
    
    # Make white pixels transparent
    data[white_mask] = [255, 255, 255, 0]  # RGBA with alpha = 0 (transparent)
    
    # Convert back to PIL Image
    transparent_img = Image.fromarray(data, 'RGBA')
    
    # Save as PNG to preserve transparency
    transparent_img.save(output_path, 'PNG')
    print(f"Transparent image saved as {output_path}")

# Usage example
if __name__ == "__main__":
    # You'll need to replace 'input_image.png' with your actual image path
    input_file = "cover.png"  # Change this to your image filename
    output_file = "cover_transparent.png"
    
    try:
        make_transparent(input_file, output_file)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        print("Please make sure the image file exists in the current directory")
    except Exception as e:
        print(f"Error processing image: {e}")