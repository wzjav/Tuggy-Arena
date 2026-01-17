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
          // Error handled silently
        }
      }
    }
    
    // Small delay to ensure video ref is set and element is rendered
    const timer = setTimeout(start, 300)
    
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
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full Screen Game */}
      <div className="absolute inset-0 w-full h-full">
        <TugOfWar3D
          userScore={effectiveCount}
          aiScore={aiScore}
          gameOver={gameOver}
          onReset={handleReset}
        />
      </div>

      {/* Camera Overlay - Top Left */}
      <div className="absolute top-4 left-4 z-20 w-64 bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
        <div className="relative w-full aspect-video">
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
              <div className="text-white text-sm text-center px-2">
                {error ? `Error: ${error}` : 'Initializing...'}
              </div>
            </div>
          )}
          
          {/* Detection Status Indicator */}
          {isDetecting && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              <div>Status: {tongueState}</div>
            </div>
          )}
        </div>
      </div>

      {/* Counter Display - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <TongueCounter count={effectiveCount} tongueState={tongueState} />
      </div>

      {/* Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-4">
        <button
          onClick={isActive ? stopDetection : startDetection}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg ${
            isActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isActive ? 'Stop' : 'Start'}
        </button>
        
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors shadow-lg"
        >
          Reset Game
        </button>
      </div>
    </div>
  )
}
