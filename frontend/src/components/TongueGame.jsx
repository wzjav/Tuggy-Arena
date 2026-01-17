import { useRef, useEffect, useState, useCallback } from 'react'
import { useTongueDetection } from '../hooks/useTongueDetection'
import TongueCounter from './TongueCounter'
import TugOfWar3D from './TugOfWar3D'
import { AIOpponent } from '../utils/aiOpponent.js'

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

  // Game state
  const [aiScore, setAiScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const aiOpponentRef = useRef(null)
  const gameLoopRef = useRef(null)
  const lastTimeRef = useRef(null)
  const frozenCountRef = useRef(null) // Store count when game ends

  // Initialize AI opponent
  useEffect(() => {
    if (!aiOpponentRef.current) {
      aiOpponentRef.current = new AIOpponent({
        baseRate: 0.5,
        randomness: 0.3,
        minInterval: 500,
        maxInterval: 2000
      })
    }
  }, [])

  // Freeze count when game ends
  useEffect(() => {
    if (gameOver && frozenCountRef.current === null) {
      frozenCountRef.current = count
    } else if (!gameOver) {
      frozenCountRef.current = null
    }
  }, [gameOver, count])

  // Get the effective count (frozen if game over, otherwise live)
  const effectiveCount = gameOver && frozenCountRef.current !== null
    ? frozenCountRef.current
    : count

  // Game loop to update AI score
  useEffect(() => {
    if (!isActive || gameOver || !aiOpponentRef.current) return

    const gameLoop = (currentTime) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }

      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime

      // Update AI opponent (use live count for AI updates during game)
      if (aiOpponentRef.current) {
        aiOpponentRef.current.update(count, deltaTime)
        setAiScore(aiOpponentRef.current.getScore())
      }

      // Check win conditions (use live count for win detection)
      const scoreDifference = count - aiOpponentRef.current.getScore()
      const maxScoreDifference = 20
      const ropePosition = 50 - (scoreDifference / maxScoreDifference) * 40
      const clampedPosition = Math.max(10, Math.min(90, ropePosition))

      if (clampedPosition <= 10 || clampedPosition >= 90) {
        setGameOver(true)
        return
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = null
      }
      lastTimeRef.current = null
    }
  }, [isActive, gameOver, count])

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

  // Reset game
  const handleReset = useCallback(() => {
    setGameOver(false)
    setAiScore(0)
    frozenCountRef.current = null
    if (aiOpponentRef.current) {
      aiOpponentRef.current.reset()
    }
    resetCount()
    lastTimeRef.current = null
  }, [resetCount])

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Main Game Area - Side by Side Layout */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        {/* Left Side - Video Display */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl w-full aspect-video">
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
                <div>Count: {effectiveCount}</div>
              </div>
            )}
          </div>

          {/* Counter Display */}
          <TongueCounter count={effectiveCount} tongueState={tongueState} />
        </div>

        {/* Right Side - 3D Tug of War Game */}
        <div className="flex-1">
          <TugOfWar3D
            userScore={effectiveCount}
            aiScore={aiScore}
            gameOver={gameOver}
            onReset={handleReset}
          />
        </div>
      </div>

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
      <div className="bg-black bg-opacity-30 rounded-lg p-4 max-w-4xl w-full">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
          <li>Position your face in front of the camera</li>
          <li>Open your mouth so your tongue is visible</li>
          <li>Move your tongue left and right to increase your score</li>
          <li>Each left→right or right→left movement counts as 1</li>
          <li>Pull the rope to your side (10% threshold) to win!</li>
          <li>The AI opponent will reactively increase difficulty as you score more</li>
        </ul>
      </div>
    </div>
  )
}
