import { useRef, useEffect, useState, useCallback } from 'react'
import { useTongueDetection } from '../hooks/useTongueDetection'
import { useDualTongueDetection } from '../hooks/useDualTongueDetection'
import TongueCounter from './TongueCounter'
import TugOfWar3D from './TugOfWar3D'
import { AIOpponent } from '../utils/aiOpponent.js'

/**
 * Main Tongue Game Component
 */
export default function TongueGame() {
  // Game mode: 'ai' or 'human'
  const [gameMode, setGameMode] = useState(null) // null = not selected yet
  const [showModeSelector, setShowModeSelector] = useState(true)

  // Player 1 detection (for AI mode)
  const {
    videoRef: player1VideoRef,
    canvasRef: player1CanvasRef,
    isActive: player1IsActive,
    isDetecting: player1IsDetecting,
    count: player1Count,
    tongueState: player1TongueState,
    error: player1Error,
    startDetection: player1StartDetection,
    stopDetection: player1StopDetection,
    resetCount: player1ResetCount
  } = useTongueDetection({
    smoothingWindow: 5,
    minConfidence: 0.4,
    leftThreshold: -0.001,
    rightThreshold: 0.001,
    minHoldFrames: 2
  })

  // Dual detection (for human mode - detects both players in same camera)
  const {
    videoRef: dualVideoRef,
    canvasRef: dualCanvasRef,
    isActive: dualIsActive,
    isDetecting: dualIsDetecting,
    player1Count: dualPlayer1Count,
    player2Count: dualPlayer2Count,
    player1TongueState: dualPlayer1TongueState,
    player2TongueState: dualPlayer2TongueState,
    error: dualError,
    detectedFaces,
    startDetection: dualStartDetection,
    stopDetection: dualStopDetection,
    resetCounts: dualResetCounts
  } = useDualTongueDetection({
    smoothingWindow: 5,
    minConfidence: 0.3, // Lower confidence threshold for easier detection
    leftThreshold: -0.0003, // Closer to zero - easier to detect left movements (smaller movements trigger)
    rightThreshold: 0.0003, // Closer to zero - easier to detect right movements (smaller movements trigger)
    minHoldFrames: 1 // Reduced frames needed for state change - more responsive
  })

  // Game state
  const [aiScore, setAiScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const aiOpponentRef = useRef(null)
  const gameLoopRef = useRef(null)
  const lastTimeRef = useRef(null)
  const frozenPlayer1CountRef = useRef(null) // Store count when game ends
  const frozenPlayer2CountRef = useRef(null) // Store count when game ends

  // Initialize AI opponent (only for AI mode)
  useEffect(() => {
    if (gameMode === 'ai' && !aiOpponentRef.current) {
      aiOpponentRef.current = new AIOpponent({
        baseRate: 0.5,
        randomness: 0.3,
        minInterval: 500,
        maxInterval: 2000
      })
    } else if (gameMode === 'human' && aiOpponentRef.current) {
      // Clean up AI opponent when switching to human mode
      aiOpponentRef.current = null
    }
  }, [gameMode])

  // Freeze counts when game ends
  useEffect(() => {
    if (gameOver) {
      if (gameMode === 'ai') {
        if (frozenPlayer1CountRef.current === null) {
          frozenPlayer1CountRef.current = player1Count
        }
      } else if (gameMode === 'human') {
        if (frozenPlayer1CountRef.current === null) {
          frozenPlayer1CountRef.current = dualPlayer1Count
        }
        if (frozenPlayer2CountRef.current === null) {
          frozenPlayer2CountRef.current = dualPlayer2Count
        }
      }
    } else {
      frozenPlayer1CountRef.current = null
      frozenPlayer2CountRef.current = null
    }
  }, [gameOver, player1Count, dualPlayer1Count, dualPlayer2Count, gameMode])

  // Get effective counts (frozen if game over, otherwise live)
  const effectivePlayer1Count = gameOver && frozenPlayer1CountRef.current !== null
    ? frozenPlayer1CountRef.current
    : (gameMode === 'ai' ? player1Count : dualPlayer1Count)

  const effectivePlayer2Count = gameOver && frozenPlayer2CountRef.current !== null
    ? frozenPlayer2CountRef.current
    : (gameMode === 'ai' ? aiScore : dualPlayer2Count)

  // Determine scores based on game mode
  // Player 1 = Blue character (left side) = leftmost face in camera
  // Player 2 = Red character (right side) = rightmost face in camera
  const player1Score = effectivePlayer1Count  // Blue/Left character
  const player2Score = effectivePlayer2Count   // Red/Right character

  // Game loop to update AI score (only in AI mode) and check win conditions
  useEffect(() => {
    if (!gameMode || gameOver) return
    if (gameMode === 'ai' && (!player1IsActive || !aiOpponentRef.current)) return
    if (gameMode === 'human' && !dualIsActive) return

    const gameLoop = (currentTime) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }

      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime

      // Update AI opponent (only in AI mode, use live count for AI updates during game)
      if (gameMode === 'ai' && aiOpponentRef.current) {
        aiOpponentRef.current.update(player1Count, deltaTime)
        setAiScore(aiOpponentRef.current.getScore())
      }

      // Check win conditions (use live counts for win detection)
      const scoreDifference = gameMode === 'ai' 
        ? player1Count - aiOpponentRef.current.getScore()
        : dualPlayer1Count - dualPlayer2Count
      
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
  }, [gameMode, player1IsActive, dualIsActive, gameOver, player1Count, dualPlayer1Count, dualPlayer2Count, aiScore])

  // Handle game mode selection
  const handleModeSelect = useCallback(async (mode) => {
    setGameMode(mode)
    setShowModeSelector(false)
    
    // Small delay to ensure video refs are set
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (mode === 'ai') {
      // Start detection for player 1 only
      try {
        await player1StartDetection()
      } catch (err) {
        console.error('Failed to start player 1 detection:', err)
      }
    } else if (mode === 'human') {
      // Start dual detection (both players in same camera)
      try {
        await dualStartDetection()
      } catch (err) {
        console.error('Failed to start dual detection:', err)
        // If dual detection fails, fall back to AI mode
        setGameMode('ai')
        setShowModeSelector(false)
        if (!aiOpponentRef.current) {
          aiOpponentRef.current = new AIOpponent({
            baseRate: 0.5,
            randomness: 0.3,
            minInterval: 500,
            maxInterval: 2000
          })
        }
        try {
          await player1StartDetection()
        } catch (err2) {
          console.error('Failed to start player 1 detection:', err2)
        }
      }
    }
  }, [player1StartDetection, dualStartDetection])

  // Reset game
  const handleReset = useCallback(() => {
    setGameOver(false)
    setAiScore(0)
    frozenPlayer1CountRef.current = null
    frozenPlayer2CountRef.current = null
    if (aiOpponentRef.current) {
      aiOpponentRef.current.reset()
    }
    if (gameMode === 'ai') {
      player1ResetCount()
    } else if (gameMode === 'human') {
      dualResetCounts()
    }
    lastTimeRef.current = null
  }, [player1ResetCount, dualResetCounts, gameMode])

  // Return to mode selection
  const handleReturnToModeSelect = useCallback(() => {
    if (gameMode === 'ai') {
      player1StopDetection()
    } else if (gameMode === 'human') {
      dualStopDetection()
    }
    setGameMode(null)
    setShowModeSelector(true)
    setGameOver(false)
    setAiScore(0)
    frozenPlayer1CountRef.current = null
    frozenPlayer2CountRef.current = null
    if (aiOpponentRef.current) {
      aiOpponentRef.current.reset()
    }
    player1ResetCount()
    dualResetCounts()
    lastTimeRef.current = null
  }, [gameMode, player1StopDetection, dualStopDetection, player1ResetCount, dualResetCounts])

  // Show mode selector if not selected yet
  if (showModeSelector) {
    return (
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center z-30 bg-black bg-opacity-80 rounded-2xl p-12 shadow-2xl max-w-2xl">
          <h1 className="text-5xl font-bold text-white mb-4">Tug of War</h1>
          <p className="text-xl text-gray-300 mb-8">Choose your game mode</p>
          
          <div className="flex flex-col gap-6">
            <button
              onClick={() => handleModeSelect('ai')}
              className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-xl shadow-lg transform hover:scale-105"
            >
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-bold text-2xl mb-1">Play vs AI</div>
              <div className="text-sm opacity-90">Challenge the computer opponent</div>
            </button>
            
            <button
              onClick={() => handleModeSelect('human')}
              className="px-8 py-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-xl shadow-lg transform hover:scale-105"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-bold text-2xl mb-1">Play vs Human</div>
              <div className="text-sm opacity-90">Two players, one camera</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full Screen Game */}
      <div className="absolute inset-0 w-full h-full">
        <TugOfWar3D
          player1Score={player1Score}
          player2Score={player2Score}
          gameMode={gameMode}
          gameOver={gameOver}
          onReset={handleReset}
        />
      </div>

      {/* Camera Overlay - Top Left (AI mode) */}
      {gameMode === 'ai' && (
        <div className="absolute top-4 left-4 z-20 w-64 bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-full aspect-video">
            <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
              You
            </div>
            <video
              ref={player1VideoRef}
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ transform: 'scaleX(-1)' }} // Mirror for user
            />
            <canvas
              ref={player1CanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Overlay Status */}
            {!player1IsDetecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-sm text-center px-2">
                  {player1Error ? `Error: ${player1Error}` : 'Initializing...'}
                </div>
              </div>
            )}
            
            {/* Detection Status Indicator */}
            {player1IsDetecting && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                <div>Status: {player1TongueState}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dual Camera Overlay - Top Center (Human mode) */}
      {gameMode === 'human' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-[32rem] bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-full" style={{ aspectRatio: '21/9' }}>
            {/* Player 1 Label - Left Side */}
            <div className="absolute top-2 left-2 z-10 bg-blue-600 bg-opacity-90 text-white px-3 py-1 rounded text-xs font-semibold">
              Player 1 (Left)
            </div>
            
            {/* Player 2 Label - Right Side */}
            <div className="absolute top-2 right-2 z-10 bg-red-600 bg-opacity-90 text-white px-3 py-1 rounded text-xs font-semibold">
              Player 2 (Right)
            </div>
            
            <video
              ref={dualVideoRef}
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ transform: 'scaleX(-1)' }} // Mirror for user
            />
            <canvas
              ref={dualCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Overlay Status */}
            {!dualIsDetecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-sm text-center px-2">
                  {dualError ? `Error: ${dualError}` : 'Initializing...'}
                </div>
              </div>
            )}
            
            {/* Face Detection Status */}
            {dualIsDetecting && (
              <>
                <div className="absolute bottom-2 left-2 bg-blue-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                  <div>P1: {dualPlayer1TongueState}</div>
                </div>
                <div className="absolute bottom-2 right-2 bg-red-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                  <div>P2: {dualPlayer2TongueState}</div>
                </div>
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                  Faces: {detectedFaces}/2
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Counter Display - Bottom Right (only in AI mode) */}
      {gameMode === 'ai' && (
        <div className="absolute bottom-4 right-4 z-20">
          <TongueCounter count={effectivePlayer1Count} tongueState={player1TongueState} />
        </div>
      )}

      {/* Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-4">
        <button
          onClick={gameMode === 'ai' 
            ? (player1IsActive ? player1StopDetection : player1StartDetection)
            : (dualIsActive ? dualStopDetection : dualStartDetection)
          }
          className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg ${
            (gameMode === 'ai' ? player1IsActive : dualIsActive)
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {(gameMode === 'ai' ? player1IsActive : dualIsActive) ? 'Stop' : 'Start'}
        </button>
        
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors shadow-lg"
        >
          Reset Game
        </button>

        <button
          onClick={handleReturnToModeSelect}
          className="px-6 py-3 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-lg"
        >
          Change Mode
        </button>
      </div>
    </div>
  )
}
