#!/usr/bin/env python3
"""Generate crisp open-book tray icons for Uzi Library in PNG and ICO formats."""

from pathlib import Path
import cairo
from PIL import Image

ICONS_DIR = Path(__file__).resolve().parent


def draw_book_surface(size=24, badge_color=None, symbolic=False):
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surf)
    scale = size / 24.0
    ctx.scale(scale, scale)

    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)

    if symbolic:
        ctx.set_source_rgba(0.95, 0.95, 0.95, 0.95)
        # Left page
        ctx.move_to(3.5, 4.5)
        ctx.line_to(9.0, 4.5)
        ctx.curve_to(11.0, 4.5, 12.0, 5.8, 12.0, 7.8)
        ctx.line_to(12.0, 19.5)
        ctx.curve_to(10.8, 18.0, 8.8, 17.2, 3.5, 17.2)
        ctx.close_path()
        ctx.fill_preserve()
        ctx.set_line_width(1.3)
        ctx.set_source_rgba(0.1, 0.1, 0.1, 0.9)
        ctx.stroke()

        # Right page
        ctx.move_to(20.5, 4.5)
        ctx.line_to(15.0, 4.5)
        ctx.curve_to(13.0, 4.5, 12.0, 5.8, 12.0, 7.8)
        ctx.line_to(12.0, 19.5)
        ctx.curve_to(13.2, 18.0, 15.2, 17.2, 20.5, 17.2)
        ctx.close_path()
        ctx.set_source_rgba(0.95, 0.95, 0.95, 0.95)
        ctx.fill_preserve()
        ctx.set_line_width(1.3)
        ctx.set_source_rgba(0.1, 0.1, 0.1, 0.9)
        ctx.stroke()
    else:
        # Amber/Gold palette:
        # Left page
        ctx.move_to(3.5, 4.5)
        ctx.line_to(9.0, 4.5)
        ctx.curve_to(11.0, 4.5, 12.0, 5.8, 12.0, 7.8)
        ctx.line_to(12.0, 19.5)
        ctx.curve_to(10.8, 18.0, 8.8, 17.2, 3.5, 17.2)
        ctx.close_path()

        pat = cairo.LinearGradient(3.5, 4.5, 12.0, 19.5)
        pat.add_color_stop_rgba(0, 0.98, 0.75, 0.14, 0.95)
        pat.add_color_stop_rgba(1, 0.85, 0.47, 0.02, 0.95)
        ctx.set_source(pat)
        ctx.fill_preserve()
        ctx.set_source_rgba(0.1, 0.1, 0.1, 0.85)
        ctx.set_line_width(1.3)
        ctx.stroke()

        # Right page
        ctx.move_to(20.5, 4.5)
        ctx.line_to(15.0, 4.5)
        ctx.curve_to(13.0, 4.5, 12.0, 5.8, 12.0, 7.8)
        ctx.line_to(12.0, 19.5)
        ctx.curve_to(13.2, 18.0, 15.2, 17.2, 20.5, 17.2)
        ctx.close_path()

        pat2 = cairo.LinearGradient(12.0, 4.5, 20.5, 19.5)
        pat2.add_color_stop_rgba(0, 0.98, 0.75, 0.14, 0.95)
        pat2.add_color_stop_rgba(1, 0.85, 0.47, 0.02, 0.95)
        ctx.set_source(pat2)
        ctx.fill_preserve()
        ctx.set_source_rgba(0.1, 0.1, 0.1, 0.85)
        ctx.set_line_width(1.3)
        ctx.stroke()

        # Internal page lines
        ctx.set_source_rgba(0.2, 0.1, 0.0, 0.5)
        ctx.set_line_width(1.0)
        ctx.move_to(6.0, 8.5)
        ctx.line_to(9.5, 8.5)
        ctx.stroke()
        ctx.move_to(6.0, 11.5)
        ctx.line_to(9.5, 11.5)
        ctx.stroke()
        ctx.move_to(14.5, 8.5)
        ctx.line_to(18.0, 8.5)
        ctx.stroke()
        ctx.move_to(14.5, 11.5)
        ctx.line_to(18.0, 11.5)
        ctx.stroke()

    # Optional status badge
    if badge_color:
        ctx.arc(19.0, 19.0, 3.4, 0, 6.28)
        ctx.set_source_rgba(0.1, 0.1, 0.1, 0.95)
        ctx.fill()
        ctx.arc(19.0, 19.0, 2.5, 0, 6.28)
        ctx.set_source_rgba(*badge_color)
        ctx.fill()

    return surf


def main():
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Standard 24x24 tray icon
    draw_book_surface(24).write_to_png(str(ICONS_DIR / "uzi-library.png"))

    # 2. Hi-DPI 48x48 icon
    draw_book_surface(48).write_to_png(str(ICONS_DIR / "uzi-library-48.png"))

    # 3. Active status icon (with green online indicator)
    draw_book_surface(24, badge_color=(0.2, 0.85, 0.3, 1.0)).write_to_png(str(ICONS_DIR / "uzi-library-active.png"))

    # 4. Monochrome symbolic icon
    draw_book_surface(24, symbolic=True).write_to_png(str(ICONS_DIR / "uzi-library-symbolic.png"))

    # 5. Windows multi-size ICO
    img48 = Image.open(str(ICONS_DIR / "uzi-library-48.png"))
    img48.save(str(ICONS_DIR / "uzi-library.ico"), format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48)])

    print(f"Successfully generated all Uzi Library icons in {ICONS_DIR}")


if __name__ == "__main__":
    main()
