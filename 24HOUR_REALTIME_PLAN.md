# 24-Hour Real-Time AR Clothing Hackathon Plan
## Using Meshcapade + MediaPipe Hybrid Approach

---

## Core Concept

**One-time setup**: Meshcapade API creates accurate 3D body mesh from photo  
**Real-time updates**: MediaPipe tracks pose at 30fps, transforms mesh accordingly  
**Result**: Real-time AR clothing overlay with accurate body shape

---

## Hour-by-Hour Breakdown

### **Hours 0-2: Project Setup**
- [ ] Initialize React/Vite project
- [ ] Set up backend (Node.js/Express)
- [ ] Install dependencies:
  - `@mediapipe/pose`
  - `three`
  - `@react-three/fiber` (optional, but helpful)
  - `express`
  - `axios` or `fetch`

### **Hours 2-5: Meshcapade Backend Integration**
- [ ] Create backend endpoint: `POST /api/capture-photo`
- [ ] Upload photo to Meshcapade API
- [ ] Poll for avatar creation status
- [ ] Download mesh when ready (glTF/GLB format)
- [ ] Return mesh to frontend
- [ ] **Test**: Should be able to create mesh from photo

### **Hours 5-8: Frontend Camera & Photo Capture**
- [ ] Set up camera access (getUserMedia)
- [ ] Display camera feed in UI
- [ ] "Capture Photo" button
- [ ] Send photo to backend
- [ ] Show loading state while mesh is being created
- [ ] **Test**: Take photo → wait → get mesh response

### **Hours 8-11: MediaPipe Integration**
- [ ] Initialize MediaPipe Pose in frontend
- [ ] Process camera frames (every ~33ms for 30fps)
- [ ] Extract 33 body landmarks
- [ ] Display landmarks overlay (for debugging)
- [ ] **Test**: Should see pose landmarks on video feed

### **Hours 11-16: Mesh Loading & Basic Scene** ⚠️ **CRITICAL**
- [ ] Load Meshcapade mesh into Three.js
- [ ] Set up Three.js scene with camera
- [ ] Match camera projection to video feed
- [ ] Render mesh on top of video (compositing)
- [ ] **Test**: Mesh should appear overlaid on video

### **Hours 16-22: Mesh Transformation System** 🔥 **MOST DIFFICULT**
This is the core challenge. Need to animate Meshcapade mesh using MediaPipe landmarks.

**Approach A: Direct Joint Mapping (Recommended for hackathon)**
- [ ] Map MediaPipe landmarks to SMPL joint indices
- [ ] Calculate joint rotations from landmark positions
- [ ] Update Three.js bone rotations
- [ ] Test with simple poses (arms up, etc.)

**Approach B: Simplified Transform (Fallback if A fails)**
- [ ] Use MediaPipe 3D landmarks directly
- [ ] Transform mesh vertices based on landmark positions
- [ ] Use Three.js morph targets or vertex shader
- [ ] Less accurate but faster to implement

**Key Code Structure:**
```javascript
function updateMeshFromLandmarks(mesh, landmarks) {
  // Extract 3D positions from MediaPipe
  const leftShoulder = landmarks[11]; // 3D position
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  // ... etc
  
  // Calculate bone rotations
  // Update Three.js skeleton
  mesh.skeleton.bones.forEach(bone => {
    // Update rotation based on landmark positions
  });
}
```

- [ ] Add smoothing to reduce jitter
- [ ] **Test**: Mesh should follow body movements

### **Hours 22-26: Clothing Overlay** 
- [ ] Load clothing 3D model (glTF)
- [ ] Position clothing relative to body mesh
- [ ] Attach clothing to mesh joints (parent to bones)
- [ ] Scale clothing based on body size
- [ ] Test with one clothing item

### **Hours 26-28: UI & Polish**
- [ ] Add clothing selector
- [ ] Improve camera controls
- [ ] Better loading states
- [ ] Error handling
- [ ] Basic styling

### **Hours 28-30: Testing & Bug Fixes**
- [ ] Test on different devices
- [ ] Fix major bugs
- [ ] Optimize performance
- [ ] Prepare demo

---

## Technical Implementation Details

### **1. MediaPipe to SMPL Joint Mapping**

MediaPipe provides 33 landmarks. Key ones for clothing:
- 11: Left shoulder
- 12: Right shoulder  
- 23: Left hip
- 24: Right hip
- 13-16: Left arm
- 17-20: Right arm
- 25-28: Left leg
- 29-32: Right leg

SMPL mesh has ~24 joints. Need to map landmarks to joints.

### **2. Three.js Mesh Animation**

