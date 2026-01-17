import { useState } from 'react'
import ARClothingViewer from './components/ARClothingViewer'
import ClothingSelector from './components/ClothingSelector'

function App() {
  const [selectedClothing, setSelectedClothing] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AR Clothing Try-On
          </h1>
          <p className="text-gray-300">
            Realistic virtual clothing overlay using AR technology
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main AR Viewer */}
          <div className="flex-1">
            <ARClothingViewer
              selectedClothing={selectedClothing}
              isCameraActive={isCameraActive}
              setIsCameraActive={setIsCameraActive}
            />
          </div>

          {/* Clothing Selector Sidebar */}
          <div className="w-full lg:w-80">
            <ClothingSelector
              selectedClothing={selectedClothing}
              onSelectClothing={setSelectedClothing}
              isCameraActive={isCameraActive}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
