/**
 * AI Opponent for Tug of War Game
 * Reactive AI that responds to user performance
 */
export class AIOpponent {
  constructor(options = {}) {
    // Base scoring rate (points per second)
    this.baseRate = options.baseRate || 0.5
    
    // Current score
    this.score = 0
    
    // Difficulty multiplier (increases as user score increases)
    this.difficultyMultiplier = 1.0
    
    // Randomness factor (0-1, adds natural variation)
    this.randomness = options.randomness || 0.3
    
    // Minimum time between score increments (ms)
    this.minInterval = options.minInterval || 500
    
    // Maximum time between score increments (ms)
    this.maxInterval = options.maxInterval || 2000
    
    // Last update timestamp
    this.lastUpdateTime = null
    
    // Time accumulator for scoring
    this.timeAccumulator = 0
    
    // Target interval for next score increment
    this.targetInterval = this.calculateTargetInterval()
  }

  /**
   * Calculate target interval based on current difficulty
   */
  calculateTargetInterval() {
    const baseInterval = (this.minInterval + this.maxInterval) / 2
    const adjustedInterval = baseInterval / this.difficultyMultiplier
    
    // Add randomness
    const randomFactor = 1 + (Math.random() - 0.5) * this.randomness * 2
    return Math.max(this.minInterval, Math.min(this.maxInterval, adjustedInterval * randomFactor))
  }

  /**
   * Update AI score based on user performance
   * @param {number} userScore - Current user score
   * @param {number} deltaTime - Time elapsed since last update (ms)
   */
  update(userScore, deltaTime) {
    if (deltaTime === undefined || deltaTime === null) {
      const now = Date.now()
      deltaTime = this.lastUpdateTime ? now - this.lastUpdateTime : 0
      this.lastUpdateTime = now
    }

    // Update difficulty based on user score
    // As user score increases, AI becomes more aggressive
    this.difficultyMultiplier = 1.0 + (userScore / 50) * 0.5 // Gradually increases difficulty
    
    // Accumulate time
    this.timeAccumulator += deltaTime

    // Check if it's time to increment score
    if (this.timeAccumulator >= this.targetInterval) {
      this.score += 1
      this.timeAccumulator = 0
      this.targetInterval = this.calculateTargetInterval()
    }
  }

  /**
   * Get current AI score
   */
  getScore() {
    return this.score
  }

  /**
   * Reset AI opponent
   */
  reset() {
    this.score = 0
    this.difficultyMultiplier = 1.0
    this.timeAccumulator = 0
    this.lastUpdateTime = null
    this.targetInterval = this.calculateTargetInterval()
  }

  /**
   * Set difficulty parameters
   */
  setDifficulty(baseRate, randomness) {
    this.baseRate = baseRate
    this.randomness = randomness
  }
}
