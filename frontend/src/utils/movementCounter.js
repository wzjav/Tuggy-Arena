/**
 * Movement Counter - Counts left-right movements within 1 second
 * Ignores CENTER states - counts when LEFT and RIGHT both occur within 1 second
 */
export class MovementCounter {
  constructor(options = {}) {
    // Threshold for left/right classification (as fraction of mouth width)
    // Lower values = more sensitive (smaller movements detected)
    this.leftThreshold = options.leftThreshold || -0.001  // Left if relativeX < -0.05
    this.rightThreshold = options.rightThreshold || 0.001  // Right if relativeX > 0.05
    
    // Time window for counting (1 second = 1000ms)
    this.timeWindow = options.timeWindow || 1000
    
    // Current state
    this.currentState = 'CENTER' // 'LEFT', 'CENTER', 'RIGHT'
    
    // Timestamps of when LEFT and RIGHT were detected
    this.leftTimestamp = null
    this.rightTimestamp = null
    
    // Movement count
    this.count = 0
    
    // Last transition direction
    this.lastTransition = null // 'LEFT_TO_RIGHT' or 'RIGHT_TO_LEFT'
  }

  /**
   * Classify tongue position into state
   */
  classifyPosition(relativeX) {
    if (relativeX < this.leftThreshold) {
      return 'LEFT'
    } else if (relativeX > this.rightThreshold) {
      return 'RIGHT'
    } else {
      return 'CENTER'
    }
  }

  /**
   * Update counter with new tongue position
   * Only counts when tongue is out
   * Counts when LEFT and RIGHT both occur within 1 second
   */
  update(relativeX, tongueOut = false) {
    const now = Date.now()
    let transition = null

    // If tongue is not out, reset timestamps but keep current state
    if (!tongueOut || relativeX === null || relativeX === undefined) {
      if (!tongueOut) {
        // Clear timestamps when tongue goes in
        this.leftTimestamp = null
        this.rightTimestamp = null
        this.currentState = 'CENTER'
      }
      return {
        count: this.count,
        state: this.currentState,
        transition: null
      }
    }

    // Classify current position
    const newState = this.classifyPosition(relativeX)
    this.currentState = newState

    // Track LEFT and RIGHT timestamps, ignore CENTER
    if (newState === 'LEFT') {
      this.leftTimestamp = now
      
      // Check if we've seen RIGHT within the time window
      if (this.rightTimestamp && (now - this.rightTimestamp) <= this.timeWindow) {
        // Both LEFT and RIGHT within 1 second - count it!
        this.count++
        transition = 'RIGHT_TO_LEFT'
        this.lastTransition = 'RIGHT_TO_LEFT'
        // Reset timestamps to prevent double counting
        this.leftTimestamp = null
        this.rightTimestamp = null
      }
    } else if (newState === 'RIGHT') {
      this.rightTimestamp = now
      
      // Check if we've seen LEFT within the time window
      if (this.leftTimestamp && (now - this.leftTimestamp) <= this.timeWindow) {
        // Both LEFT and RIGHT within 1 second - count it!
        this.count++
        transition = 'LEFT_TO_RIGHT'
        this.lastTransition = 'LEFT_TO_RIGHT'
        // Reset timestamps to prevent double counting
        this.leftTimestamp = null
        this.rightTimestamp = null
      }
    }
    // CENTER state - do nothing, just update currentState

    // Clean up old timestamps (older than time window)
    if (this.leftTimestamp && (now - this.leftTimestamp) > this.timeWindow) {
      this.leftTimestamp = null
    }
    if (this.rightTimestamp && (now - this.rightTimestamp) > this.timeWindow) {
      this.rightTimestamp = null
    }

    return {
      count: this.count,
      state: this.currentState,
      previousState: this.currentState, // Not used anymore but kept for compatibility
      transition: transition,
      stateFrames: {} // Not used anymore but kept for compatibility
    }
  }

  /**
   * Get current count
   */
  getCount() {
    return this.count
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState
  }

  /**
   * Reset counter
   */
  reset() {
    this.count = 0
    this.currentState = 'CENTER'
    this.leftTimestamp = null
    this.rightTimestamp = null
    this.lastTransition = null
  }

  /**
   * Set thresholds
   */
  setThresholds(leftThreshold, rightThreshold) {
    this.leftThreshold = leftThreshold
    this.rightThreshold = rightThreshold
  }

  /**
   * Set minimum hold frames
   */
  setMinHoldFrames(frames) {
    this.minHoldFrames = frames
  }
}
