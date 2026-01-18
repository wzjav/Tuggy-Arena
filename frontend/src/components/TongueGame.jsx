import { useRef, useEffect, useState, useCallback } from 'react'
import { useTongueDetection } from '../hooks/useTongueDetection'
import { useDualTongueDetection } from '../hooks/useDualTongueDetection'
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

  const modeLabel = gameMode === 'ai' ? 'Solo vs AI' : 'Dual Player'
  const liveStatus = gameOver ? 'Finished round' : 'Live match'
  const trackingStatus = gameMode === 'ai'
    ? (player1IsDetecting ? 'Tracking tongue movement' : 'Waiting for camera')
    : (dualIsDetecting ? 'Tracking both players' : 'Waiting for faces')

  // Show mode selector if not selected yet
  if (showModeSelector) {
    return (
      <div className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: '#1A3B58' }}>
        <div className="absolute inset-0" style={{ backgroundColor: '#1A3B58' }} />
        <div className="absolute -left-24 -top-20 w-96 h-96 blur-3xl rounded-full" style={{ backgroundColor: '#35679B', opacity: 0.4 }} />
        <div className="absolute right-[-10rem] bottom-[-8rem] w-[28rem] h-[28rem] blur-3xl rounded-full" style={{ backgroundColor: '#FFD700', opacity: 0.3 }} />

        <div className="relative max-w-4xl mx-auto px-8 py-16 flex flex-col items-center">
          <div className="w-full max-w-2xl text-center mb-12">
            <p className="text-[12px] tracking-[0.34em] uppercase mb-3" style={{ color: '#FFD700' }}>Motion Arena</p>
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight mb-12 text-white">Tongue Tug Arena</h1>
          </div>

          <div className="w-full max-w-xl flex flex-col gap-4">
            <button
              onClick={() => handleModeSelect('ai')}
              className="group rounded-3xl border p-8 text-left transition-all shadow-2xl flex flex-col gap-3 transform hover:scale-[1.02]"
              style={{ 
                backgroundColor: '#35679B', 
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7DB0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#35679B'
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-[0.3em] text-white">Solo</span>
                <span className="px-3 py-1 text-xs rounded-full text-white" style={{ backgroundColor: '#2D3540', border: 'none' }}>AI Rival</span>
              </div>
              <div className="text-3xl font-semibold text-white">Play vs AI</div>
              <p className="text-white text-sm opacity-90">
                Adaptive opponent scales its pull as you move. Perfect for practice or demos.
              </p>
            </button>

            <button
              onClick={() => handleModeSelect('human')}
              className="group rounded-3xl border p-8 text-left transition-all shadow-2xl flex flex-col gap-3 transform hover:scale-[1.02]"
              style={{ 
                backgroundColor: '#35679B', 
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7DB0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#35679B'
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-[0.3em] text-white">Co-op</span>
                <span className="px-3 py-1 text-xs rounded-full text-white" style={{ backgroundColor: '#2D3540', border: 'none' }}>Shared Cam</span>
              </div>
              <div className="text-3xl font-semibold text-white">Play vs Human</div>
              <p className="text-white text-sm opacity-90">
                Two players, one camera. Stay left and right of center to keep the rope balanced.
              </p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: '#1A3B58' }}>
      <div className="absolute inset-0" style={{ backgroundColor: '#1A3B58' }} />
      <div className="absolute -left-20 top-10 w-80 h-80 blur-3xl rounded-full" style={{ backgroundColor: '#35679B', opacity: 0.4 }} />
      <div className="absolute right-[-18rem] bottom-[-10rem] w-[32rem] h-[32rem] blur-3xl rounded-full" style={{ backgroundColor: '#FFD700', opacity: 0.3 }} />

      <div className="relative z-30 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs uppercase tracking-[0.28em] text-white" style={{ backgroundColor: '#35679B', border: 'none' }}>
            {modeLabel}
          </span>
          <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#FFD700', border: 'none', color: '#1A3B58' }}>
            {liveStatus}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 w-full h-full">
        <TugOfWar3D
          player1Score={player1Score}
          player2Score={player2Score}
          gameMode={gameMode}
          gameOver={gameOver}
          onReset={handleReset}
        />
      </div>

      {/* Camera Overlay - Solo AI mode */}
      {gameMode === 'ai' && (
        <div className="absolute top-6 right-6 z-30 w-[22rem]">
          <div className="rounded-2xl border overflow-hidden shadow-2xl" style={{ backgroundColor: '#35679B', border: 'none' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white opacity-80">Player Cam</p>
                <p className="text-sm text-white">Mirror view for calibration</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full text-white" style={{
                backgroundColor: player1IsDetecting ? '#FFD700' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: player1IsDetecting ? '#1A3B58' : 'white'
              }}>
                {player1IsDetecting ? 'Live' : 'Init'}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-black/40">
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
              
              {!player1IsDetecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-white text-sm text-center px-3">
                    {player1Error ? `Error: ${player1Error}` : 'Initializing camera...'}
                  </div>
                </div>
              )}
              
              {player1IsDetecting && (
                <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-2 rounded-lg text-xs border border-white/10">
                  <div className="font-semibold">State: {player1TongueState}</div>
                  <div className="text-slate-300">Keep shoulders level for steady tracking</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dual Camera Overlay - Human mode */}
      {gameMode === 'human' && (
        <div className="absolute top-6 right-6 z-30 w-[22rem]">
          <div className="rounded-2xl border overflow-hidden shadow-2xl" style={{ backgroundColor: '#35679B', border: 'none' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white opacity-80">Shared Camera</p>
                <p className="text-sm text-white">Left player on the left, right player on the right.</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full text-white" style={{
                backgroundColor: dualIsDetecting ? '#FFD700' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: dualIsDetecting ? '#1A3B58' : 'white'
              }}>
                {dualIsDetecting ? 'Tracking' : 'Init'}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-black/40">
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
              
              {!dualIsDetecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-white text-sm text-center px-3">
                    {dualError ? `Error: ${dualError}` : 'Initializing face detection...'}
                  </div>
                </div>
              )}
              
              {dualIsDetecting && (
                <>
                  <div className="absolute top-3 left-3 text-white px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#35679B' }}>
                    Player 1 (Left)
                  </div>
                  <div className="absolute top-3 right-3 px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#F1F2F6', color: '#2D3540' }}>
                    Player 2 (Right)
                  </div>
                  <div className="absolute bottom-3 left-3 text-white px-3 py-2 rounded text-xs shadow-lg" style={{ backgroundColor: '#35679B' }}>
                    P1: {dualPlayer1TongueState}
                  </div>
                  <div className="absolute bottom-3 right-3 px-3 py-2 rounded text-xs shadow-lg" style={{ backgroundColor: '#F1F2F6', color: '#2D3540' }}>
                    P2: {dualPlayer2TongueState}
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/65 text-white px-3 py-2 rounded text-xs border border-white/10">
                    Faces detected: {detectedFaces}/2
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-5xl px-4">
        <div className="rounded-2xl border px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ backgroundColor: '#2D3540', border: 'none' }}>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white">
            <span className="px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#35679B', border: 'none' }}>
              {gameMode === 'ai'
                ? (player1IsActive ? 'Camera live' : 'Camera idle')
                : `${detectedFaces}/2 faces`}
            </span>
            <span className="text-white opacity-80">{trackingStatus}</span>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={gameMode === 'ai' 
                ? (player1IsActive ? player1StopDetection : player1StartDetection)
                : (dualIsActive ? dualStopDetection : dualStartDetection)
              }
              className="px-5 py-3 rounded-xl font-semibold transition transform hover:-translate-y-0.5 text-white border"
              style={{
                backgroundColor: (gameMode === 'ai' ? player1IsActive : dualIsActive) ? '#35679B' : '#FFD700',
                border: 'none',
                outline: 'none',
                color: (gameMode === 'ai' ? player1IsActive : dualIsActive) ? 'white' : '#1A3B58'
              }}
            >
              {(gameMode === 'ai' ? player1IsActive : dualIsActive) ? 'Pause Tracking' : 'Start Tracking'}
            </button>
            
            <button
              onClick={handleReset}
              className="px-5 py-3 rounded-xl font-semibold border transition transform hover:-translate-y-0.5"
              style={{ backgroundColor: '#F1F2F6', border: 'none', outline: 'none', color: '#2D3540' }}
            >
              Reset Game
            </button>

            <button
              onClick={handleReturnToModeSelect}
              className="px-5 py-3 rounded-xl font-semibold text-white border transition transform hover:-translate-y-0.5"
              style={{ backgroundColor: '#1A3B58', border: 'none', outline: 'none' }}
            >
              Change Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
