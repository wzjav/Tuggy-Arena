import { useEffect, useRef, useState, useCallback } from 'react'
import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, Animation } from '@babylonjs/core'

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
export default function TugOfWar3D({ userScore, aiScore, gameOver, onReset }) {
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
  // Win threshold: 10% (user wins) or 90% (AI wins)
  // User is on LEFT (lower %), AI is on RIGHT (higher %)
  const calculateRopePosition = () => {
    const scoreDifference = userScore - aiScore
    const maxScoreDifference = 20 // Maximum expected score difference for full rope movement
    
    // Center at 50%, move ±40% based on score difference
    // When userScore > aiScore (positive difference), rope moves LEFT (lower %)
    // When userScore < aiScore (negative difference), rope moves RIGHT (higher %)
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
        setWinner('user')
      } else if (frozenPos >= 90) {
        setWinner('ai')
      } else {
        const scoreDifference = userScore - aiScore
        if (scoreDifference > 0) {
          setWinner('user')
        } else {
          setWinner('ai')
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
    groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2)
    ground.material = groundMaterial
    ground.position.y = 0

    // Create center line marker
    const centerLine = MeshBuilder.CreateBox('centerLine', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const centerLineMaterial = new StandardMaterial('centerLineMat', scene)
    centerLineMaterial.diffuseColor = new Color3(1, 1, 0) // Yellow
    centerLine.material = centerLineMaterial
    centerLine.position.x = 0
    centerLine.position.y = 0.25

    // Create win threshold markers
    const userWinMarker = MeshBuilder.CreateBox('userWinMarker', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const userWinMaterial = new StandardMaterial('userWinMat', scene)
    userWinMaterial.diffuseColor = new Color3(0, 1, 0) // Green
    userWinMarker.material = userWinMaterial
    userWinMarker.position.x = -9 // 10% of 30 units = -9 (left side)
    userWinMarker.position.y = 0.25

    const aiWinMarker = MeshBuilder.CreateBox('aiWinMarker', { width: 0.1, height: 0.5, depth: 30 }, scene)
    const aiWinMaterial = new StandardMaterial('aiWinMat', scene)
    aiWinMaterial.diffuseColor = new Color3(1, 0, 0) // Red
    aiWinMarker.material = aiWinMaterial
    aiWinMarker.position.x = 9 // 90% of 30 units = 9 (right side)
    aiWinMarker.position.y = 0.25

    // Create user character (left side, blue)
    const userChar = createCharacter(scene, new Color3(0.2, 0.5, 1), 'user')
    userChar.position.x = -12
    userChar.position.y = 2
    userCharRef.current = userChar

    // Create AI character (right side, red)
    const aiChar = createCharacter(scene, new Color3(1, 0.2, 0.2), 'ai')
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
    knotMaterial.diffuseColor = new Color3(0.8, 0.6, 0.2) // Gold/yellow
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

  const userWins = gameOver
    ? (winner === 'user' || (winner === null && ropePosition <= 10))
    : ropePosition <= 10
  const aiWins = gameOver
    ? (winner === 'ai' || (winner === null && ropePosition >= 90))
    : ropePosition >= 90

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-4xl">
      {/* Score Display */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">You</div>
          <div className="text-3xl font-bold text-blue-400">{Math.floor(userScore)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">VS</div>
          <div className="text-lg text-gray-500">3D Tug of War</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">AI</div>
          <div className="text-3xl font-bold text-red-400">{Math.floor(aiScore)}</div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ height: '500px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ outline: 'none' }}
        />

        {/* Win/Lose Overlay */}
        {gameOver && (winner !== null || ropePosition <= 10 || ropePosition >= 90) && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30 rounded-lg">
            <div className="text-center">
              <div className={`text-6xl mb-4 ${userWins ? 'text-green-400' : 'text-red-400'}`}>
                {userWins ? '🎉' : '😢'}
              </div>
              <div className={`text-4xl font-bold mb-4 ${userWins ? 'text-green-400' : 'text-red-400'}`}>
                {userWins ? 'YOU WIN!' : 'AI WINS!'}
              </div>
              <div className="text-xl text-gray-300 mb-6">
                {userWins ? 'Great job pulling!' : 'Better luck next time!'}
              </div>
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-400">
        Move your tongue left and right to pull the rope to your side!
      </div>
    </div>
  )
}