```javascript
// Load SMPL mesh (from Meshcapade)
const loader = new GLTFLoader();
loader.load(meshUrl, (gltf) => {
  const mesh = gltf.scene;
  const skeleton = mesh.skeleton;
  
  // Update joints based on MediaPipe landmarks
  function animate() {
    const landmarks = mediaPipeResults.poseLandmarks;
    
    // Update each joint
    updateJointRotation(skeleton.bones[LEFT_SHOULDER], landmarks[11]);
    updateJointRotation(skeleton.bones[RIGHT_SHOULDER], landmarks[12]);
    // ... etc
    
    skeleton.update();
  }
  
  // Call on each MediaPipe frame
  setInterval(animate, 33); // ~30fps
});
```

### **3. Camera Calibration**

Match Three.js camera to webcam:
```javascript
const camera = new THREE.PerspectiveCamera(
  50, // FOV - estimate from video dimensions
  videoWidth / videoHeight,
  0.1,
  1000
);

// Position camera to match webcam view
camera.position.set(0, 1.6, 5); // Adjust based on setup
```

### **4. Compositing (Video + 3D)**

Two approaches:

**A. Render to texture (simpler)**
```javascript
// Render video to canvas
const videoTexture = new THREE.VideoTexture(video);
const backgroundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ map: videoTexture })
);
scene.add(backgroundPlane);
scene.add(clothedMesh); // Render on top
```

**B. WebGL render target (more complex, better quality)**
- Render 3D scene to texture
- Composite with video using Canvas API
- Better for alpha blending

---

## Critical Success Factors

### **Must Work:**
1. ✅ Meshcapade API integration
2. ✅ MediaPipe pose detection
3. ✅ Mesh transformation (even if basic)
4. ✅ Clothing appears on mesh

### **Nice to Have:**
- Smooth mesh animation
- Multiple clothing items
- Better lighting
- Size adjustment

---

## Backup Plans

### **If Mesh Transformation Fails:**
- Fall back to static mesh overlay
- Use MediaPipe landmarks to position clothing directly (no mesh deformation)
- Still impressive for hackathon demo

### **If Real-Time Too Slow:**
- Reduce frame rate to 15fps
- Update pose every 2-3 frames
- Add motion blur to hide jitter

### **If Meshcapade API Too Slow:**
- Pre-generate a few sample meshes
- Use those for demo
- Show "mesh generation" as future feature

---

## Expected Demo Flow

1. **User opens app** → Camera feed starts
2. **User clicks "Start"** → Takes photo
3. **Loading screen** → "Creating your 3D avatar..." (5-10 seconds)
4. **Mesh appears** → Overlaid on camera feed
5. **Real-time tracking** → Mesh follows body movements
6. **Select clothing** → Choose from dropdown
7. **Clothing appears** → On body mesh, moves with you
8. **Switch items** → Try different clothes

---

## Performance Targets

- **Frame Rate**: 20-30 FPS (acceptable for hackathon)
- **Mesh Creation**: 5-15 seconds (first time)
- **Pose Detection**: < 33ms per frame
- **Mesh Update**: < 16ms per frame
- **Rendering**: < 16ms per frame

---

## Key Dependencies

**Frontend:**
- `@mediapipe/pose` - Real-time pose detection
- `three` - 3D rendering
- `@react-three/fiber` - React + Three.js integration (optional)
- React (or vanilla JS)

**Backend:**
- Express.js
- Axios/fetch
- Meshcapade API key

**Assets:**
- At least 1 clothing 3D model (glTF format)
- Pre-made if possible, or use simple test model

---

## Potential Issues & Solutions

### **Issue 1: Mesh transformation janky**
- **Solution**: Add smoothing/interpolation between frames
- Use exponential moving average for joint rotations

### **Issue 2: Clothing doesn't fit**
- **Solution**: Simple scaling based on shoulder/hip width
- Hard-code a few size presets

### **Issue 3: Performance too slow**
- **Solution**: Reduce mesh complexity (decimation)
- Update pose every other frame
- Use lower resolution camera feed

### **Issue 4: Lighting looks off**
- **Solution**: Use simple ambient + directional light
- Match light direction to camera (basic estimation)

---

## Success Criteria for 24-Hour Version

✅ **Must Have:**
- Camera feed working
- Photo → 3D mesh creation
- Real-time pose detection
- Mesh visible and follows basic movements
- At least 1 clothing item overlay

✅ **Nice to Have:**
- Smooth mesh animation
- Multiple clothing items
- Better visual quality
- Size adjustment

---

## Resources

- MediaPipe Pose: https://google.github.io/mediapipe/solutions/pose
- Three.js Documentation: https://threejs.org/docs/
- SMPL Model Info: https://smpl.is.tue.mpg.de/
- Meshcapade API Docs: (provided by user)

---

## Final Notes

This is ambitious but **doable** if you focus on the core feature: real-time mesh transformation. That's the hardest part. Once that works, everything else is relatively straightforward.

**Priority order:**
1. Meshcapade integration (get mesh)
2. MediaPipe integration (get pose)
3. **Mesh transformation** (core challenge)
4. Clothing overlay (easier once mesh works)
5. Polish (if time permits)

Good luck! 🚀