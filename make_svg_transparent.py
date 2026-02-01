import re

def make_svg_transparent(input_file, output_file):
    """
    Make the background of an SVG transparent by removing or modifying background fills
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Background colors to make transparent (light colors that appear to be backgrounds)
        background_colors = [
            '#D1C082',  # Light brown/tan background
            '#F3F3F3',  # Very light gray background
            '#FDFDFD',  # Almost white
            '#FCFCFB',  # Almost white
            '#F8F8F8',  # Light gray
            '#F5F5F5',  # Light gray
            '#ECECEC',  # Light gray
            '#EBEBEB'   # Light gray
        ]
        
        # Replace background fills with transparent or remove them
        for color in background_colors:
            # Replace fill with transparent
            svg_content = re.sub(
                rf'fill="{re.escape(color)}"',
                'fill="none"',
                svg_content,
                flags=re.IGNORECASE
            )
        
        # Also handle the main background rectangle (usually the first large path)
        # Look for paths that cover the entire canvas (0 0 to 400 400)
        svg_content = re.sub(
            r'<path d="M0 0 C132 0 264 0 400 0 C400 132 400 264 400 400[^"]*" fill="[^"]*"',
            '<path d="M0 0 C132 0 264 0 400 0 C400 132 400 264 400 400 C268 400 136 400 0 400 C0 268 0 136 0 0 Z " fill="none"',
            svg_content
        )
        
        # Write the modified SVG
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        print(f"Transparent SVG saved as {output_file}")
        
    except Exception as e:
        print(f"Error processing SVG: {e}")

# Process the Colorado flag
make_svg_transparent("images/Flag_Of_Colorado.svg", "images/Flag_Of_Colorado_transparent.svg")