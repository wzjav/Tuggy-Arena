import { useState } from 'react'

const CLOTHING_ITEMS = [
  {
    id: 'tshirt-1',
    name: 'Classic T-Shirt',
    type: 'shirt',
    category: 'tops',
    thumbnail: '👕',
    description: 'A comfortable classic t-shirt'
  },
  {
    id: 'jacket-1',
    name: 'Denim Jacket',
    type: 'jacket',
    category: 'tops',
    thumbnail: '🧥',
    description: 'Stylish denim jacket'
  },
  {
    id: 'hoodie-1',
    name: 'Hoodie',
    type: 'hoodie',
    category: 'tops',
    thumbnail: '👔',
    description: 'Warm and cozy hoodie'
  },
  {
    id: 'dress-1',
    name: 'Summer Dress',
    type: 'dress',
    category: 'dresses',
    thumbnail: '👗',
    description: 'Light and breezy summer dress'
  }
]

function ClothingSelector({ selectedClothing, onSelectClothing, isCameraActive }) {
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredItems = categoryFilter === 'all'
    ? CLOTHING_ITEMS
    : CLOTHING_ITEMS.filter(item => item.category === categoryFilter)

  const categories = ['all', ...new Set(CLOTHING_ITEMS.map(item => item.category))]

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">Select Clothing</h2>

      {!isCameraActive && (
        <div className="mb-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded text-yellow-200 text-sm">
          ⚠️ Start camera to see clothing overlay
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Clothing Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => onSelectClothing(item)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedClothing?.id === item.id
                ? 'border-blue-500 bg-blue-900 bg-opacity-30'
                : 'border-gray-700 bg-gray-700 hover:border-gray-600 hover:bg-gray-600'
            }`}
          >
            <div className="text-4xl mb-2">{item.thumbnail}</div>
            <div className="text-white font-medium text-sm mb-1">{item.name}</div>
            <div className="text-gray-400 text-xs">{item.description}</div>
          </button>
        ))}
      </div>

      {selectedClothing && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <button
            onClick={() => onSelectClothing(null)}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Remove Clothing
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-3 bg-gray-700 rounded text-xs text-gray-400">
        <p className="mb-2">
          <strong className="text-gray-300">Tips:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Stand in good lighting</li>
          <li>Keep your full body in frame</li>
          <li>Move slowly for best results</li>
        </ul>
      </div>
    </div>
  )
}

export default ClothingSelector
