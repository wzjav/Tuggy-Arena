import { FaceMesh } from '@mediapipe/face_mesh'

/**
 * Face Detection Module using MediaPipe Face Mesh
 * Detects facial landmarks and extracts mouth region
 */
export class FaceDetector {
  constructor() {
    this.faceMesh = null
    this.isInitialized = false
    this.onResultsCallback = null
  }

  /**
   * Initialize MediaPipe Face Mesh
   */
  async initialize(onResults) {
    this.onResultsCallback = onResults

    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      }
    })

    this.faceMesh.setOptions({
      maxNumFaces: 2, // Support up to 2 faces for multiplayer mode
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    this.faceMesh.onResults((results) => {
      if (this.onResultsCallback) {
        this.onResultsCallback(results)
      }
    })

    this.isInitialized = true
  }

  /**
   * Process a video frame
   */
  async send(imageElement) {
    if (!this.isInitialized || !this.faceMesh) {
      throw new Error('FaceDetector not initialized')
    }
    await this.faceMesh.send({ image: imageElement })
  }

  /**
   * Extract mouth region coordinates from face landmarks
   * MediaPipe Face Mesh has 468 landmarks
   * Mouth landmarks: 61, 146, 91, 181, 84, 17, 314, 405, 320, 307, 375, 321
   * Inner mouth: 13, 14, 312, 317, 318, 324
   */
  extractMouthRegion(landmarks, imageWidth, imageHeight) {
    if (!landmarks || landmarks.length === 0) {
      return null
    }

    // Key mouth landmark indices
    // Outer mouth: 61, 146, 91, 181, 84, 17, 314, 405, 320, 307, 375, 321
    // Inner mouth (with refineLandmarks): 13, 14, 312, 317, 318, 324, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324
    // Better inner lip landmarks for tongue detection
    const mouthOuterIndices = [61, 146, 91, 181, 84, 17, 314, 405, 320, 307, 375, 321]
    const mouthInnerIndices = [13, 14, 78, 95, 88, 178, 87, 312, 317, 318, 324, 402]
    
    // Get mouth outer points
    const mouthPoints = mouthOuterIndices.map(idx => {
      const landmark = landmarks[idx]
      return {
        x: landmark.x * imageWidth,
        y: landmark.y * imageHeight
      }
    })

    // Calculate bounding box with padding
    const xs = mouthPoints.map(p => p.x)
    const ys = mouthPoints.map(p => p.y)
    
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Add padding (20% on each side)
    const paddingX = (maxX - minX) * 0.2
    const paddingY = (maxY - minY) * 0.2

    const x = Math.max(0, minX - paddingX)
    const y = Math.max(0, minY - paddingY)
    const width = Math.min(imageWidth - x, maxX - minX + paddingX * 2)
    const height = Math.min(imageHeight - y, maxY - minY + paddingY * 2)

    // Get mouth center
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Get inner mouth landmarks for tongue detection
    const innerMouthLandmarks = mouthInnerIndices.map(idx => {
      const landmark = landmarks[idx]
      return {
        x: landmark.x * imageWidth,
        y: landmark.y * imageHeight
      }
    })

    return {
      boundingBox: { x, y, width, height },
      center: { x: centerX, y: centerY },
      innerLandmarks: innerMouthLandmarks,
      outerLandmarks: mouthPoints,
      allLandmarks: landmarks
    }
  }

  /**
   * Crop mouth region from image
   */
  cropMouthRegion(imageElement, mouthRegion) {
    if (!mouthRegion) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const { x, y, width, height } = mouthRegion.boundingBox
    
    canvas.width = width
    canvas.height = height
    
    ctx.drawImage(
      imageElement,
      x, y, width, height,
      0, 0, width, height
    )

    return canvas
  }

  /**
   * Check if face is detected
   */
  hasFace(landmarks) {
    return landmarks && landmarks.length > 0
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.faceMesh) {
      this.faceMesh.close()
      this.faceMesh = null
    }
    this.isInitialized = false
  }
}
