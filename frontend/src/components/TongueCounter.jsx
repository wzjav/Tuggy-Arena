/**
 * Tongue Counter Display Component
 */
export default function TongueCounter({ count, tongueState }) {
  const getStateColor = () => {
    switch (tongueState) {
      case 'LEFT':
        return 'text-blue-400'
      case 'RIGHT':
        return 'text-red-400'
      case 'CENTER':
      default:
        return 'text-gray-400'
    }
  }

  const getStateLabel = () => {
    switch (tongueState) {
      case 'LEFT':
        return '← LEFT'
      case 'RIGHT':
        return 'RIGHT →'
      case 'CENTER':
      default:
        return 'CENTER'
    }
  }

  return (
    <div className="bg-black bg-opacity-70 rounded-lg p-4 shadow-lg backdrop-blur-sm">
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-1">Tongue Movements</div>
        <div className="text-4xl font-bold text-white mb-2">{count}</div>
        <div className={`text-sm font-semibold ${getStateColor()}`}>
          {getStateLabel()}
        </div>
      </div>
    </div>
  )
}
