import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceDetector } from '../utils/faceDetection'
import { TongueDetector } from '../utils/tongueDetector'
import { TongueTracker } from '../utils/tongueTracker'
import { MovementCounter } from '../utils/movementCounter'

/**
 * Custom hook for tongue movement detection
 */
export function useTongueDetection(options = {}) {
  const [isActive, setIsActive] = useState(false)
  const [count, setCount] = useState(0)
  const [tongueState, setTongueState] = useState('CENTER')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isActiveRef = useRef(false)
  
  const faceDetectorRef = useRef(null)
  const tongueDetectorRef = useRef(null)
  const tongueTrackerRef = useRef(null)
  const movementCounterRef = useRef(null)

  /**
   * Handle face detection results
   */
  const handleFaceResults = useCallback((results) => {
    if (!tongueDetectorRef.current || !tongueTrackerRef.current || !movementCounterRef.current) {
      return
    }

    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    // Extract mouth region
    const mouthRegion = faceDetectorRef.current.extractMouthRegion(
      results.multiFaceLandmarks?.[0],
      videoWidth,
      videoHeight
    )

    if (!mouthRegion) {
      setTongueState('CENTER')
      return
    }

    // Crop mouth region
    const mouthCanvas = faceDetectorRef.current.cropMouthRegion(video, mouthRegion)

    // Detect tongue
    tongueDetectorRef.current.detect(mouthRegion, mouthCanvas, videoWidth, videoHeight)
      .then(detection => {
        if (!detection) {
          setTongueState('CENTER')
          return
        }

        // Update tracker
        const trackedPosition = tongueTrackerRef.current.update(detection)

        if (trackedPosition && trackedPosition.isVisible && detection.tongueOut) {
          // Update counter - only count when tongue is out
          const counterResult = movementCounterRef.current.update(
            trackedPosition.relativeX,
            detection.tongueOut
          )
          
          setCount(counterResult.count)
          setTongueState(counterResult.state)
          
          // Debug logging (can be removed later)
          if (counterResult.transition) {
            console.log('Movement detected:', counterResult.transition, 'Count:', counterResult.count)
          }
        } else {
          // Update counter with tongue not out (resets to center)
          const counterResult = movementCounterRef.current.update(
            trackedPosition?.relativeX || null,
            false
          )
          setTongueState(counterResult.state)
        }
      })
      .catch(err => {
        console.error('Tongue detection error:', err)
      })
  }, [])

  /**
   * Initialize detection pipeline
   */
  const initialize = useCallback(async () => {
    try {
      // Initialize face detector with callback
      const faceDetector = new FaceDetector()
      await faceDetector.initialize(handleFaceResults)
      faceDetectorRef.current = faceDetector

      // Initialize tongue detector
      const tongueDetector = new TongueDetector()
      await tongueDetector.initialize(false) // Use landmark-based for now
      tongueDetectorRef.current = tongueDetector

      // Initialize tracker
      const tracker = new TongueTracker({
        smoothingWindow: options.smoothingWindow || 5,
        minConfidence: options.minConfidence || 0.3
      })
      tongueTrackerRef.current = tracker

      // Initialize counter
      const counter = new MovementCounter({
        leftThreshold: options.leftThreshold || -0.005,
        rightThreshold: options.rightThreshold || 0.005,
        minHoldFrames: options.minHoldFrames || 3
      })
      movementCounterRef.current = counter

      setError(null)
    } catch (err) {
      console.error('Failed to initialize detection:', err)
      setError(err.message)
    }
  }, [options, handleFaceResults])

  /**
   * Process video frame
   */
  const processFrame = useCallback(async () => {
    if (!isActiveRef.current || !videoRef.current || !faceDetectorRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        // Get video dimensions
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        if (videoWidth === 0 || videoHeight === 0) {
          animationFrameRef.current = requestAnimationFrame(processFrame)
          return
        }

        // Process frame with face detection
        await faceDetectorRef.current.send(video)

        // Note: Face detection results come via callback
        // For now, we'll process synchronously
        // In a real implementation, you'd handle the async callback properly
        
        // Draw video to canvas for processing
        if (canvas) {
          const ctx = canvas.getContext('2d')
          canvas.width = videoWidth
          canvas.height = videoHeight
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
        }

        // Continue processing loop
        animationFrameRef.current = requestAnimationFrame(processFrame)
      } catch (err) {
        console.error('Frame processing error:', err)
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }
  }, [])

  /**
   * Start camera and detection
   */
  const startDetection = useCallback(async () => {
    try {
      if (!videoRef.current) {
        throw new Error('Video element not available')
      }

      const video = videoRef.current

      // Stop any existing stream first
      if (video.srcObject) {
        const existingStream = video.srcObject
        existingStream.getTracks().forEach(track => track.stop())
        video.srcObject = null
      }

      // Initialize if not already done
      if (!faceDetectorRef.current) {
        await initialize()
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })

      // Set stream and wait for video to be ready
      video.srcObject = stream
      
      // Wait for video metadata to load
      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          resolve()
        }
        const onError = (err) => {
          video.removeEventListener('error', onError)
          reject(err)
        }
        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onError)
        
        // If already loaded, resolve immediately
        if (video.readyState >= 1) {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          resolve()
        }
      })

      // Play video and wait for it to start
      try {
        await video.play()
      } catch (playErr) {
        // Ignore AbortError - it means play was interrupted, which is fine
        if (playErr.name !== 'AbortError') {
          console.warn('Video play error:', playErr)
        }
      }

      isActiveRef.current = true
      setIsActive(true)
      setIsDetecting(true)
      setError(null)

      // Start processing loop
      processFrame()
    } catch (err) {
      console.error('Failed to start detection:', err)
      isActiveRef.current = false
      setError(err.message)
      setIsActive(false)
      setIsDetecting(false)
    }
  }, [initialize, processFrame])

  /**
   * Stop detection
   */
  const stopDetection = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
    setIsDetecting(false)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  /**
   * Reset counter
   */
  const resetCount = useCallback(() => {
    if (movementCounterRef.current) {
      movementCounterRef.current.reset()
      setCount(0)
      setTongueState('CENTER')
    }
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopDetection()
      if (faceDetectorRef.current) {
        faceDetectorRef.current.dispose()
      }
      if (tongueDetectorRef.current) {
        tongueDetectorRef.current.dispose()
      }
    }
  }, [stopDetection])


  return {
    videoRef,
    canvasRef,
    isActive,
    isDetecting,
    count,
    tongueState,
    error,
    startDetection,
    stopDetection,
    resetCount
  }
}
