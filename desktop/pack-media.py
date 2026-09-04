#!/usr/bin/env python3
"""Rasterize installer media and a crisp multi-size Windows icon."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "imagine_images"
MEDIA = ROOT / "public" / "setup" / "media"
WINRES = ROOT / "desktop" / "win" / "winres"

HERO = ART / "573ab486-22c7-4ba4-866d-5d9b03f2c562.jpg"
RAIL = ART / "c1a84fe9-431c-4c8e-91ae-ff5471f39eb0.jpg"
HEADER = ART / "d020dd1c-ab42-4b5b-acc4-f4ddc2b1ce08.jpg"
DONE = ART / "6e52e55c-b469-445b-bee8-6a83773f5f87.jpg"
MARK = ART / "f5137222-7e5e-4531-863e-3cef12c44c30.jpg"

TEAL = (126, 232, 211, 255)
COPPER = (176, 137, 104, 255)
BG = (7, 9, 11, 255)


def save_jpeg(src: Path, dest: Path, size: tuple[int, int], quality: int = 88) -> None:
    im = Image.open(src).convert("RGB")
    im = im.resize(size, Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def hexagon(cx: float, cy: float, r: float) -> list[tuple[float, float]]:
    from math import cos, pi, sin

    pts = []
    for i in range(6):
        a = pi / 6 + i * pi / 3
        pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    r = size * 0.36
    w = max(2, round(size * 0.028))
    d.polygon(hexagon(cx, cy, r), outline=TEAL, width=w)
    d.polygon(hexagon(cx, cy, r * 0.78), outline=COPPER, width=max(1, w - 1))
    flame = [
        (cx, cy - r * 0.42),
        (cx + r * 0.22, cy + r * 0.12),
        (cx + r * 0.06, cy + r * 0.04),
        (cx + r * 0.18, cy + r * 0.38),
        (cx, cy + r * 0.18),
        (cx - r * 0.18, cy + r * 0.38),
        (cx - r * 0.06, cy + r * 0.04),
        (cx - r * 0.22, cy + r * 0.12),
    ]
    d.polygon(flame, fill=TEAL)
    if size >= 64:
        img = img.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=2))
    return img


def write_ico(path: Path) -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [draw_mark(s) for s in sizes]
    frames[0].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=frames[1:])


def main() -> None:
    MEDIA.mkdir(parents=True, exist_ok=True)
    WINRES.mkdir(parents=True, exist_ok=True)

    save_jpeg(HERO, MEDIA / "hero.jpg", (1600, 900), 86)
    save_jpeg(RAIL, MEDIA / "rail.jpg", (720, 1280), 86)
    save_jpeg(HEADER, MEDIA / "header.jpg", (1600, 420), 86)
    save_jpeg(DONE, MEDIA / "done.jpg", (1600, 900), 86)
    save_jpeg(MARK, MEDIA / "mark.jpg", (1024, 1024), 90)

    icon256 = draw_mark(256)
    icon256.save(MEDIA / "icon-256.png")
    icon256.save(WINRES / "icon.png")
    draw_mark(512).save(MEDIA / "icon-512.png")
    draw_mark(192).save(MEDIA / "icon-192.png")
    draw_mark(64).save(MEDIA / "icon-64.png")
    icon256.save(MEDIA / "icon.png")

    write_ico(MEDIA / "app.ico")
    write_ico(ROOT / "desktop" / "win" / "app.ico")

    # NSIS leftover bitmaps (optional, keep in sync)
    header = Image.open(HEADER).convert("RGB").resize((150, 57), Image.Resampling.LANCZOS)
    header.save(MEDIA / "header.bmp")
    side = Image.open(RAIL).convert("RGB").resize((164, 314), Image.Resampling.LANCZOS)
    side.save(MEDIA / "sidebar.bmp")
    print("media packed ->", MEDIA)


if __name__ == "__main__":
    main()
