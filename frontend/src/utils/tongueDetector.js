/**
 * Tongue Detector using TensorFlow.js or MediaPipe landmark heuristics
 * Detects tongue position within mouth region
 */
export class TongueDetector {
  constructor() {
    this.model = null
    this.useModel = false
    this.isInitialized = false
    this.tf = null // TensorFlow.js - loaded dynamically if needed
  }

  /**
   * Initialize detector
   * For now, we'll use landmark-based heuristics (no model loading needed)
   * Can be extended to load a TF.js model later
   */
  async initialize(useModel = false) {
    this.useModel = useModel
    
    if (useModel) {
      try {
        // Dynamically import TensorFlow.js only if needed
        this.tf = await import('@tensorflow/tfjs')
        // TODO: Load TF.js tongue segmentation model
      } catch (err) {
        this.useModel = false
      }
    }
    
    this.isInitialized = true
  }

  /**
   * Detect tongue position using MediaPipe landmarks
   * Uses inner lip landmarks to infer tongue position based on mouth opening and lip displacement
   */
  detectFromLandmarks(mouthRegion, imageWidth, imageHeight) {
    if (!mouthRegion || !mouthRegion.innerLandmarks || mouthRegion.innerLandmarks.length === 0) {
      return null
    }

    const { innerLandmarks, center, boundingBox, outerLandmarks } = mouthRegion
    
    // Calculate mouth opening (vertical distance between top and bottom inner lips)
    const topLipY = Math.min(...innerLandmarks.map(l => l.y))
    const bottomLipY = Math.max(...innerLandmarks.map(l => l.y))
    const mouthOpening = bottomLipY - topLipY
    
    // Calculate opening ratio first
    const openingRatio = mouthOpening / boundingBox.height
    
    // Stricter threshold: mouth must be at least 30% open for tongue to be considered "out"
    const minOpeningRatio = 0.3
    const tongueOut = openingRatio >= minOpeningRatio
    
    // If mouth is not open enough, tongue is not visible
    if (!tongueOut) {
      return null
    }

    // Calculate horizontal center of inner mouth landmarks
    // When tongue moves left/right, inner lip landmarks shift horizontally
    let avgX = 0
    let avgY = 0
    let visiblePoints = 0

    innerLandmarks.forEach(landmark => {
      avgX += landmark.x
      avgY += landmark.y
      visiblePoints++
    })

    if (visiblePoints === 0) {
      return null
    }

    avgX /= visiblePoints
    avgY /= visiblePoints

    // Calculate horizontal spread of inner landmarks
    // More spread = more mouth opening = better tongue visibility
    const spreadX = Math.max(...innerLandmarks.map(l => l.x)) - Math.min(...innerLandmarks.map(l => l.x))
    const spreadY = Math.max(...innerLandmarks.map(l => l.y)) - Math.min(...innerLandmarks.map(l => l.y))
    
    // Normalize position relative to mouth center
    // Use boundingBox.width for normalization to get relative position
    const relativeX = (avgX - center.x) / (boundingBox.width || 1)
    const relativeY = (avgY - center.y) / (boundingBox.height || 1)

    // Calculate mouth openness ratio
    const mouthOpenness = Math.sqrt(spreadX * spreadX + spreadY * spreadY) / Math.max(boundingBox.width, boundingBox.height)
    
    // Confidence based on mouth openness and opening size
    // More open = more confident, stricter threshold (must be at least 30% open)
    const confidence = Math.min(1.0, Math.max(0.0, (openingRatio - 0.3) * 2)) // Scale confidence based on opening, stricter

    // Amplify the relativeX signal for better sensitivity
    // When mouth opens wider, tongue movement is more detectable
    // Increased amplification for better detection of small movements
    const amplifiedX = relativeX * (1 + mouthOpenness * 3)

    return {
      position: {
        x: avgX,
        y: avgY,
        relativeX: amplifiedX, // Amplified for better sensitivity
        relativeY: relativeY
      },
      confidence: confidence,
      mouthOpenness: mouthOpenness,
      openingRatio: openingRatio,
      tongueOut: tongueOut // Explicit flag for tongue being out
    }
  }

  /**
   * Detect tongue using TF.js model (future implementation)
   */
  async detectFromModel(mouthCanvas) {
    if (!this.model || !this.tf) {
      throw new Error('Model not loaded')
    }

    // Preprocess image
    const tensor = this.tf.browser.fromPixels(mouthCanvas)
      .resizeNearestNeighbor([128, 128])
      .expandDims(0)
      .div(255.0)

    // Run inference
    const prediction = await this.model.predict(tensor)
    const mask = await prediction.data()

    // Calculate tongue centroid
    // This is a placeholder - actual implementation depends on model output format
    tensor.dispose()
    prediction.dispose()

    return {
      position: { x: 0, y: 0, relativeX: 0 },
      confidence: 0.5,
      mask: mask
    }
  }

  /**
   * Main detection method
   */
  async detect(mouthRegion, mouthCanvas, imageWidth, imageHeight) {
    if (!this.isInitialized) {
      throw new Error('TongueDetector not initialized')
    }

    if (this.useModel && this.model && mouthCanvas) {
      return await this.detectFromModel(mouthCanvas)
    } else {
      return this.detectFromLandmarks(mouthRegion, imageWidth, imageHeight)
    }
  }

  /**
   * Load TF.js model (for future use)
   */
  async loadModel(modelPath) {
    try {
      this.model = await tf.loadLayersModel(modelPath)
      this.useModel = true
    } catch (error) {
      throw error
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
    this.isInitialized = false
  }
}
