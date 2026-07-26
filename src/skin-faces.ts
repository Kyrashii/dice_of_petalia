// @ts-nocheck

export function createSkinFaceLoader(packs, { onReady, onError }) {
  const faces = {};

  async function prepareFaces(pack) {
    if (faces[pack.id]) return;
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    image.src = pack.sheet;
    await loaded;
    const frameWidth = Math.floor(image.naturalWidth / 6), frameHeight = image.naturalHeight;
    faces[pack.id] = Array.from({ length: 6 }, (_, index) => extractFace(image, index, frameWidth, frameHeight));
  }

  function extractFace(image, index, frameWidth, frameHeight) {
    const frame = document.createElement("canvas");
    frame.width = frameWidth; frame.height = frameHeight;
    const context = frame.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, index * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    const pixels = context.getImageData(0, 0, frameWidth, frameHeight), data = pixels.data;
    stripLimeMatte(data);
    context.putImageData(pixels, 0, 0);
    const bounds = connectedBodyBounds(data, frameWidth, frameHeight);
    const face = document.createElement("canvas");
    face.width = face.height = 360;
    const padding = 7, faceContext = face.getContext("2d");
    faceContext.drawImage(frame, bounds.left, bounds.top, bounds.width, bounds.height, padding, padding, 360 - padding * 2, 360 - padding * 2);
    return face.toDataURL("image/png");
  }

  function stripLimeMatte(data) {
    for (let pixel = 0; pixel < data.length; pixel += 4) {
      const red = data[pixel], green = data[pixel + 1], blue = data[pixel + 2], alpha = data[pixel + 3];
      if (!alpha) continue;
      const greenLead = green - Math.max(red, blue);
      if (red < 92 && blue < 92 && green > 125 && greenLead > 68) {
        const key = Math.min(1, (greenLead - 68) / 94);
        data[pixel + 3] = Math.round(alpha * (1 - key));
        data[pixel + 1] = Math.min(green, Math.max(red, blue) + 14);
      }
    }
  }

  function connectedBodyBounds(data, width, height) {
    const alphaAt = index => data[index * 4 + 3] >= 32;
    let seedX = Math.floor(width / 2), seedY = Math.floor(height / 2);
    if (!alphaAt(seedY * width + seedX)) {
      let found = false;
      for (let radius = 1; radius < Math.max(width, height) && !found; radius++) for (let y = Math.max(0, seedY - radius); y <= Math.min(height - 1, seedY + radius) && !found; y++) for (let x = Math.max(0, seedX - radius); x <= Math.min(width - 1, seedX + radius); x++) if (alphaAt(y * width + x)) { seedX = x; seedY = y; found = true; break; }
    }
    let left = width, top = height, right = -1, bottom = -1;
    if (alphaAt(seedY * width + seedX)) {
      const visited = new Uint8Array(width * height), stack = [seedY * width + seedX];
      visited[stack[0]] = 1;
      const enqueue = next => { if (!visited[next] && alphaAt(next)) { visited[next] = 1; stack.push(next); } };
      while (stack.length) {
        const point = stack.pop(), x = point % width, y = Math.floor(point / width);
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        if (x > 0) enqueue(point - 1); if (x < width - 1) enqueue(point + 1); if (y > 0) enqueue(point - width); if (y < height - 1) enqueue(point + width);
      }
    }
    if (right < left || bottom < top) return { left: 0, top: 0, width, height };
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  }

  return {
    face: (packId, value) => faces[packId]?.[value - 1],
    prepare: () => Promise.all(packs.map(prepareFaces)).then(onReady).catch(onError)
  };
}
