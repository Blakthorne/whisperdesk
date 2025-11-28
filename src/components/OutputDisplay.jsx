import { useState, useEffect, useRef } from 'react'
import './OutputDisplay.css'

const OUTPUT_FORMATS = [
  { value: 'vtt', label: 'VTT Subtitles', ext: '.vtt' },
  { value: 'srt', label: 'SRT Subtitles', ext: '.srt' },
  { value: 'txt', label: 'Plain Text', ext: '.txt' },
]

function OutputDisplay({ text, onSave, onCopy, copySuccess }) {
  const [showSaveMenu, setShowSaveMenu] = useState(false)
  const saveMenuRef = useRef(null)
  const hasText = text && text.length > 0
  const wordCount = hasText ? text.trim().split(/\s+/).length : 0
  const charCount = hasText ? text.length : 0

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setShowSaveMenu(false)
      }
    }
    if (showSaveMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSaveMenu])

  const handleSaveFormat = (format) => {
    setShowSaveMenu(false)
    onSave(format)
  }

  return (
    <div className="output-container">
      <div className="output-header">
        <h3>Transcription</h3>
        <div className="output-meta">
          {hasText && (
            <span className="word-count">
              {wordCount} words · {charCount} chars
            </span>
          )}
        </div>
        {hasText && (
          <div className="output-actions">
            <button 
              className={`btn-icon ${copySuccess ? 'success' : ''}`} 
              onClick={onCopy} 
              title="Copy to clipboard"
              aria-label="Copy transcription to clipboard"
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy'}
            </button>
            <div className="save-dropdown" ref={saveMenuRef}>
              <button 
                className="btn-icon" 
                onClick={() => setShowSaveMenu(!showSaveMenu)}
                title="Save to file"
                aria-label="Save transcription to file"
                aria-expanded={showSaveMenu}
              >
                💾 Save
              </button>
              {showSaveMenu && (
                <div className="save-menu">
                  {OUTPUT_FORMATS.map(format => (
                    <button
                      key={format.value}
                      className="save-menu-item"
                      onClick={() => handleSaveFormat(format.value)}
                    >
                      {format.label} <span className="format-ext">{format.ext}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="output-content" role="region" aria-label="Transcription output">
        {hasText ? (
          <pre className="transcription-text" aria-label="Transcribed text">{text}</pre>
        ) : (
          <div className="output-placeholder" role="status" aria-live="polite">
            <span className="placeholder-icon">📝</span>
            <span>Transcription will appear here</span>
            <span className="placeholder-hint">Select a file and click Transcribe to start</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default OutputDisplay
