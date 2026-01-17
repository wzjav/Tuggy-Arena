/**
 * AI Opponent for Tug of War Game
 * Adaptive AI that pulls harder when the user is winning
 */
export class AIOpponent {
  constructor(options = {}) {
    // Base pull interval (milliseconds)
    this.basePullInterval = options.basePullInterval || 1500 // 1.5 seconds
    
    // Base pull strength (how much score increases per pull)
    this.basePullStrength = options.basePullStrength || 0.5
    
    // Maximum pull strength multiplier
    this.maxPullMultiplier = options.maxPullMultiplier || 3.0
    
    // Current AI score
    this.score = 0
    
    // Timer reference for pull interval
    this.pullTimer = null
    
    // Callback function to update AI score
    this.onScoreUpdate = null
    
    // Function to get current user score
    this.getUserScore = null
    
    // Whether AI is active
    this.isActive = false
  }

  /**
   * Calculate adaptive pull strength based on score difference
   * Pulls harder when user is winning
   */
  calculatePullStrength(userScore) {
    const scoreDifference = userScore - this.score
    
    // If user is winning, increase pull strength
    if (scoreDifference > 0) {
      const multiplier = 1 + (scoreDifference / 10) * 0.5
      return this.basePullStrength * Math.min(multiplier, this.maxPullMultiplier)
    }
    
    // If AI is winning, use base strength
    return this.basePullStrength
  }

  /**
   * Calculate adaptive pull interval based on score difference
   * Pulls more frequently when user is winning
   */
  calculatePullInterval(userScore) {
    const scoreDifference = userScore - this.score
    
    // If user is winning, pull more frequently
    if (scoreDifference > 0) {
      const reduction = Math.min(scoreDifference / 10, 0.5) // Max 50% reduction
      return this.basePullInterval * (1 - reduction)
    }
    
    return this.basePullInterval
  }

  /**
   * Perform a pull action
   */
  performPull() {
    if (!this.isActive || !this.getUserScore) return
    
    const userScore = this.getUserScore()
    const pullStrength = this.calculatePullStrength(userScore)
    this.score += pullStrength
    
    // Notify parent component of score update
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score)
    }
  }

  /**
   * Start AI pulling loop
   * @param {Function} getUserScore - Function that returns current user score
   * @param {Function} onScoreUpdate - Callback when AI score updates
   */
  start(getUserScore, onScoreUpdate) {
    if (this.isActive) return
    
    this.isActive = true
    this.getUserScore = getUserScore
    this.onScoreUpdate = onScoreUpdate
    
    // Perform initial pull
    this.performPull()
    
    // Schedule next pull
    this.scheduleNextPull()
  }

  /**
   * Schedule next pull based on adaptive interval
   */
  scheduleNextPull() {
    if (!this.isActive || !this.getUserScore) return
    
    const userScore = this.getUserScore()
    const interval = this.calculatePullInterval(userScore)
    
    this.pullTimer = setTimeout(() => {
      this.performPull()
      this.scheduleNextPull()
    }, interval)
  }

  /**
   * Stop AI pulling
   */
  stop() {
    this.isActive = false
    
    if (this.pullTimer) {
      clearTimeout(this.pullTimer)
      this.pullTimer = null
    }
    
    this.onScoreUpdate = null
    this.getUserScore = null
  }

  /**
   * Reset AI score
   */
  reset() {
    this.score = 0
    this.stop()
  }

  /**
   * Get current AI score
   */
  getScore() {
    return this.score
  }
}
