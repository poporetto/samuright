#!/usr/bin/env python3
"""Turn a 4x5 light-background Ren sheet into normalized transparent game frames."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


COLS = 4
ROWS = 5
FRAME_COUNT = COLS * ROWS
FRAME_SIZE = 256
GUTTER = 16


def is_background(pixel: tuple[int, int, int]) -> bool:
    red, green, blue = pixel
    return min(pixel) >= 232 and max(pixel) - min(pixel) <= 18


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    source = rgb.load()
    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        offset = y * width + x
        if not background[offset] and is_background(source[x, y]):
            background[offset] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    rgba = image.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha.putdata([0 if value else 255 for value in background])
    rgba.putalpha(alpha)
    return rgba


def connected_components(alpha: Image.Image) -> list[list[tuple[int, int]]]:
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or not pixels[x, y]:
                continue
            visited[offset] = 1
            queue = deque([(x, y)])
            points: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        neighbor = ny * width + nx
                        if not visited[neighbor] and pixels[nx, ny]:
                            visited[neighbor] = 1
                            queue.append((nx, ny))
            if len(points) >= 4:
                components.append(points)
    return components


def point_bounds(points: list[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def extract_frames(image: Image.Image) -> list[Image.Image]:
    transparent = remove_connected_background(image)
    components = connected_components(transparent.getchannel("A"))
    if len(components) < FRAME_COUNT:
        raise ValueError(f"Expected at least {FRAME_COUNT} sprite components, found {len(components)}")

    # The 20 largest connected regions are Ren's body plus his attached weapon.
    anchors = sorted(components, key=len, reverse=True)[:FRAME_COUNT]
    ordered: list[list[tuple[int, int]]] = []
    by_y = sorted(anchors, key=lambda points: sum(y for _, y in points) / len(points))
    for row in range(ROWS):
        row_items = by_y[row * COLS:(row + 1) * COLS]
        ordered.extend(sorted(row_items, key=lambda points: sum(x for x, _ in points) / len(points)))

    groups = [list(points) for points in ordered]
    anchor_centers = [
        (sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points))
        for points in ordered
    ]
    anchor_ids = {id(points) for points in anchors}
    for points in components:
        if id(points) in anchor_ids or len(points) < 8:
            continue
        center_x = sum(x for x, _ in points) / len(points)
        center_y = sum(y for _, y in points) / len(points)
        target = min(
            range(FRAME_COUNT),
            key=lambda index: (center_x - anchor_centers[index][0]) ** 2 + (center_y - anchor_centers[index][1]) ** 2,
        )
        groups[target].extend(points)

    source = transparent.load()
    frames: list[Image.Image] = []
    for points in groups:
        left, top, right, bottom = point_bounds(points)
        frame = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
        output = frame.load()
        for x, y in points:
            output[x - left, y - top] = source[x, y]
        frames.append(frame)
    return frames


def content_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("A frame contains no visible sprite content")
    return bbox


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--strip", required=True)
    parser.add_argument("--preview", required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    frames = extract_frames(source)
    crops = [frame.crop(content_bbox(frame)) for frame in frames]
    max_width = max(frame.width for frame in crops)
    max_height = max(frame.height for frame in crops)
    usable = FRAME_SIZE - GUTTER * 2
    scale = min(usable / max_width, usable / max_height)

    output_dir = Path(args.out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    normalized: list[Image.Image] = []
    for index, crop in enumerate(crops, start=1):
        size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
        resized = crop.resize(size, Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        x = (FRAME_SIZE - resized.width) // 2
        y = FRAME_SIZE - GUTTER - resized.height
        frame.alpha_composite(resized, (x, y))
        frame.save(output_dir / f"{index:02d}.png")
        normalized.append(frame)

    strip = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(normalized):
        strip.alpha_composite(frame, (index * FRAME_SIZE, 0))
    Path(args.strip).parent.mkdir(parents=True, exist_ok=True)
    strip.save(args.strip)

    preview = Image.new("RGBA", (FRAME_SIZE * COLS, FRAME_SIZE * ROWS), (238, 235, 227, 255))
    for index, frame in enumerate(normalized):
        preview.alpha_composite(frame, ((index % COLS) * FRAME_SIZE, (index // COLS) * FRAME_SIZE))
    Path(args.preview).parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.preview)


if __name__ == "__main__":
    main()
