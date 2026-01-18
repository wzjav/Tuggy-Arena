import { useEffect, useRef, useState, useCallback } from 'react'
import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'

/**
 * Helper function to create a stylized character
 */
function createCharacter(scene, color, name) {
  const character = MeshBuilder.CreateBox(`${name}Char`, { width: 1, height: 2, depth: 1 }, scene)
  const material = new StandardMaterial(`${name}Mat`, scene)
  material.diffuseColor = color
  character.material = material

  // Create head
  const head = MeshBuilder.CreateSphere(`${name}Head`, { diameter: 0.8 }, scene)
  const headMaterial = new StandardMaterial(`${name}HeadMat`, scene)
  headMaterial.diffuseColor = color
  head.material = headMaterial
  head.position.y = 1.5
  head.parent = character

  // Create left arm
  const leftArm = MeshBuilder.CreateCylinder(`${name}LeftArm`, {
    height: 1.5,
    diameter: 0.2
  }, scene)
  const armMaterial = new StandardMaterial(`${name}ArmMat`, scene)
  armMaterial.diffuseColor = color
  leftArm.material = armMaterial
  leftArm.rotation.z = Math.PI / 6
  leftArm.position.x = -0.6
  leftArm.position.y = 0.5
  leftArm.parent = character

  // Create right arm
  const rightArm = MeshBuilder.CreateCylinder(`${name}RightArm`, {
    height: 1.5,
    diameter: 0.2
  }, scene)
  rightArm.material = armMaterial
  rightArm.rotation.z = -Math.PI / 6
  rightArm.position.x = 0.6
  rightArm.position.y = 0.5
  rightArm.parent = character

  return character
}

/**
 * 3D Tug of War Game Component using Babylon.js
 * Displays two stylized 3D characters pulling a rope, with position based on score difference
 */
