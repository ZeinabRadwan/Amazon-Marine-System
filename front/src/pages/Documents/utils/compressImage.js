/**
 * Resize and re-encode raster images before upload (client-side).
 * Skips SVG, GIF (keeps animation), non-images, and tiny files.
 */

const DEFAULT_MAX_EDGE = 1920
const DEFAULT_JPEG_QUALITY = 0.82
const MIN_BYTES_TO_COMPRESS = 80 * 1024

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

function canvasHasTransparency(ctx, w, h) {
  if (w <= 0 || h <= 0) return false
  const data = ctx.getImageData(0, 0, w, h).data
  const step = Math.max(1, Math.floor(data.length / 4 / 5000))
  for (let i = 3; i < data.length; i += 4 * step) {
    if (data[i] < 255) return true
  }
  return false
}

/**
 * @param {File} file
 * @param {{ maxEdge?: number, jpegQuality?: number }} [options]
 * @returns {Promise<File>}
 */
export async function compressImageIfNeeded(file, options = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file
  }

  if (file.type === 'image/svg+xml') {
    return file
  }

  if (file.type === 'image/gif') {
    return file
  }

  if (file.size < MIN_BYTES_TO_COMPRESS) {
    const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE
    try {
      const img = await loadImage(file)
      if (Math.max(img.naturalWidth, img.naturalHeight) <= maxEdge) {
        return file
      }
    } catch {
      return file
    }
  }

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY

  let img
  try {
    img = await loadImage(file)
  } catch {
    return file
  }

  const nw = img.naturalWidth || img.width
  const nh = img.naturalHeight || img.height
  if (!nw || !nh) return file

  const scale = Math.min(1, maxEdge / Math.max(nw, nh))
  const w = Math.max(1, Math.round(nw * scale))
  const h = Math.max(1, Math.round(nh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.drawImage(img, 0, 0, w, h)

  const usePng =
    file.type === 'image/png' && canvasHasTransparency(ctx, w, h)

  const mimeOut = usePng ? 'image/png' : 'image/jpeg'
  const quality = mimeOut === 'image/jpeg' ? jpegQuality : undefined

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeOut, quality)
  })

  if (!blob || blob.size >= file.size) {
    return file
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  const newName = mimeOut === 'image/jpeg' ? `${base}.jpg` : `${base}.png`

  return new File([blob], newName, {
    type: mimeOut,
    lastModified: Date.now(),
  })
}
