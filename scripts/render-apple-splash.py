#!/usr/bin/env python3
"""Apple startup images: forest-green field, R mark, RestoPro wordmark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "splash"
ICON = ROOT / "public" / "apple-touch-icon.png"

BG = (0x17, 0x35, 0x2B)
FG = (0xF5, 0xF2, 0xEA)
MUTED = (0xB7, 0xC4, 0xBB)
TITLE = "RestoPro"
SUB = "Arach.tech"

SIZES = {
    "iphone-15-pro-max.png": (1290, 2796),
    "iphone-15-pro.png": (1179, 2556),
    "iphone-14.png": (1170, 2532),
    "iphone-14-plus.png": (1284, 2778),
    "iphone-11.png": (828, 1792),
    "iphone-11-pro-max.png": (1242, 2688),
    "iphone-x.png": (1125, 2436),
    "iphone-se.png": (750, 1334),
    "ipad-pro-12.png": (2048, 2732),
    "ipad-pro-11.png": (1668, 2388),
    "ipad.png": (1536, 2048),
}

FONT_BOLD = Path("/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf")
FONT_REG = Path("/usr/share/fonts/truetype/macos/Inter-Medium.ttf")
if not FONT_BOLD.exists():
    FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    FONT_REG = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")


def rounded_icon(src: Image.Image, size: int, radius: int) -> Image.Image:
    icon = src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(icon, (0, 0))
    out.putalpha(mask)
    return out


def render(width: int, height: int, mark: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(canvas)
    side = max(112, int(min(width, height) * 0.118))
    icon = rounded_icon(mark, side, max(18, side // 5))
    title_size = max(28, int(min(width, height) * 0.038))
    sub_size = max(14, int(title_size * 0.42))
    title_font = ImageFont.truetype(str(FONT_BOLD), title_size)
    sub_font = ImageFont.truetype(str(FONT_REG), sub_size)

    gap = int(side * 0.28)
    title_box = draw.textbbox((0, 0), TITLE, font=title_font)
    sub_box = draw.textbbox((0, 0), SUB, font=sub_font)
    title_h = title_box[3] - title_box[1]
    sub_h = sub_box[3] - sub_box[1]
    stack = side + gap + title_h + int(title_size * 0.35) + sub_h
    top = (height - stack) // 2

    canvas.paste(icon, ((width - side) // 2, top), icon)
    title_y = top + side + gap
    draw.text((width / 2, title_y), TITLE, font=title_font, fill=FG, anchor="ma")
    draw.text(
        (width / 2, title_y + title_h + int(title_size * 0.35)),
        SUB,
        font=sub_font,
        fill=MUTED,
        anchor="ma",
    )
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    mark = Image.open(ICON)
    for name, size in SIZES.items():
        render(*size, mark).save(OUT / name, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
