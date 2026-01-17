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
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">Tongue Movements</div>
        <div className="text-6xl font-bold text-white mb-4">{count}</div>
        <div className={`text-lg font-semibold ${getStateColor()}`}>
          {getStateLabel()}
        </div>
      </div>
    </div>
  )
}
