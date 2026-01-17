import { Pose } from '@mediapipe/pose'

export class PoseDetection {
  constructor() {
    this.pose = null
    this.isInitialized = false
    this.latestResults = null
    this.pendingResolvers = []
  }

  async initialize() {
    try {
      // Initialize Pose detection with built-in segmentation
      this.pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      // Set up pose results handler
      this.pose.onResults((results) => {
        this.latestResults = results
        this.resolvePending()
      })

      this.isInitialized = true
      return Promise.resolve()
    } catch (error) {
      console.error('Failed to initialize pose detection:', error)
      throw error
    }
  }

  resolvePending() {
    if (this.latestResults && this.pendingResolvers.length > 0) {
      const resolver = this.pendingResolvers.shift()
      resolver({
        poseLandmarks: this.latestResults.poseLandmarks || null,
        segmentationMask: this.latestResults.segmentationMask || null,
        poseWorldLandmarks: this.latestResults.poseWorldLandmarks || null
      })
    }
  }

  async detect(videoElement) {
    if (!this.isInitialized || !this.pose) {
      throw new Error('Pose detection not initialized')
    }

    return new Promise((resolve) => {
      // Add resolver to pending queue
      this.pendingResolvers.push(resolve)

      // Process frame
      try {
        this.pose.send({ image: videoElement })
      } catch (error) {
        console.error('Error sending frame to MediaPipe:', error)
        // Remove this resolver and resolve with null
        const index = this.pendingResolvers.indexOf(resolve)
        if (index > -1) {
          this.pendingResolvers.splice(index, 1)
        }
        resolve({
          poseLandmarks: null,
          segmentationMask: null,
          poseWorldLandmarks: null
        })
      }
    })
  }

  dispose() {
    if (this.pose) {
      this.pose.close()
      this.pose = null
    }
    this.isInitialized = false
  }
}
