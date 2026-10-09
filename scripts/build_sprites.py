"""Rebuild Lady Luma's atlas and clean the new-run intro sheet.

Run from the repo root:  python3 scripts/build_sprites.py
Reads sprite-sources/ and writes src/assets/luma-atlas.webp and intro-dice.webp.
Needs Pillow, numpy and scipy.

Fixes in the source art:
- lady-luma-sprite-sheet.webp: the dice-kick pose's dice and star straddle the
  uniform cell boundary, so the previous frame showed a sliver of them and the
  next frame was clipped. Pixels are re-assigned to frames by connected part.
- ladyluma_sad_keyed.webp: lime chroma-key halo around the edges, irregular
  frame widths, and a 1.55x larger drawing scale than the main sheet.
- wuerfelanimation.webp: faint grid divider lines bleed into frame crops.

Output luma-atlas.webp is a uniform grid (CELL_W x CELL_H, COLUMNS wide) with
every pose standing on the same baseline, so the game can switch freely
between idle, happy, dice and sad poses without the character jumping.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sprite-sources"
ASSETS = ROOT / "src" / "assets"
CELL_W, CELL_H, COLUMNS = 400, 420, 6
BASELINE = 367            # feet line inside a cell, matching the main sheet
ROWS = ["idle", "happy", "dice", "sad"]
SAD_CROPS = [(0, 362), (362, 362), (724, 362), (1086, 362), (1448, 318), (1766, 406)]
INTRO_COLUMNS = [(0, 253), (258, 250), (513, 250), (768, 256)]
INTRO_ROWS = [(0, 231), (236, 237), (478, 228), (711, 233)]


def load(name):
    return np.array(Image.open(SOURCES / name).convert("RGBA"))


def despill(rgba):
    """Neutralise lime chroma-key spill (the sad sheet has no green artwork)."""
    out = rgba.astype(np.int32)
    r, g, b, a = out[..., 0], out[..., 1], out[..., 2], out[..., 3]
    cap = np.maximum(r, b)
    spill = g > cap
    out[..., 1] = np.where(spill, cap, g)
    # Faint pixels that were mostly green are matte residue: drop them.
    halo = (g - cap > 40) & (a < 140)
    out[..., 3] = np.where(halo, 0, a)
    return out.clip(0, 255).astype(np.uint8)


def assign_by_part(rgba, owner_of_point):
    """Split an image into owners by connected part instead of fixed rectangles."""
    alpha = rgba[..., 3]
    labels, count = ndimage.label(alpha > 20)
    ids = range(1, count + 1)
    centers = ndimage.center_of_mass(np.ones_like(alpha), labels, ids)
    sizes = ndimage.sum(np.ones_like(alpha), labels, ids)
    owner_by_label = np.array([-1] + [owner_of_point(cx, cy) for cy, cx in centers])
    # Sparkles and specks follow the nearest large part (a star flying with the
    # dice belongs to the dice's frame even if it sits past the cell boundary).
    large = labels * np.isin(labels, [i for i, size in zip(ids, sizes) if size >= 1000])
    _, (ly, lx) = ndimage.distance_transform_edt(large == 0, return_indices=True)
    for label, size in zip(ids, sizes):
        if size < 1000:
            ys, xs = np.where(labels == label)
            owner_by_label[label] = owner_by_label[large[ly[ys[0], xs[0]], lx[ys[0], xs[0]]]]
    # Soft edge pixels below the threshold join their nearest labelled part.
    _, (iy, ix) = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    owner = owner_by_label[labels[iy, ix]]
    owner[alpha == 0] = -1
    return owner


def feet_center_x(alpha):
    """Horizontal centre of the lowest band of the body, used as the anchor."""
    ys, xs = np.where(alpha > 40)
    bottom = ys.max()
    band = ys > bottom - 70
    return xs[band].mean(), bottom


def place(atlas, frame, row, col, dx, dy):
    h, w = frame.shape[:2]
    x0, y0 = col * CELL_W + dx, row * CELL_H + dy
    cx0, cy0 = max(x0, col * CELL_W), max(y0, row * CELL_H)
    cx1, cy1 = min(x0 + w, (col + 1) * CELL_W), min(y0 + h, (row + 1) * CELL_H)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    src = Image.fromarray(frame[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0])
    atlas.alpha_composite(src, (cx0, cy0))


def build_luma_atlas():
    atlas = Image.new("RGBA", (CELL_W * COLUMNS, CELL_H * len(ROWS)), (0, 0, 0, 0))
    main = load("lady-luma-sprite-sheet.webp")
    fw, fh = main.shape[1] / 4, main.shape[0] / 3
    owner = assign_by_part(main, lambda x, y: int(y // fh) * 4 + int(x // fw))
    anchor_x = None
    for index in range(12):
        row, col = divmod(index, 4)
        frame = np.where((owner == index)[..., None], main, 0).astype(np.uint8)
        x0, y0 = int(round(col * fw)), int(round(row * fh))
        ys, xs = np.where(frame[..., 3] > 0)
        sub = frame[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        # Keep the authored position inside the original cell (hops, leans).
        dx = xs.min() - x0 + (CELL_W - int(fw)) // 2
        dy = ys.min() - y0
        place(atlas, sub, row, col, dx, dy)
        if index == 0:
            fx, _ = feet_center_x(sub[..., 3])
            anchor_x = dx + fx
    sad = despill(load("ladyluma_sad_keyed.webp"))
    reference_height = 301    # idle frame 0, ears to feet, in the main sheet
    body = sad[:, SAD_CROPS[0][0]:SAD_CROPS[0][0] + SAD_CROPS[0][1], 3]
    ys, _ = np.where(body > 40)
    scale = reference_height / (ys.max() - ys.min() + 1)
    for col, (x, w) in enumerate(SAD_CROPS):
        crop = sad[:, x:x + w]
        ys, xs = np.where(crop[..., 3] > 0)
        crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        size = (max(1, round(crop.shape[1] * scale)), max(1, round(crop.shape[0] * scale)))
        crop = np.array(Image.fromarray(crop).resize(size, Image.LANCZOS))
        fx, bottom = feet_center_x(crop[..., 3])
        place(atlas, crop, 3, col, int(round(anchor_x - fx)), BASELINE - bottom)
    atlas.save(ASSETS / "luma-atlas.webp", quality=90, alpha_quality=100, method=6)
    print("luma-atlas.webp", atlas.size, f"sad scale {scale:.3f}")


def clean_intro_sheet():
    sheet = load("wuerfelanimation.webp")
    alpha = sheet[..., 3].copy()
    keep = np.zeros_like(alpha, dtype=bool)
    border = 3
    for y, h in INTRO_ROWS:
        for x, w in INTRO_COLUMNS:
            keep[y + border:y + h - border, x + border:x + w - border] = True
    sheet[..., 3] = np.where(keep, alpha, 0)
    Image.fromarray(sheet).save(ASSETS / "intro-dice.webp", quality=90, alpha_quality=100, method=6)
    print("intro-dice.webp cleaned")


if __name__ == "__main__":
    build_luma_atlas()
    clean_intro_sheet()
