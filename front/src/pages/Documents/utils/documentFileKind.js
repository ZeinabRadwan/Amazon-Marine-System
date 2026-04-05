/**
 * Shared MIME / filename classification for icons and preview routing.
 *
 * @typedef {'pdf' | 'image' | 'video' | 'audio' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'document' | 'folder' | 'other'} DocumentKind
 */

const CODE_EXT = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'xml',
  'json',
  'yaml',
  'yml',
  'md',
  'sh',
  'env',
  'php',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'sql',
])

const CODE_MIME_PREFIXES = ['text/', 'application/javascript', 'application/x-javascript']
const CODE_MIMES = new Set([
  'application/json',
  'application/xml',
  'text/xml',
  'application/sql',
  'application/x-yaml',
  'application/x-httpd-php',
])

const SPREADSHEET_EXT = new Set(['xls', 'xlsx', 'xlsm', 'csv', 'ods'])
const SPREADSHEET_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.oasis.opendocument.spreadsheet',
])

const PRESENTATION_EXT = new Set(['ppt', 'pptx', 'odp'])
const PRESENTATION_MIMES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
])

const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'])
const ARCHIVE_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
])

const DOC_EXT = new Set(['doc', 'docx', 'odt', 'rtf'])
const DOC_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
])

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif', 'heic', 'heif'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v', 'avi', 'mkv'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm'])

function extension(name) {
  if (!name || typeof name !== 'string') return ''
  const base = name.split('/').pop() || name
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
}

/**
 * @param {string} [mimeType]
 * @param {string} [fileName]
 * @returns {DocumentKind}
 */
export function getDocumentKind(mimeType, fileName) {
  const raw = (mimeType || '').split(';')[0].trim().toLowerCase()
  const ext = extension(fileName)

  if (raw.includes('directory')) return 'folder'

  if (raw === 'application/pdf' || raw === 'application/x-pdf' || ext === 'pdf') return 'pdf'

  if (raw.startsWith('image/') || IMAGE_EXT.has(ext)) return 'image'

  if (raw.startsWith('video/') || VIDEO_EXT.has(ext)) return 'video'

  if (raw.startsWith('audio/') || AUDIO_EXT.has(ext)) return 'audio'

  if (SPREADSHEET_MIMES.has(raw) || SPREADSHEET_EXT.has(ext)) return 'spreadsheet'

  if (PRESENTATION_MIMES.has(raw) || PRESENTATION_EXT.has(ext)) return 'presentation'

  if (ARCHIVE_MIMES.has(raw) || ARCHIVE_EXT.has(ext)) return 'archive'

  if (DOC_MIMES.has(raw) || DOC_EXT.has(ext)) return 'document'

  if (CODE_MIMES.has(raw) || CODE_EXT.has(ext)) return 'code'

  if (raw.startsWith('text/') || CODE_MIME_PREFIXES.some((p) => raw.startsWith(p))) return 'code'

  return 'other'
}

/**
 * How to render preview for this type (after we have a blob + effective MIME).
 * @param {string} effectiveMime
 * @param {string} [fileName]
 * @returns {'pdf' | 'image' | 'video' | 'audio' | 'text' | 'none'}
 */
export function getPreviewRenderMode(effectiveMime, fileName) {
  const m = (effectiveMime || '').split(';')[0].trim().toLowerCase()
  const ext = extension(fileName)

  if (m === 'application/pdf' || m === 'application/x-pdf' || ext === 'pdf') return 'pdf'

  if (m.startsWith('image/') || (ext === 'svg' && (m === 'application/octet-stream' || !m))) return 'image'

  if (m.startsWith('video/') || VIDEO_EXT.has(ext)) return 'video'

  if (m.startsWith('audio/') || AUDIO_EXT.has(ext)) return 'audio'

  const textMimes = new Set([
    'text/plain',
    'text/html',
    'text/css',
    'text/csv',
    'text/markdown',
    'text/x-markdown',
    'application/json',
    'application/xml',
    'text/xml',
    'application/javascript',
    'application/x-javascript',
    'text/javascript',
    'application/x-httpd-php',
    'text/php',
    'text/x-php',
  ])

  if (textMimes.has(m) || m.startsWith('text/')) return 'text'

  if (ext === 'json' || ext === 'xml' || ext === 'csv' || ext === 'md' || ext === 'txt' || ext === 'log') {
    return 'text'
  }

  return 'none'
}

export const PREVIEW_TEXT_MAX_BYTES = 1_500_000
