import * as THREE from 'three'
// GLTFLoader will be used when loading actual 3D models
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class ClothingManager {
  constructor(scene) {
    this.scene = scene
    this.currentClothing = null
    this.clothingMesh = null
    this.videoAspect = 16/9 // Will be updated from renderer
    // GLTFLoader will be initialized when we load actual 3D models
    // this.loader = new GLTFLoader()
    
    // Default clothing materials (PBR)
    this.defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: false, // Ensure it's not transparent
      opacity: 1.0 // Fully opaque
    })
  }

  setVideoAspect(aspect) {
    this.videoAspect = aspect
  }

  async loadClothing(clothingItem) {
    console.log('loadClothing called with:', clothingItem)
    
    // Remove existing clothing
    this.removeClothing()

    if (!clothingItem) {
      console.log('No clothing item provided')
      return
    }

    // For now, create a simple placeholder mesh
    // In production, this would load a glTF model
    this.createPlaceholderClothing(clothingItem)
    
    this.currentClothing = clothingItem
    console.log('Clothing loaded successfully:', {
      type: clothingItem.type,
      name: clothingItem.name,
      hasMesh: !!this.clothingMesh
    })
  }

  createPlaceholderClothing(clothingItem) {
    // Create a simple mesh based on clothing type
    // This is a placeholder - in production, load actual 3D models
    
    let geometry
    let material = this.defaultMaterial.clone()

    switch (clothingItem.type) {
      case 'shirt':
      case 'tshirt':
        geometry = this.createShirtGeometry()
        material.color.setHex(0x4a90e2) // Bright blue for visibility
        break
      case 'jacket':
        geometry = this.createJacketGeometry()
        material.color.setHex(0x3498db) // Lighter blue for visibility
        break
      case 'hoodie':
        geometry = this.createHoodieGeometry()
        material.color.setHex(0x9b59b6) // Purple for visibility
        break
      case 'dress':
        geometry = this.createDressGeometry()
        material.color.setHex(0xe74c3c) // Bright red for visibility
        break
      default:
        geometry = this.createShirtGeometry()
        material.color.setHex(0x2ecc71) // Bright green for visibility
    }
    
    // Ensure material is visible
    material.needsUpdate = true

    this.clothingMesh = new THREE.Mesh(geometry, material)
    this.clothingMesh.castShadow = true
    this.clothingMesh.receiveShadow = true
    this.clothingMesh.visible = false // Hidden until body is detected
    this.clothingMesh.renderOrder = 999 // Ensure it renders on top
    this.clothingMesh.frustumCulled = false // Don't cull when outside view
    this.scene.add(this.clothingMesh)
    console.log('Placeholder clothing mesh created:', {
      type: clothingItem.type,
      geometry: geometry.type,
      visible: this.clothingMesh.visible
    })
  }

  createShirtGeometry() {
    // Create a simple shirt shape
    const shape = new THREE.Shape()
    
    // Torso outline
    shape.moveTo(-0.3, 0.3)  // Left shoulder
    shape.lineTo(0.3, 0.3)   // Right shoulder
    shape.lineTo(0.35, 0.1)  // Right side
    shape.lineTo(0.35, -0.2) // Right bottom
    shape.lineTo(-0.35, -0.2) // Left bottom
    shape.lineTo(-0.35, 0.1)  // Left side
    shape.closePath()

    // Extrude to create 3D shape
    const extrudeSettings = {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  createJacketGeometry() {
    // Similar to shirt but slightly larger
    const shape = new THREE.Shape()
    shape.moveTo(-0.35, 0.35)
    shape.lineTo(0.35, 0.35)
    shape.lineTo(0.4, 0.1)
    shape.lineTo(0.4, -0.25)
    shape.lineTo(-0.4, -0.25)
    shape.lineTo(-0.4, 0.1)
    shape.closePath()

    const extrudeSettings = {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  createHoodieGeometry() {
    // Hoodie with hood shape
    const shape = new THREE.Shape()
    shape.moveTo(-0.32, 0.4)  // Left top (hood)
    shape.lineTo(0.32, 0.4)   // Right top (hood)
    shape.lineTo(0.35, 0.3)   // Right shoulder
    shape.lineTo(0.38, 0.1)   // Right side
    shape.lineTo(0.38, -0.2)  // Right bottom
    shape.lineTo(-0.38, -0.2) // Left bottom
    shape.lineTo(-0.38, 0.1)  // Left side
    shape.lineTo(-0.35, 0.3)  // Left shoulder
    shape.closePath()

    const extrudeSettings = {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  createDressGeometry() {
    // Dress shape (wider at bottom)
    const shape = new THREE.Shape()
    shape.moveTo(-0.3, 0.3)   // Left shoulder
    shape.lineTo(0.3, 0.3)    // Right shoulder
    shape.lineTo(0.35, 0.1)   // Right waist
    shape.lineTo(0.5, -0.4)   // Right bottom (wider)
    shape.lineTo(-0.5, -0.4)  // Left bottom (wider)
    shape.lineTo(-0.35, 0.1)  // Left waist
    shape.closePath()

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  updatePosition(bodyModel) {
    console.log('updatePosition called:', {
      hasMesh: !!this.clothingMesh,
      bodyDetected: bodyModel.isDetected(),
      hasClothing: this.hasClothing()
    })

    if (!this.clothingMesh || !bodyModel.isDetected()) {
      if (this.clothingMesh) {
        this.clothingMesh.visible = false
      }
      return
    }

    const keyPoints = bodyModel.getKeyPoints()
    if (!keyPoints) {
      console.log('No key points available')
      return
    }

    // Calculate position based on body landmarks
    const leftShoulder = keyPoints.leftShoulder
    const rightShoulder = keyPoints.rightShoulder
    const leftHip = keyPoints.leftHip
    const rightHip = keyPoints.rightHip

    console.log('Key points:', {
      leftShoulder: !!leftShoulder,
      rightShoulder: !!rightShoulder,
      leftHip: !!leftHip,
      rightHip: !!rightHip
    })

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      console.log('Missing required landmarks')
      this.clothingMesh.visible = false
      return
    }

    // Calculate center and scale
    const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
    const centerY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 2
    const centerZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0) + (leftHip.z || 0) + (rightHip.z || 0)) / 4

    // Calculate rotation (tilt of shoulders)
    const shoulderAngle = Math.atan2(
      rightShoulder.y - leftShoulder.y,
      rightShoulder.x - leftShoulder.x
    )

    // Position clothing - convert normalized MediaPipe coords (0-1) to Three.js coords
    // MediaPipe: (0,0) top-left, (1,1) bottom-right, Z is depth (negative = closer)
    // Three.js: center at (0,0), Y up, camera at (0,0,0) looks down -Z
    // For AR overlay, we need to position clothing in screen space
    
    // Use actual video aspect ratio
    const aspect = this.videoAspect || 16/9
    
    // Calculate Z-depth: MediaPipe Z is relative depth, negative = closer to camera
    // We want clothing to be in front of camera (negative Z in Three.js)
    // MediaPipe Z typically ranges from -0.5 to 0.5, with negative being closer
    // Convert to Three.js Z: ensure it's always negative and visible
    const mediaPipeZ = centerZ || 0
    // MediaPipe Z: negative = closer, positive = farther
    // Three.js: negative Z = in front of camera
    // So we invert: closer in MediaPipe = more negative in Three.js
    const zDepth = -2.0 + (mediaPipeZ * 1.0) // Base depth of -2, adjust based on MediaPipe Z
    
    // Convert MediaPipe normalized coords to Three.js screen space
    // For a perspective camera with FOV 50, at distance -2:
    // Horizontal range: -aspect * tan(FOV/2) * distance to +aspect * tan(FOV/2) * distance
    // Vertical range: -tan(FOV/2) * distance to +tan(FOV/2) * distance
    // FOV 50 degrees = 0.873 radians, tan(25°) ≈ 0.466
    // At distance 2: horizontal range ≈ -aspect * 0.932 to +aspect * 0.932
    //               vertical range ≈ -0.932 to +0.932
    
    const tanHalfFOV = Math.tan((50 * Math.PI / 180) / 2) // tan(25°)
    const distance = Math.abs(zDepth)
    const horizontalRange = aspect * tanHalfFOV * distance
    const verticalRange = tanHalfFOV * distance
    
    // Convert MediaPipe coords (0-1) to Three.js coords
    // X: 0 (left) to 1 (right) -> Three.js: -horizontalRange to +horizontalRange
    const xPos = (centerX - 0.5) * 2 * horizontalRange
    
    // Y: 0 (top) to 1 (bottom) -> Three.js: +verticalRange to -verticalRange (Y is up)
    const yPos = (0.5 - centerY) * 2 * verticalRange
    
    this.clothingMesh.position.set(xPos, yPos, zDepth)

    // Calculate scale based on shoulder width
    // MediaPipe coordinates are normalized (0-1), so we need a larger multiplier
    const shoulderWidth = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) +
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    )
    // Scale multiplier - MediaPipe coords are 0-1 range
    // shoulderWidth is typically 0.1-0.3 in normalized coords
    // We need to scale to match the actual screen size at the clothing's Z-depth
    // shoulderWidth in normalized coords (0-1) needs to map to actual world units
    // A typical shoulder width of 0.2 in normalized coords should map to ~0.4-0.6 in world units
    const baseScale = shoulderWidth * horizontalRange * 2.5 // Scale to match screen
    const scale = Math.max(baseScale, 0.4) // Minimum scale to ensure visibility

    // Calculate torso height for better scaling
    const torsoHeight = Math.sqrt(
      Math.pow((leftShoulder.x + rightShoulder.x) / 2 - (leftHip.x + rightHip.x) / 2, 2) +
      Math.pow((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2, 2)
    )
    // Scale height similarly to width
    const baseHeightScale = torsoHeight * verticalRange * 2.5
    const heightScale = Math.max(baseHeightScale, 0.4) // Match width scaling

    // Scale clothing - use both width and height for better fit
    // Ensure minimum scale for visibility
    const finalScale = Math.max(scale, 0.5)
    const finalHeightScale = Math.max(heightScale, 0.5)
    this.clothingMesh.scale.set(finalScale, finalHeightScale, finalScale * 0.8) // Slightly thinner in Z

    // Rotate to match body orientation
    this.clothingMesh.rotation.z = shoulderAngle

    // Make visible
    this.clothingMesh.visible = true
    
    // Log detailed positioning info
    console.log('Clothing positioned and made visible:', {
      position: { 
        x: this.clothingMesh.position.x.toFixed(3), 
        y: this.clothingMesh.position.y.toFixed(3), 
        z: this.clothingMesh.position.z.toFixed(3) 
      },
      scale: { 
        x: this.clothingMesh.scale.x.toFixed(3), 
        y: this.clothingMesh.scale.y.toFixed(3), 
        z: this.clothingMesh.scale.z.toFixed(3) 
      },
      rotation: {
        z: (this.clothingMesh.rotation.z * 180 / Math.PI).toFixed(1) + '°'
      },
      shoulderWidth: shoulderWidth.toFixed(3),
      torsoHeight: torsoHeight.toFixed(3),
      centerCoords: { x: centerX.toFixed(3), y: centerY.toFixed(3), z: centerZ.toFixed(3) },
      visible: this.clothingMesh.visible,
      renderOrder: this.clothingMesh.renderOrder
    })
  }

  hasClothing() {
    return this.clothingMesh !== null
  }

  removeClothing() {
    if (this.clothingMesh) {
      this.scene.remove(this.clothingMesh)
      this.clothingMesh.geometry.dispose()
      this.clothingMesh.material.dispose()
      this.clothingMesh = null
    }
    this.currentClothing = null
  }

  dispose() {
    this.removeClothing()
  }
}