export default function TugOfWar3D({ player1Score, player2Score, gameMode = 'ai', gameOver, onReset }) {
  // For backward compatibility, support old prop names
  const userScore = player1Score ?? 0
  const aiScore = player2Score ?? 0
  
  // Determine player labels based on game mode
  const player1Label = gameMode === 'ai' ? 'You' : 'Player 1'
  const player2Label = gameMode === 'ai' ? 'AI' : 'Player 2'
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const sceneRef = useRef(null)
  const userCharRef = useRef(null)
  const aiCharRef = useRef(null)
  const ropeRef = useRef(null)
  const ropeKnotRef = useRef(null)
  const [winner, setWinner] = useState(null) // 'user' or 'ai' or null
  const frozenRopePositionRef = useRef(null)

  // Calculate rope position (0-100%, where 50% is center)
  // Win threshold: 10% (player 1 wins) or 90% (player 2 wins)
  // Player 1 is on LEFT (lower %), Player 2 is on RIGHT (higher %)
  const calculateRopePosition = () => {
    const scoreDifference = userScore - aiScore
    const maxScoreDifference = 20 // Maximum expected score difference for full rope movement
    
    // Center at 50%, move +/-40% based on score difference
    // When player1Score > player2Score (positive difference), rope moves LEFT (lower %)
    // When player1Score < player2Score (negative difference), rope moves RIGHT (higher %)
    const position = 50 - (scoreDifference / maxScoreDifference) * 40
    
    // Clamp between 10% and 90% (win thresholds)
    return Math.max(10, Math.min(90, position))
  }

  // Calculate current rope position
  const currentRopePosition = calculateRopePosition()

  // Freeze rope position and determine winner when game ends
  useEffect(() => {
    if (gameOver && frozenRopePositionRef.current === null) {
      frozenRopePositionRef.current = currentRopePosition
      
      const frozenPos = frozenRopePositionRef.current
      if (frozenPos <= 10) {
        setWinner('player1')
      } else if (frozenPos >= 90) {
        setWinner('player2')
      } else {
        const scoreDifference = userScore - aiScore
        if (scoreDifference > 0) {
          setWinner('player1')
        } else {
          setWinner('player2')
        }
      }
    } else if (!gameOver) {
      frozenRopePositionRef.current = null
      setWinner(null)
    }
  }, [gameOver, currentRopePosition, userScore, aiScore])

  // Use frozen position if game is over, otherwise calculate dynamically
  const ropePosition = gameOver && frozenRopePositionRef.current !== null
    ? frozenRopePositionRef.current
    : currentRopePosition

  // Initialize Babylon.js scene
  useEffect(() => {
    if (!canvasRef.current) return

    // Create engine
    const engine = new Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true
    })
    engineRef.current = engine

    // Create scene
    const scene = new Scene(engine)
    sceneRef.current = scene

    // Create camera (fixed position for game view)
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2, // alpha (horizontal rotation)
      Math.PI / 3, // beta (vertical rotation)
      25, // radius (distance from target)
      new Vector3(0, 2, 0), // target
      scene
    )
    // Don't attach controls - keep camera fixed for game view
    camera.setTarget(Vector3.Zero())

    // Create lighting
    const hemisphericLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene)
    hemisphericLight.intensity = 0.7

    const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -1, -1), scene)
    directionalLight.intensity = 0.5
    directionalLight.position = new Vector3(10, 10, 10)

    // Create ground plane
    const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, scene)
    const groundMaterial = new StandardMaterial('groundMat', scene)
    groundMaterial.diffuseColor = new Color3(0.10, 0.23, 0.35) // Dark Blue #1A3B58 variant
    ground.material = groundMaterial
    ground.position.y = 0

    // Create center line marker
    const centerLine = MeshBuilder.CreateBox('centerLine', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const centerLineMaterial = new StandardMaterial('centerLineMat', scene)
    centerLineMaterial.diffuseColor = new Color3(1, 0.84, 0) // #FFD700 Bright Yellow
    centerLine.material = centerLineMaterial
    centerLine.position.x = 0
    centerLine.position.y = 0.25

    // Create win threshold markers
    const userWinMarker = MeshBuilder.CreateBox('userWinMarker', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const userWinMaterial = new StandardMaterial('userWinMat', scene)
    userWinMaterial.diffuseColor = new Color3(0.21, 0.40, 0.61) // #35679B Medium Blue
    userWinMarker.material = userWinMaterial
    userWinMarker.position.x = -9 // 10% of 30 units = -9 (left side)
    userWinMarker.position.y = 0.25

    const aiWinMarker = MeshBuilder.CreateBox('aiWinMarker', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const aiWinMaterial = new StandardMaterial('aiWinMat', scene)
    aiWinMaterial.diffuseColor = new Color3(0.95, 0.95, 0.96) // #F1F2F6 Off-White
    aiWinMarker.material = aiWinMaterial
    aiWinMarker.position.x = 9 // 90% of 30 units = 9 (right side)
    aiWinMarker.position.y = 0.25

    // Create user character (left side, medium blue)
    const userChar = createCharacter(scene, new Color3(0.21, 0.40, 0.61), 'user') // #35679B
    userChar.position.x = -12
    userChar.position.y = 2
    userCharRef.current = userChar

    // Create AI character (right side, off-white)
    const aiChar = createCharacter(scene, new Color3(0.95, 0.95, 0.96), 'ai') // #F1F2F6
    aiChar.position.x = 12
    aiChar.position.y = 2
    aiCharRef.current = aiChar

    // Create rope
    const ropeLength = 20
    const rope = MeshBuilder.CreateCylinder('rope', {
      height: ropeLength,
      diameter: 0.3
    }, scene)
    const ropeMaterial = new StandardMaterial('ropeMat', scene)
    ropeMaterial.diffuseColor = new Color3(0.55, 0.27, 0.07) // Brown
    rope.material = ropeMaterial
    rope.rotation.z = Math.PI / 2 // Rotate to horizontal
    rope.position.y = 1.5
    ropeRef.current = rope

    // Create rope knot/center marker
    const ropeKnot = MeshBuilder.CreateSphere('ropeKnot', { diameter: 0.8 }, scene)
    const knotMaterial = new StandardMaterial('knotMat', scene)
    knotMaterial.diffuseColor = new Color3(1, 0.84, 0) // #FFD700 Bright Yellow
    ropeKnot.material = knotMaterial
    ropeKnot.position.y = 1.5
    ropeKnotRef.current = ropeKnot

    // Render loop
    engine.runRenderLoop(() => {
      scene.render()
    })

    // Handle window resize
    const handleResize = () => {
      engine.resize()
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      engine.dispose()
    }
  }, []) // Only run once on mount

  // Update rope position smoothly
  const updateRopePosition = useCallback((position) => {
    if (!ropeRef.current || !ropeKnotRef.current) return

    // Convert percentage (0-100) to world position (-15 to 15)
    // 0% = -15 (far left), 50% = 0 (center), 100% = 15 (far right)
    const worldX = (position / 100) * 30 - 15

    // Update rope position (rope extends from knot position)
    ropeRef.current.position.x = worldX
    ropeKnotRef.current.position.x = worldX

    // Update character positions based on rope
    if (userCharRef.current && aiCharRef.current) {
      const userOffset = (50 - position) * 0.15 // Move left when winning
      const aiOffset = (position - 50) * 0.15 // Move right when winning
      
      userCharRef.current.position.x = -12 + userOffset
      aiCharRef.current.position.x = 12 + aiOffset
    }
  }, [])

  // Update rope position when score changes
  useEffect(() => {
    if (sceneRef.current && ropeRef.current && ropeKnotRef.current) {
      updateRopePosition(ropePosition)
    }
  }, [ropePosition, updateRopePosition])

  const player1Wins = gameOver
    ? (winner === 'player1' || (winner === null && ropePosition <= 10))
    : ropePosition <= 10
  const player2Wins = gameOver
    ? (winner === 'player2' || (winner === null && ropePosition >= 90))
    : ropePosition >= 90

  return (
    <div className="relative w-full h-full">
      {/* Score Display - Overlay at Top Center */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <div className="rounded-2xl border px-6 py-4 flex items-center gap-6 shadow-2xl" style={{ backgroundColor: '#2D3540'}}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#35679B', border: 'none', outline: 'none' }}>
              {player1Label.slice(0, 1)}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-white opacity-80">{player1Label}</div>
              <div className="text-3xl font-bold text-white">{Math.floor(userScore)}</div>
            </div>
          </div>

          <div className="px-4 py-2 rounded-xl text-xs uppercase tracking-[0.2em]" style={{ backgroundColor: '#FFD700', color: '#1A3B58', border: 'none' }}>
            Rope balance
          </div>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center font-semibold" style={{ backgroundColor: '#F1F2F6', border: 'none', outline: 'none', color: '#2D3540' }}>
              {player2Label.slice(0, 1)}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-white opacity-80">{player2Label}</div>
              <div className="text-3xl font-bold text-white">{Math.floor(aiScore)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas - Full Screen */}
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ outline: 'none' }}
        />

        {/* Win/Lose Overlay */}
        {gameOver && (winner !== null || ropePosition <= 10 || ropePosition >= 90) && (
          <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(26, 59, 88, 0.9)' }}>
            <div className="text-center space-y-4 max-w-lg px-4">
              <div className="text-6xl font-bold text-white">
                {player1Wins
                  ? (player1Label === 'You' ? 'You win!' : `${player1Label} wins!`)
                  : `${player2Label} wins!`}
              </div>
              <div className="text-lg text-white opacity-90">
                {player1Wins 
                  ? (gameMode === 'ai' ? 'You pulled past the finish line.' : 'Player 1 held the lead to the end.')
                  : (gameMode === 'ai' ? 'AI dragged the rope across the threshold.' : 'Player 2 took the final pull.')}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-white">
                <span className="px-3 py-2 rounded-lg text-white" style={{ backgroundColor: '#35679B', border: '2px solid #FFD700' }}>
                  {player1Label}: {Math.floor(userScore)}
                </span>
                <span className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F1F2F6', border: '2px solid #FFD700', color: '#2D3540' }}>
                  {player2Label}: {Math.floor(aiScore)}
                </span>
              </div>
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-8 py-4 font-semibold rounded-xl transition-colors text-lg shadow-lg border"
                  style={{ backgroundColor: '#FFD700', border: '2px solid #FFD700', outline: 'none', color: '#1A3B58' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFE500'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFD700'
                  }}
                >
                  Play again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
