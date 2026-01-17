import { useRef, useState, useCallback } from 'react'
import { PoseDetection } from '../utils/poseDetection'
import { ARRenderer } from '../utils/ARRenderer'
import { BodyModel } from '../utils/BodyModel'
import { ClothingManager } from '../utils/ClothingManager'

export function useARClothing() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  
  const poseDetectionRef = useRef(null)
  const rendererRef = useRef(null)
  const bodyModelRef = useRef(null)
  const clothingManagerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const shouldDetectRef = useRef(false)

  const initialize = useCallback(async (videoElement, canvasElement) => {
    try {
      // Initialize pose detection
      poseDetectionRef.current = new PoseDetection()
      await poseDetectionRef.current.initialize()

      // Initialize AR renderer
      rendererRef.current = new ARRenderer(canvasElement, videoElement)
      await rendererRef.current.initialize()

      // Initialize body model
      bodyModelRef.current = new BodyModel()

      // Initialize clothing manager
      clothingManagerRef.current = new ClothingManager(rendererRef.current.getScene())
      
      // Set initial video aspect ratio for clothing positioning
      if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
        const aspect = videoElement.videoWidth / videoElement.videoHeight
        clothingManagerRef.current.setVideoAspect(aspect)
      } else {
        // Default aspect ratio
        clothingManagerRef.current.setVideoAspect(16/9)
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize AR system:', error)
      throw error
    }
  }, [])

  const startDetection = useCallback(() => {
    if (!isInitialized || !poseDetectionRef.current || !rendererRef.current) {
      console.warn('AR system not initialized')
      return
    }

    if (animationFrameRef.current) {
      // Already detecting
      return
    }

    setIsDetecting(true)
    shouldDetectRef.current = true
    
    const detect = async () => {
      if (!shouldDetectRef.current || !poseDetectionRef.current) {
        setIsDetecting(false)
        return
      }

      try {
        const video = rendererRef.current.getVideoElement()
        if (!video || video.readyState !== 4) {
          if (shouldDetectRef.current) {
            animationFrameRef.current = requestAnimationFrame(detect)
          }
          return
        }

        // Detect pose
        const results = await poseDetectionRef.current.detect(video)
        
        if (shouldDetectRef.current && results && results.poseLandmarks) {
          // Update body model
          bodyModelRef.current.updateFromLandmarks(results.poseLandmarks, results.segmentationMask)
          
          // Update clothing position
          if (clothingManagerRef.current.hasClothing()) {
            clothingManagerRef.current.updatePosition(bodyModelRef.current)
          }

          // Render
          rendererRef.current.render(bodyModelRef.current, clothingManagerRef.current)
        }

        if (shouldDetectRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect)
        }
      } catch (error) {
        console.error('Detection error:', error)
        if (shouldDetectRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect)
        }
      }
    }

    detect()
  }, [isInitialized])

  const stopDetection = useCallback(() => {
    shouldDetectRef.current = false
    setIsDetecting(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const updateClothing = useCallback((clothingItem) => {
    if (!clothingManagerRef.current) return
    
    try {
      clothingManagerRef.current.loadClothing(clothingItem)
      
      // If body model is already detected, attach clothing immediately
      if (bodyModelRef.current && typeof bodyModelRef.current.isDetected === 'function' && bodyModelRef.current.isDetected()) {
        clothingManagerRef.current.updatePosition(bodyModelRef.current)
      }
    } catch (error) {
      console.error('Error updating clothing:', error)
    }
  }, [])

  return {
    initialize,
    startDetection,
    stopDetection,
    updateClothing,
    isInitialized,
    isDetecting
  }
}
