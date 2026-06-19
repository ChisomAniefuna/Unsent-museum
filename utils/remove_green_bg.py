#!/usr/bin/env python3
"""Remove green-screen background from an image, output transparent PNG."""
import sys
from PIL import Image

def remove_green(input_path, output_path=None, tolerance=100):
    if output_path is None:
        output_path = input_path.rsplit(".", 1)[0] + "_nobg.png"

    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if g > 80 and g > r + 30 and g > b + 30:
                greenness = g - max(r, b)
                if greenness > 40:
                    pixels[x, y] = (r, g, b, 0)
                elif greenness > 20:
                    alpha = int(255 * (1.0 - (greenness - 20) / 20.0))
                    pixels[x, y] = (r, g, b, max(0, min(255, alpha)))

    img.save(output_path, "PNG")
    print(f"Saved: {output_path} ({w}x{h})")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 remove_green_bg.py <input_image> [output.png]")
        sys.exit(1)
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    remove_green(inp, out)
