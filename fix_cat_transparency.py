import re

def fix_cat_svg(input_file, output_file):
    """
    Fix the cat SVG by only removing the background, keeping the cat design intact
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Only remove the main background rectangle (the canvas background)
        # Keep all the cat-colored fills intact
        svg_content = re.sub(
            r'<path d="M0 0 C132 0 264 0 400 0 C400 132 400 264 400 400 C268 400 136 400 0 400 C0 268 0 136 0 0 Z " fill="#D1C082"',
            '<path d="M0 0 C132 0 264 0 400 0 C400 132 400 264 400 400 C268 400 136 400 0 400 C0 268 0 136 0 0 Z " fill="none"',
            svg_content
        )
        
        # Remove the second background layer
        svg_content = re.sub(
            r'<path d="[^"]*" fill="#F3F3F3" transform="translate\(0,0\)"/>',
            '',
            svg_content
        )
        
        # Write the modified SVG
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        print(f"Fixed cat SVG saved as {output_file}")
        
    except Exception as e:
        print(f"Error processing SVG: {e}")

# Fix the cat (disguised as Colorado flag)
fix_cat_svg("images/Flag_Of_Colorado.svg", "images/Flag_Of_Colorado_transparent_cat.svg")