#!/usr/bin/env python3
"""
Process food-loading.gif to remove white background completely
Leaves only the rotating vegetables with transparent background
"""
from PIL import Image, ImageSequence
import sys
import os

def detect_background_color(frame):
    """Detect the background color by sampling corner pixels"""
    width, height = frame.size
    corners = [
        (0, 0),
        (width-1, 0),
        (0, height-1),
        (width-1, height-1)
    ]
    
    # Sample corner pixels
    corner_colors = []
    for x, y in corners:
        if frame.mode == 'RGBA':
            r, g, b, a = frame.getpixel((x, y))
        else:
            r, g, b = frame.getpixel((x, y))
        corner_colors.append((r, g, b))
    
    # Find the most common color (likely background)
    avg_r = sum(c[0] for c in corner_colors) // len(corner_colors)
    avg_g = sum(c[1] for c in corner_colors) // len(corner_colors)
    avg_b = sum(c[2] for c in corner_colors) // len(corner_colors)
    
    return (avg_r, avg_g, avg_b)

def color_distance(color1, color2):
    """Calculate color distance (Euclidean distance in RGB space)"""
    r1, g1, b1 = color1
    r2, g2, b2 = color2
    return ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5

def remove_background(input_path, output_path, threshold=20):
    """
    Remove white/light background from an animated GIF completely.
    More aggressive removal for white backgrounds.
    threshold: maximum color distance from white to remove (0-255)
    """
    try:
        # Open the GIF
        gif = Image.open(input_path)
        
        # Detect background color from first frame
        first_frame = gif.convert('RGB')
        bg_color = detect_background_color(first_frame)
        print(f"Detected background color: RGB{bg_color}")
        
        # Get frames
        frames = []
        durations = []
        
        for frame in ImageSequence.Iterator(gif):
            # Convert to RGBA if not already
            if frame.mode != 'RGBA':
                frame = frame.convert('RGBA')
            
            # Get image data
            data = frame.getdata()
            width, height = frame.size
            
            # Create new image data with transparency
            new_data = []
            for i, item in enumerate(data):
                r, g, b, a = item
                
                # Calculate distance from background color
                distance = color_distance((r, g, b), bg_color)
                
                # More aggressive white/light color detection
                # Check if it's very close to white (248+) or very light (240+)
                is_very_white = r >= 248 and g >= 248 and b >= 248
                is_light = r >= 240 and g >= 240 and b >= 240
                
                # Also check distance from detected background
                # Remove if close to background color OR very light/white
                # Use higher threshold for white backgrounds
                if distance <= threshold or is_light or is_very_white:
                    new_data.append((0, 0, 0, 0))  # Fully transparent
                else:
                    # Keep original pixel with full opacity
                    new_data.append((r, g, b, 255))
            
            # Create new frame with transparent background
            new_frame = Image.new('RGBA', frame.size)
            new_frame.putdata(new_data)
            frames.append(new_frame)
            
            # Preserve frame duration
            if hasattr(frame, 'info') and 'duration' in frame.info:
                durations.append(frame.info['duration'])
            else:
                durations.append(100)  # Default 100ms
        
        # Save as animated GIF
        if len(frames) > 1:
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                duration=durations,
                loop=gif.info.get('loop', 0),
                format='GIF',
                transparency=0,
                disposal=2  # Clear to background
            )
        else:
            frames[0].save(output_path, format='GIF', transparency=0)
        
        print(f"✅ Successfully processed {input_path}")
        print(f"   Output: {output_path}")
        print(f"   Frames: {len(frames)}")
        print(f"   Background color removed: RGB{bg_color}")
        return True
        
    except Exception as e:
        print(f"❌ Error processing GIF: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    input_file = 'deploy/food-loading.gif'
    output_file = 'deploy/food-loading.gif'
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    
    # Process the GIF - threshold of 20 removes pixels close to white background
    # Using higher threshold for more aggressive white removal
    success = remove_background(input_file, output_file, threshold=20)
    
    if success:
        print(f"\n✅ Done! Processed GIF saved to {output_file}")
        print(f"   Background completely removed, vegetables preserved")
    else:
        print(f"\n❌ Failed to process GIF")
        sys.exit(1)

