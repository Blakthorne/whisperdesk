import { useState, useEffect } from 'react'
import './UpdateNotification.css'

function UpdateNotification() {
  const [updateState, setUpdateState] = useState('idle') // idle, checking, available, downloading, ready, error
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubscribers = []

    unsubscribers.push(
      window.electronAPI?.onUpdateChecking?.(() => {
        setUpdateState('checking')
        setError(null)
      })
    )

    unsubscribers.push(
      window.electronAPI?.onUpdateAvailable?.((info) => {
        setUpdateState('available')
        setUpdateInfo(info)
        setDismissed(false)
      })
    )

    unsubscribers.push(
      window.electronAPI?.onUpdateNotAvailable?.(() => {
        setUpdateState('idle')
      })
    )

    unsubscribers.push(
      window.electronAPI?.onUpdateProgress?.((progress) => {
        setUpdateState('downloading')
        setDownloadProgress(progress.percent)
      })
    )

    unsubscribers.push(
      window.electronAPI?.onUpdateDownloaded?.((info) => {
        setUpdateState('ready')
        setUpdateInfo(info)
      })
    )

    unsubscribers.push(
      window.electronAPI?.onUpdateError?.((message) => {
        setUpdateState('error')
        setError(message)
      })
    )

    return () => {
      unsubscribers.forEach(unsub => unsub?.())
    }
  }, [])

  const handleCheckForUpdates = async () => {
    setUpdateState('checking')
    setError(null)
    const result = await window.electronAPI?.checkForUpdates()
    if (result?.error) {
      setError(result.error)
      setUpdateState('error')
    }
  }

  const handleDownload = async () => {
    setUpdateState('downloading')
    setDownloadProgress(0)
    await window.electronAPI?.downloadUpdate()
  }

  const handleInstall = () => {
    window.electronAPI?.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't show anything if dismissed or idle
  if (dismissed && updateState !== 'ready') return null
  if (updateState === 'idle') return null

  return (
    <div className={`update-notification ${updateState}`}>
      {updateState === 'checking' && (
        <div className="update-content">
          <span className="update-spinner"></span>
          <span>Checking for updates...</span>
        </div>
      )}

      {updateState === 'available' && (
        <div className="update-content">
          <span className="update-icon">🎉</span>
          <div className="update-text">
            <strong>Update available!</strong>
            <span>Version {updateInfo?.version} is ready to download</span>
          </div>
          <div className="update-actions">
            <button className="btn-update" onClick={handleDownload}>
              Download
            </button>
            <button className="btn-dismiss" onClick={handleDismiss}>
              Later
            </button>
          </div>
        </div>
      )}

      {updateState === 'downloading' && (
        <div className="update-content">
          <div className="update-text">
            <strong>Downloading update...</strong>
            <div className="update-progress-bar">
              <div 
                className="update-progress-fill" 
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <span>{Math.round(downloadProgress)}%</span>
          </div>
        </div>
      )}

      {updateState === 'ready' && (
        <div className="update-content">
          <span className="update-icon">✨</span>
          <div className="update-text">
            <strong>Update ready!</strong>
            <span>Restart to install version {updateInfo?.version}</span>
          </div>
          <div className="update-actions">
            <button className="btn-update" onClick={handleInstall}>
              Restart Now
            </button>
            <button className="btn-dismiss" onClick={handleDismiss}>
              Later
            </button>
          </div>
        </div>
      )}

      {updateState === 'error' && (
        <div className="update-content">
          <span className="update-icon">⚠️</span>
          <div className="update-text">
            <span>{error || 'Failed to check for updates'}</span>
          </div>
          <button className="btn-dismiss" onClick={() => setUpdateState('idle')}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default UpdateNotification
