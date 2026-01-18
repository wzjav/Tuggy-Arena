# Tuggy Arena 🎮👅

A fun and interactive tongue-controlled tug-of-war game built with React, MediaPipe, and 3D graphics. Control your character by sticking out your tongue in different directions!

## 🎯 Features

- **Tongue Detection**: Real-time tongue tracking using MediaPipe Face Mesh
- **Two Game Modes**:
  - **AI Mode**: Play against an adaptive AI opponent that gets more challenging as you progress
  - **Human vs Human Mode**: Play with a friend using dual face detection
- **3D Visualization**: Beautiful 3D tug-of-war scene rendered with Babylon.js
- **Responsive Controls**: Smooth tongue movement detection with configurable thresholds
- **Score Tracking**: Real-time score display and game state management

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A webcam for tongue detection

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Tuggy-Arena
```

2. Navigate to the frontend directory:
```bash
cd frontend
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

6. Allow camera access when prompted

## 🎮 How to Play

1. **Select Game Mode**: Choose between AI opponent or Human vs Human mode
2. **Position Yourself**: Make sure your face is clearly visible in the camera
3. **Control Your Character**: 
   - Stick your tongue out to the **left** to move your character left
   - Stick your tongue out to the **right** to move your character right
   - Keep your tongue in the center for neutral position
4. **Win the Game**: Pull the rope to your side by controlling your tongue movements!

## 🛠️ Technology Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **3D Graphics**: Babylon.js 7
- **Computer Vision**: MediaPipe Face Mesh
- **Styling**: Tailwind CSS
- **Additional Libraries**:
  - MediaPipe Pose and Selfie Segmentation

## 📁 Project Structure

```
Tuggy-Arena/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TongueGame.jsx      # Main game component
│   │   │   └── TugOfWar3D.jsx      # 3D visualization component
│   │   ├── hooks/
│   │   │   ├── useTongueDetection.js          # Single player tongue detection
│   │   │   └── useDualTongueDetection.js      # Dual player detection
│   │   ├── utils/
│   │   │   ├── aiOpponent.js       # AI opponent logic
│   │   │   ├── faceDetection.js    # Face detection utilities
│   │   │   ├── tongueDetector.js   # Tongue detection core
│   │   │   ├── tongueTracker.js    # Tongue movement tracking
│   │   │   └── movementCounter.js  # Movement counting logic
│   │   ├── App.jsx                 # Root component
│   │   └── main.jsx                # Entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🎨 Game Mechanics

### Tongue Detection
- Uses MediaPipe Face Mesh to detect facial landmarks
- Tracks tongue position relative to face center
- Applies smoothing and confidence thresholds for accurate detection
- Supports configurable sensitivity settings

### AI Opponent
- Adaptive difficulty that increases with player score
- Randomized timing for natural gameplay
- Configurable base rate and randomness parameters

### Scoring System
- Points are awarded based on tongue movement direction
- Real-time score updates
- Game ends when a player reaches the target score

## 🔧 Configuration

You can adjust game parameters in the component files:

- **Tongue Detection Sensitivity**: Modify thresholds in `useTongueDetection.js` and `useDualTongueDetection.js`
- **AI Difficulty**: Adjust parameters in `aiOpponent.js`
- **3D Scene**: Customize visuals in `TugOfWar3D.jsx`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may have limited camera support)

**Note**: Camera access is required for the game to function. Make sure to grant camera permissions when prompted.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is part of the NUS Hack & Roll hackathon.

## 🐛 Troubleshooting

### Camera not working
- Ensure you've granted camera permissions in your browser
- Check that no other application is using your camera
- Try refreshing the page

### Detection not accurate
- Ensure good lighting conditions
- Position yourself so your face is clearly visible
- Adjust detection thresholds in the code if needed

### Performance issues
- Close other applications using your camera
- Reduce browser extensions that might interfere
- Try a different browser

---

**Have fun playing Tuggy Arena!** 🎉
