# AR Clothing Try-On Platform

A web-based AR platform that realistically overlays clothing on users detected via camera, creating a seamless "virtual try-on" experience.

## Features

- Real-time human pose detection using MediaPipe
- Body segmentation for accurate overlay
- 3D clothing rendering with Three.js
- Realistic lighting and shadows
- Multiple clothing types (shirts, jackets, hoodies, dresses)
- Responsive UI with Tailwind CSS

## Technology Stack

- **React 19** - Frontend framework
- **Vite** - Build tool
- **MediaPipe** - Pose detection and body segmentation
- **Three.js** - 3D rendering engine
- **Tailwind CSS** - Styling

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with camera access
- Webcam/camera for testing

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown (typically `http://localhost:5173`)

5. Click "Start Camera" to begin the AR try-on experience

## Usage

1. **Start Camera**: Click the "Start Camera" button to activate your webcam
2. **Select Clothing**: Choose a clothing item from the sidebar
3. **Position Yourself**: Stand in front of the camera with your full body visible
4. **Try-On**: The clothing will automatically overlay on your body as detected
5. **Switch Items**: Select different clothing items to try them on
6. **Stop Camera**: Click "Stop Camera" when finished

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ARClothingViewer.jsx    # Main AR viewer component
│   │   └── ClothingSelector.jsx    # Clothing selection UI
│   ├── hooks/
│   │   └── useARClothing.js        # Custom hook for AR functionality
│   ├── utils/
│   │   ├── poseDetection.js        # MediaPipe pose detection wrapper
│   │   ├── ARRenderer.js           # Three.js rendering engine
│   │   ├── BodyModel.js            # 3D body model representation
│   │   └── ClothingManager.js      # Clothing loading and positioning
│   ├── App.jsx                      # Main app component
│   ├── App.css                      # App-specific styles
│   ├── main.jsx                     # Entry point
│   └── index.css                    # Global styles
├── package.json
└── vite.config.js
```

## How It Works

1. **Camera Feed**: Accesses user's webcam via WebRTC/MediaStream API
2. **Pose Detection**: MediaPipe processes each video frame to detect human pose landmarks
3. **Body Segmentation**: Separates the person from the background
4. **3D Body Model**: Creates a 3D representation from detected landmarks
5. **Clothing Overlay**: Positions and scales 3D clothing models on the body
6. **Rendering**: Three.js renders the clothing with realistic lighting and shadows
7. **Compositing**: Blends the 3D clothing with the live video feed

## Current Implementation Status

### ✅ Completed
- React app structure
- Camera access and video feed
- MediaPipe pose detection integration
- Basic body model mapping
- Three.js scene setup
- Clothing placeholder system
- UI components

### 🚧 In Progress / Future Enhancements
- Loading actual 3D clothing models (glTF format)
- Advanced cloth physics simulation
- Improved lighting estimation from video
- Better clothing fitting algorithms
- Performance optimizations
- Mobile device support improvements

## Performance Notes

- Target: 30+ FPS on modern devices
- Optimizations: Frame skipping, efficient rendering, Web Workers for heavy computations
- Browser compatibility: Chrome, Firefox, Safari, Edge (latest versions)

## Browser Permissions

The app requires camera access. When prompted:
- Click "Allow" to grant camera permissions
- Ensure your browser supports WebRTC/MediaStream API

## Troubleshooting

### Camera not working
- Check browser permissions
- Ensure no other app is using the camera
- Try refreshing the page

### Low performance
- Close other browser tabs
- Reduce camera resolution in browser settings
- Use a device with better GPU

### Clothing not appearing
- Ensure full body is visible in frame
- Check lighting conditions
- Stand still for a moment to allow detection

## Development

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Lint code
```bash
npm run lint
```

## License

MIT

## Notes

- This is a prototype implementation
- For production use, integrate actual 3D clothing models
- Consider adding cloth physics for more realistic movement
- Performance optimizations may be needed for lower-end devices
