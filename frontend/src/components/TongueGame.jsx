import { useRef, useEffect, useState } from 'react'
import { useTongueDetection } from '../hooks/useTongueDetection'
import TugOfWar from './TugOfWar'
import { AIOpponent } from '../utils/aiOpponent'

/**
 * Main Tongue Game Component - Tug of War Edition
 */
export default function TongueGame() {
  const [aiScore, setAiScore] = useState(0)
  const aiOpponentRef = useRef(null)

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

  // Initialize AI opponent
  useEffect(() => {
    if (!aiOpponentRef.current) {
      aiOpponentRef.current = new AIOpponent({
        basePullInterval: 1500,
        basePullStrength: 0.5,
        maxPullMultiplier: 3.0
      })
    }

    return () => {
      if (aiOpponentRef.current) {
        aiOpponentRef.current.stop()
      }
    }
  }, [])

  // Handle AI score updates
  const handleAiScoreUpdate = (newScore) => {
    setAiScore(newScore)
  }

  // Start AI when detection starts
  useEffect(() => {
    if (isActive && isDetecting && aiOpponentRef.current) {
      // Pass a function that returns current count, so AI can check it dynamically
      aiOpponentRef.current.start(() => count, handleAiScoreUpdate)
    } else if (!isActive && aiOpponentRef.current) {
      aiOpponentRef.current.stop()
    }
  }, [isActive, isDetecting, count])

  // Reset game function
  const handleReset = () => {
    resetCount()
    setAiScore(0)
    if (aiOpponentRef.current) {
      aiOpponentRef.current.reset()
    }
    // Restart AI if game is still active
    if (isActive && isDetecting) {
      setTimeout(() => {
        if (aiOpponentRef.current) {
          aiOpponentRef.current.start(() => count, handleAiScoreUpdate)
        }
      }, 100)
    }
  }

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
      if (aiOpponentRef.current) {
        aiOpponentRef.current.stop()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Video Display */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-4xl aspect-video">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }} // Mirror for user
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
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

      {/* Tug of War Display */}
      <TugOfWar 
        userScore={count} 
        aiScore={aiScore} 
        onReset={handleReset}
      />

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
          onClick={handleReset}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
        >
          Reset Game
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-black bg-opacity-30 rounded-lg p-4 max-w-2xl">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
          <li>Position your face in front of the camera</li>
          <li>Open your mouth so your tongue is visible</li>
          <li>Move your tongue left and right to pull the rope</li>
          <li>Pull the rope to your side (left) to win!</li>
          <li>The AI opponent will pull back - the harder you pull, the harder it pulls!</li>
        </ul>
      </div>
    </div>
  )
}
