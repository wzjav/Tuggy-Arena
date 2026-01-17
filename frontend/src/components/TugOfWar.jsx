import { useEffect, useRef } from 'react'

/**
 * Tug of War Game Component
 * Displays two characters pulling a rope, with position based on score difference
 */
export default function TugOfWar({ userScore, aiScore, onReset }) {
  const ropeRef = useRef(null)
  const userCharRef = useRef(null)
  const aiCharRef = useRef(null)

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

  const ropePosition = calculateRopePosition()
  const userWins = ropePosition <= 10
  const aiWins = ropePosition >= 90

  // Animate rope position smoothly
  useEffect(() => {
    if (ropeRef.current) {
      ropeRef.current.style.left = `${ropePosition}%`
    }
  }, [ropePosition])

  // Animate character positions
  useEffect(() => {
    if (userCharRef.current && aiCharRef.current) {
      // User character moves left when winning (rope moves left towards user)
      // When ropePosition < 50 (user winning), user moves left (negative)
      const userOffset = (50 - ropePosition) * 0.3
      userCharRef.current.style.transform = `translateX(${userOffset}px)`
      
      // AI character moves right when winning (rope moves right towards AI)
      // When ropePosition > 50 (AI winning), AI moves right (positive)
      const aiOffset = (ropePosition - 50) * 0.3
      aiCharRef.current.style.transform = `translateX(${aiOffset}px)`
    }
  }, [ropePosition])

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
          <div className="text-lg text-gray-500">Tug of War</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">AI</div>
          <div className="text-3xl font-bold text-red-400">{Math.floor(aiScore)}</div>
        </div>
      </div>

      {/* Game Arena */}
      <div className="relative bg-gray-900 rounded-lg p-8 h-64 overflow-hidden">
        {/* Center Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500 transform -translate-x-1/2 z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
            CENTER
          </div>
        </div>

        {/* Win Threshold Lines */}
        <div className="absolute left-[10%] top-0 bottom-0 w-0.5 bg-green-500 opacity-50 transform -translate-x-1/2 z-5">
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-green-400 text-xs font-semibold">
            YOU WIN
          </div>
        </div>
        <div className="absolute left-[90%] top-0 bottom-0 w-0.5 bg-red-500 opacity-50 transform -translate-x-1/2 z-5">
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-red-400 text-xs font-semibold">
            AI WINS
          </div>
        </div>

        {/* User Character (Left Side) */}
        <div
          ref={userCharRef}
          className="absolute left-8 top-1/2 transform -translate-y-1/2 transition-transform duration-300 ease-out z-20"
        >
          <div className="flex flex-col items-center">
            {/* Character Body */}
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-4 border-blue-600">
              <span className="text-2xl">😊</span>
            </div>
            {/* Character Arms (pulling) */}
            <div className="mt-2 flex gap-1">
              <div className="w-2 h-8 bg-blue-400 rounded"></div>
              <div className="w-2 h-8 bg-blue-400 rounded"></div>
            </div>
          </div>
        </div>

        {/* AI Character (Right Side) */}
        <div
          ref={aiCharRef}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 transition-transform duration-300 ease-out z-20"
        >
          <div className="flex flex-col items-center">
            {/* Character Body */}
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-4 border-red-600">
              <span className="text-2xl">🤖</span>
            </div>
            {/* Character Arms (pulling) */}
            <div className="mt-2 flex gap-1">
              <div className="w-2 h-8 bg-red-400 rounded"></div>
              <div className="w-2 h-8 bg-red-400 rounded"></div>
            </div>
          </div>
        </div>

        {/* Rope */}
        <div className="absolute top-1/2 left-0 right-0 h-2 transform -translate-y-1/2 z-15">
          {/* Rope segments */}
          <div
            ref={ropeRef}
            className="absolute h-full transition-all duration-300 ease-out"
            style={{
              width: `${100 - ropePosition}%`,
              left: `${ropePosition}%`,
              background: 'linear-gradient(to right, #8B4513, #A0522D, #8B4513)',
              borderTop: '2px solid #654321',
              borderBottom: '2px solid #654321',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {/* Rope texture */}
            <div className="absolute inset-0 bg-repeat-x opacity-30" style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)'
            }}></div>
          </div>
          
          {/* Rope handle/knot at center point */}
          <div
            className="absolute w-6 h-6 bg-yellow-600 rounded-full border-2 border-yellow-700 transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-20"
            style={{
              left: `${ropePosition}%`,
              top: '50%',
            }}
          >
            <div className="absolute inset-1 bg-yellow-500 rounded-full"></div>
          </div>
        </div>

        {/* Win/Lose Overlay */}
        {(userWins || aiWins) && (
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
