import { useEffect, useRef, useState } from 'react'
import { useARClothing } from '../hooks/useARClothing'

function ARClothingViewer({ selectedClothing, isCameraActive, setIsCameraActive }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [status, setStatus] = useState('initializing')
  const [error, setError] = useState(null)
  
  // Check if camera access is available
  const isCameraAvailable = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  const {
    initialize,
    startDetection,
    stopDetection,
    updateClothing,
    isInitialized,
    isDetecting
  } = useARClothing()

  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      try {
        if (mounted) setStatus('initializing')
        
        await initialize(videoRef.current, canvasRef.current)
        
        if (mounted) setStatus('ready')
      } catch (err) {
        console.error('Initialization error:', err)
        if (mounted) {
          setError(err.message || 'Failed to initialize AR system. You can still try to start the camera.')
          setStatus('ready') // Set to ready so button shows even on error
        }
      }
    }

    if (containerRef.current) {
      init()
    }

    return () => {
      mounted = false
      stopDetection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isCameraActive && isInitialized) {
      startDetection()
      setStatus('detecting')
    } else if (!isCameraActive && isDetecting) {
      stopDetection()
      setStatus('ready')
    }
  }, [isCameraActive, isInitialized])

  useEffect(() => {
    if (selectedClothing && isInitialized) {
      updateClothing(selectedClothing)
    }
  }, [selectedClothing, isInitialized])

  const handleStartCamera = async () => {
    console.log('Start Camera button clicked')
    
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Camera access is not available. Please use HTTPS or localhost.'
      console.error(errorMsg)
      setError(errorMsg)
      setStatus('error')
      return
    }

    try {
      console.log('Requesting camera access...')
      setStatus('ready') // Ensure status is ready
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })
      
      console.log('Camera access granted, stream:', stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current?.play()
        }
        setIsCameraActive(true)
        setError(null) // Clear any previous errors
      } else {
        console.error('Video ref is null')
        setError('Video element not ready')
      }
    } catch (err) {
      console.error('Camera access error:', err)
      let errorMessage = 'Failed to access camera.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera device.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.'
      } else {
        errorMessage = `Camera error: ${err.message || err.name}`
      }
      
      setError(errorMessage)
      setStatus('ready') // Keep status as ready so user can try again
    }
  }

  const handleStopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    stopDetection()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      
      <div 
        ref={containerRef} 
        className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-black"
        style={{ minHeight: '500px' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto block"
          style={{ display: isCameraActive ? 'block' : 'none' }}
        />
        
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ pointerEvents: 'none', zIndex: 1 }}
        />

        {status === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Initializing AR system...</p>
            </div>
          </div>
        )}

        {!isCameraActive && status !== 'initializing' && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8"
            style={{ zIndex: 100, pointerEvents: 'auto', minHeight: '500px' }}
            onMouseEnter={() => console.log('Overlay hovered')}
          >
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Camera Not Active</h3>
              <p className="text-gray-400 mb-4">
                Click the button below to start your camera and begin the AR try-on experience
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleStartCamera()
                }}
                disabled={status === 'initializing'}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer relative"
                style={{ zIndex: 1000, pointerEvents: 'auto', position: 'relative' }}
              >
                {status === 'initializing' ? 'Initializing...' : 'Start Camera'}
              </button>
            </div>
          </div>
        )}

        {/* Show button even during initialization after a delay */}
        {status === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 text-white p-8 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="mb-4">Initializing AR system...</p>
              <p className="text-sm text-gray-400 mb-4">This may take a few moments</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleStartCamera()
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-4 cursor-pointer"
                style={{ zIndex: 1000 }}
              >
                Start Camera Anyway
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white z-10">
            <div className="text-center bg-red-900 bg-opacity-80 p-6 rounded-lg">
              <p className="text-red-200 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  setStatus('ready')
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isCameraActive && (
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-white text-xs z-10 ${
            isDetecting 
              ? 'bg-green-500 bg-opacity-80' 
              : 'bg-red-500 bg-opacity-80'
          }`}>
            {isDetecting ? '● Detecting' : '○ Ready'}
          </div>
        )}

        {isCameraActive && (
          <button
            onClick={handleStopCamera}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors z-10"
          >
            Stop Camera
          </button>
        )}
      </div>

      {selectedClothing && (
        <div className="mt-4 p-3 bg-gray-700 rounded text-white text-sm">
          <strong>Selected:</strong> {selectedClothing.name}
        </div>
      )}
    </div>
  )
}

export default ARClothingViewer
