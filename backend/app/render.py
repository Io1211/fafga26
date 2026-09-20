"""Overlay-Rendering. Deterministisch, ohne KI.

Regeln aus der Praxis:
- Fotos werden nie beschnitten. Der Rand kommt als Unschaerfe aus dem Bild selbst.
- Overlays sitzen im mittleren 4:5-Feld, weil Instagram das Profilraster darauf beschneidet.
- Grundlinie der Headline bei 0,72 des Feldes, nicht am unteren Rand.
- Kontur in zwei Durchgaengen, sonst sieht fette Schrift hohl aus.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .config import RENDERS

FORMATS = {
    "story": (1080, 1920),
    "post": (1080, 1350),
    "square": (1080, 1080),
}

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/lato/Lato-Black.ttf",
    "/usr/share/fonts/truetype/lato/Lato-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]
_FONT_CANDIDATES_REG = [
    "/usr/share/fonts/truetype/lato/Lato-Semibold.ttf",
    "/usr/share/fonts/truetype/lato/Lato-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "C:/Windows/Fonts/arial.ttf",
]


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    for p in (_FONT_CANDIDATES if bold else _FONT_CANDIDATES_REG):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _hex(h: str) -> tuple:
    h = (h or "#0E7C66").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _cover(img: Image.Image, w: int, h: int, fx: float = .5, fy: float = .5) -> Image.Image:
    k = max(w / img.width, h / img.height)
    nw, nh = int(img.width * k + 1), int(img.height * k + 1)
    im = img.resize((nw, nh), Image.LANCZOS)
    left = max(0, min(nw - w, int(nw * fx - w / 2)))
    top = max(0, min(nh - h, int(nh * fy - h / 2)))
    return im.crop((left, top, left + w, top + h))


def _contain(img: Image.Image, w: int, h: int) -> Image.Image:
    k = min(w / img.width, h / img.height)
    return img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), Image.LANCZOS)


def _scrim(w: int, h: int, top: int, bottom: int, strength: int = 200) -> Image.Image:
    """Verlauf von transparent nach dunkel, verankert am 4:5-Feld."""
    layer = Image.new("L", (1, h), 0)
    px = layer.load()
    span = max(1, bottom - top)
    for y in range(h):
        if y <= top:
            v = 0
        else:
            t = min(1.0, (y - top) / span)
            v = int(strength * (t ** 1.7))
        px[0, y] = v
    mask = layer.resize((w, h))
    dark = Image.new("RGBA", (w, h), (8, 20, 28, 255))
    dark.putalpha(mask)
    return dark


def _wrap(draw, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for wd in words:
        probe = (cur + " " + wd).strip()
        if draw.textlength(probe, font=font) <= max_w or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def render(photo_path: Path, copy, house, fmt: str, post_id: str) -> str:
    W, H = FORMATS[fmt]
    img = Image.open(photo_path).convert("RGB")

    # Hintergrund: dasselbe Bild, formatfuellend und unscharf
    bg = _cover(img, W, H, copy.focal_x, copy.focal_y).filter(ImageFilter.GaussianBlur(42))
    bg = Image.blend(bg, Image.new("RGB", (W, H), (12, 26, 34)), 0.14)
    canvas = bg.convert("RGBA")

    # Das mittlere 4:5-Feld - hier sitzt alles Sichtbare
    field_h = min(H, int(W * 5 / 4))
    field_top = (H - field_h) // 2

    # Vordergrund: vollstaendiges Foto, nichts abgeschnitten
    fg = _contain(img, W, field_h)
    fx, fy = (W - fg.width) // 2, field_top + (field_h - fg.height) // 2
    schatten = Image.new("RGBA", (fg.width + 60, fg.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(schatten).rectangle([30, 30, 30 + fg.width, 30 + fg.height], fill=(0, 0, 0, 120))
    canvas.alpha_composite(schatten.filter(ImageFilter.GaussianBlur(18)), (fx - 30, fy - 30))
    canvas.paste(fg, (fx, fy))

    field_bottom = field_top + field_h
    canvas.alpha_composite(_scrim(W, H, field_top + int(field_h * .38), field_bottom, 205))

    draw = ImageDraw.Draw(canvas)
    accent = _hex(house.farbe)
    margin = int(W * .08)
    max_w = W - 2 * margin

    lines = [str(l).upper().strip() for l in copy.head if str(l).strip()][:5]
    size = int(W * .098)
    f_head = _font(size, True)
    while lines and max(draw.textlength(l, font=f_head) for l in lines) > max_w and size > 30:
        size = int(size * .92)
        f_head = _font(size, True)
    lh = int(size * 1.12)

    baseline = field_top + int(field_h * .72)
    y = baseline - lh * (len(lines) - 1)
    key = str(copy.key or "").upper().strip()
    for line in lines:
        col = accent if line == key else (255, 255, 255)
        draw.text((margin, y), line, font=f_head, fill=col,
                  stroke_width=max(2, int(size * .035)), stroke_fill=(8, 18, 24, 190))
        draw.text((margin, y), line, font=f_head, fill=col)
        y += lh

    f_kick = _font(int(W * .032), False)
    draw.text((margin, baseline - lh * len(lines) - int(W * .032)),
              str(copy.kicker or house.name).upper(), font=f_kick,
              fill=(255, 255, 255, 235), stroke_width=2, stroke_fill=(8, 18, 24, 160))

    bar_y = field_bottom - int(W * .05)
    draw.rectangle([margin, bar_y, margin + int(W * .16), bar_y + max(4, int(W * .009))], fill=accent)

    if house.logo:
        lp = Path(house.logo)
        if lp.exists():
            logo = Image.open(lp).convert("RGBA")
            lw = int(W * .20)
            logo = logo.resize((lw, max(1, int(logo.height * lw / logo.width))), Image.LANCZOS)
            canvas.alpha_composite(logo, (margin, field_top + int(field_h * .06)))

    out = RENDERS / f"{post_id}-{fmt}.jpg"
    canvas.convert("RGB").save(out, "JPEG", quality=90)
    return f"/static/renders/{out.name}"
