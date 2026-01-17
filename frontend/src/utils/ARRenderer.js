import * as THREE from 'three'

export class ARRenderer {
  constructor(canvasElement, videoElement) {
    this.canvas = canvasElement
    this.video = videoElement
    this.scene = null
    this.camera = null
    this.renderer = null
    this.composer = null
    this.isInitialized = false
    
    // Lighting
    this.ambientLight = null
    this.directionalLight = null
    this.hemisphereLight = null
  }

  async initialize() {
    try {
      // Set canvas size
      this.updateCanvasSize()

      // Create scene
      this.scene = new THREE.Scene()

      // Create camera matching video aspect ratio
      const aspect = this.canvas.width / this.canvas.height
      const fov = 50 // FOV matching typical webcam field of view
      this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000) // Wider range
      this.camera.position.set(0, 0, 0)
      this.camera.lookAt(0, 0, -1) // Look into the screen

      // Create WebGL renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
      })
      this.renderer.setSize(this.canvas.width, this.canvas.height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      // Clear to transparent so video shows through
      this.renderer.setClearColor(0x000000, 0)

      // Setup lighting
      this.setupLighting()

      // Handle window resize
      window.addEventListener('resize', () => this.updateCanvasSize())

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize AR renderer:', error)
      throw error
    }
  }

  updateCanvasSize() {
    if (this.video && this.video.videoWidth && this.video.videoHeight) {
      this.canvas.width = this.video.videoWidth
      this.canvas.height = this.video.videoHeight
    } else {
      // Default size
      this.canvas.width = 1280
      this.canvas.height = 720
    }

    if (this.renderer) {
      this.renderer.setSize(this.canvas.width, this.canvas.height)
    }

    if (this.camera) {
      this.camera.aspect = this.canvas.width / this.canvas.height
      this.camera.updateProjectionMatrix()
    }
  }

  setupLighting() {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    // Hemisphere light for natural sky/ground lighting
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    this.hemisphereLight.position.set(0, 1, 0)
    this.scene.add(this.hemisphereLight)

    // Directional light (sun) - will be adjusted based on video lighting
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(5, 10, 5)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.directionalLight.shadow.camera.left = -10
    this.directionalLight.shadow.camera.right = 10
    this.directionalLight.shadow.camera.top = 10
    this.directionalLight.shadow.camera.bottom = -10
    this.scene.add(this.directionalLight)
  }

  estimateLightingFromVideo() {
    if (!this.video || !this.video.videoWidth) return

    // Create temporary canvas to analyze video frame
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.min(this.video.videoWidth, 320)
    tempCanvas.height = Math.min(this.video.videoHeight, 240)
    const ctx = tempCanvas.getContext('2d')
    ctx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height)

    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const data = imageData.data

    // Calculate average brightness
    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      totalBrightness += (r + g + b) / 3
    }
    const avgBrightness = totalBrightness / (data.length / 4)

    // Adjust ambient light intensity based on video brightness
    const normalizedBrightness = avgBrightness / 255
    this.ambientLight.intensity = 0.3 + normalizedBrightness * 0.3
    this.hemisphereLight.intensity = 0.4 + normalizedBrightness * 0.4
  }

  render(bodyModel, clothingManager) {
    if (!this.isInitialized) return

    // Update canvas size if video dimensions changed
    this.updateCanvasSize()

    // Clear the canvas to transparent
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear()

    // Estimate lighting from video
    this.estimateLightingFromVideo()

    // Update camera to match body model position
    // For AR overlay, camera should stay at origin looking forward
    // The clothing is positioned in screen space, so camera should be fixed
    this.camera.position.set(0, 0, 0)
    this.camera.lookAt(0, 0, -1) // Always look into the screen (negative Z)
    
    // Update camera aspect ratio if video dimensions changed
    if (this.video && this.video.videoWidth && this.video.videoHeight) {
      const aspect = this.video.videoWidth / this.video.videoHeight
      if (Math.abs(this.camera.aspect - aspect) > 0.01) {
        this.camera.aspect = aspect
        this.camera.updateProjectionMatrix()
        // Update clothing manager with new aspect ratio
        if (clothingManager && typeof clothingManager.setVideoAspect === 'function') {
          clothingManager.setVideoAspect(aspect)
        }
      }
    }

    // Always render the scene (clothing visibility is controlled by mesh.visible)
    // This ensures the clothing appears when it becomes visible
    this.renderer.render(this.scene, this.camera)
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera
  }

  getVideoElement() {
    return this.video
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    this.scene = null
    this.camera = null
    this.isInitialized = false
  }
}
