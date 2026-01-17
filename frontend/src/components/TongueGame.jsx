import { useRef, useEffect } from 'react'
import { useTongueDetection } from '../hooks/useTongueDetection'
import TongueCounter from './TongueCounter'

/**
 * Main Tongue Game Component
 */
export default function TongueGame() {
  const {
    videoRef,
    canvasRef,
    isActive,
    isDetecting,
    count,
    tongueState,
    error,
    startDetection,
    stopDetection,
    resetCount
  } = useTongueDetection({
    smoothingWindow: 5,
    minConfidence: 0.4, // Higher confidence required (tongue must be clearly out)
    leftThreshold: -0.001, // Much more sensitive - small head movements count
    rightThreshold: 0.001,
    minHoldFrames: 2
  })

  // Auto-start detection when component mounts (only once)
  useEffect(() => {
    let mounted = true
    
    const start = async () => {
      if (!isActive && !error && mounted) {
        try {
          await startDetection()
        } catch (err) {
          console.error('Auto-start failed:', err)
        }
      }
    }
    
    // Small delay to ensure video ref is set
    const timer = setTimeout(start, 100)
    
    return () => {
      mounted = false
      clearTimeout(timer)
      stopDetection()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Video Display */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-4xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-auto"
          style={{ transform: 'scaleX(-1)' }} // Mirror for user
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Overlay Status */}
        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-xl">
              {error ? `Error: ${error}` : 'Initializing...'}
            </div>
          </div>
        )}
        
        {/* Detection Status Indicator */}
        {isDetecting && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm">
            <div>Status: {tongueState}</div>
            <div>Count: {count}</div>
          </div>
        )}
      </div>

      {/* Counter Display */}
      <TongueCounter count={count} tongueState={tongueState} />

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={isActive ? stopDetection : startDetection}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isActive ? 'Stop' : 'Start'}
        </button>
        
        <button
          onClick={resetCount}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
        >
          Reset Count
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-black bg-opacity-30 rounded-lg p-4 max-w-2xl">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
          <li>Position your face in front of the camera</li>
          <li>Open your mouth so your tongue is visible</li>
          <li>Move your tongue left and right</li>
          <li>Each left→right or right→left movement counts as 1</li>
        </ul>
      </div>
    </div>
  )
}
