import TongueGame from './components/TongueGame'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Tongue Tug of War
          </h1>
          <p className="text-gray-300">
            Pull the rope to your side by moving your tongue left and right!
          </p>
        </header>

        <TongueGame />
      </div>
    </div>
  )
}

export default App
