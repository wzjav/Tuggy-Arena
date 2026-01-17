/**
 * Tongue Tracker - Tracks tongue position over time with smoothing
 */
export class TongueTracker {
  constructor(options = {}) {
    // Smoothing window size (number of frames)
    this.smoothingWindow = options.smoothingWindow || 5
    // Minimum confidence to consider detection valid
    this.minConfidence = options.minConfidence || 0.3
    // Position history for smoothing
    this.positionHistory = []
    // Current smoothed position
    this.currentPosition = null
    // Whether tongue is currently visible
    this.isVisible = false
  }

  /**
   * Update tracker with new detection
   */
  update(detection) {
    // Require both confidence threshold AND tongue being out
    if (!detection || detection.confidence < this.minConfidence || !detection.tongueOut) {
      this.isVisible = false
      return this.currentPosition
    }

    this.isVisible = true

    // Add to history
    this.positionHistory.push({
      relativeX: detection.position.relativeX,
      confidence: detection.confidence,
      timestamp: Date.now()
    })

    // Keep only recent history
    if (this.positionHistory.length > this.smoothingWindow) {
      this.positionHistory.shift()
    }

    // Calculate smoothed position (weighted average)
    if (this.positionHistory.length > 0) {
      let weightedSum = 0
      let totalWeight = 0

      this.positionHistory.forEach((pos, index) => {
        // More recent positions have higher weight
        const weight = (index + 1) * pos.confidence
        weightedSum += pos.relativeX * weight
        totalWeight += weight
      })

      const smoothedX = totalWeight > 0 ? weightedSum / totalWeight : 0

      this.currentPosition = {
        relativeX: smoothedX,
        rawX: detection.position.relativeX,
        confidence: detection.confidence,
        isVisible: true
      }
    }

    return this.currentPosition
  }

  /**
   * Get current smoothed position
   */
  getCurrentPosition() {
    return this.currentPosition
  }

  /**
   * Check if tongue is visible
   */
  getVisibility() {
    return this.isVisible && this.currentPosition !== null
  }

  /**
   * Reset tracker
   */
  reset() {
    this.positionHistory = []
    this.currentPosition = null
    this.isVisible = false
  }

  /**
   * Get position history (for debugging)
   */
  getHistory() {
    return [...this.positionHistory]
  }
}
