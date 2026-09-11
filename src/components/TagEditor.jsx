import { useState } from 'react'

export default function TagEditor({ tags, onChange }) {
  const [input, setInput] = useState('')

  function addTag(raw) {
    const clean = raw.trim().toLowerCase().replace(/^#/, '')
    if (!clean || tags.includes(clean)) return
    onChange([...tags, clean])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="pill-row">
      {tags.map((tag) => (
        <span key={tag} className="tag-chip">
          #{tag}
          <span className="x" onClick={() => removeTag(tag)}>
            ×
          </span>
        </span>
      ))}
      <input
        className="input"
        style={{ border: 'none', background: 'transparent', padding: '4px 6px', width: 140, fontSize: 12.5 }}
        placeholder="add a tag…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input) {
            addTag(input)
            setInput('')
          }
        }}
      />
    </div>
  )
}
