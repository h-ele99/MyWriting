// Tiptap always serializes to at least one block tag, even for a single
// line of plain text, so anything that doesn't start with one is a
// pre-rich-text chapter saved as plain text with literal newlines.
const BLOCK_TAG_RE = /^\s*<(p|h1|h2|h3|h4|ul|ol)\b/i

export function isLegacyPlainText(body) {
  if (!body) return false
  return !BLOCK_TAG_RE.test(body)
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function legacyBodyToHtml(body) {
  return body
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}

// Call this wherever a chapter/version body is about to be displayed,
// edited, or exported, so old plain-text chapters keep working.
export function normalizeBodyToHtml(body) {
  if (!body) return ''
  return isLegacyPlainText(body) ? legacyBodyToHtml(body) : body
}

export function bodyToPlainText(body) {
  if (!body) return ''
  const container = document.createElement('div')
  container.innerHTML = normalizeBodyToHtml(body)
  container.querySelectorAll('p, li, h1, h2, h3, h4, br').forEach((el) => el.insertAdjacentText('afterend', ' '))
  return container.textContent.replace(/\s+/g, ' ').trim()
}

// An "empty" Tiptap doc serializes to "<p></p>" (or with a stray <br>),
// which is truthy as a string — treat that the same as "".
export function isEmptyBody(html) {
  return !html || /^(<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)*$/i.test(html)
}
