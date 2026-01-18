import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceDetector } from '../utils/faceDetection'
import { TongueDetector } from '../utils/tongueDetector'
import { TongueTracker } from '../utils/tongueTracker'
import { MovementCounter } from '../utils/movementCounter'

/**
 * Custom hook for dual tongue movement detection (two players in same camera)
 * Leftmost face = Player 1, Rightmost face = Player 2
 */
export function useDualTongueDetection(options = {}) {
  const [isActive, setIsActive] = useState(false)
  const [player1Count, setPlayer1Count] = useState(0)
  const [player2Count, setPlayer2Count] = useState(0)
  const [player1TongueState, setPlayer1TongueState] = useState('CENTER')
  const [player2TongueState, setPlayer2TongueState] = useState('CENTER')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState(null)
  const [detectedFaces, setDetectedFaces] = useState(0) // Track how many faces are detected

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isActiveRef = useRef(false)
  
  const faceDetectorRef = useRef(null)
  const player1TongueDetectorRef = useRef(null)
  const player2TongueDetectorRef = useRef(null)
  const player1TongueTrackerRef = useRef(null)
  const player2TongueTrackerRef = useRef(null)
  const player1MovementCounterRef = useRef(null)
  const player2MovementCounterRef = useRef(null)
  
  // Note: Face assignment is ALWAYS based on current X position (leftmost = Player 1, rightmost = Player 2)
  // This ensures correct assignment regardless of detection order

  /**
   * Handle face detection results - process both faces
   */
  const handleFaceResults = useCallback((results) => {
    if (!player1TongueDetectorRef.current || !player2TongueDetectorRef.current) {
      return
    }

    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    const faces = results.multiFaceLandmarks || []
    setDetectedFaces(faces.length)

    // Calculate face center X position for each face
    const facesWithPosition = faces.map((landmarks, index) => {
      // Use average of key facial landmarks for stable center
      let sumX = 0
      let count = 0
      const keyLandmarks = [4, 175, 1, 33, 61, 291] // Nose tip, chin, eye corners, mouth corners
      keyLandmarks.forEach(idx => {
        if (landmarks[idx]) {
          sumX += landmarks[idx].x
          count++
        }
      })
      // Fallback to average of all landmarks if key landmarks not available
      if (count === 0 && landmarks.length > 0) {
        landmarks.forEach(landmark => {
          sumX += landmark.x
          count++
        })
      }
      const centerX = count > 0 ? (sumX / count) * videoWidth : 0
      return { landmarks, centerX, index, originalIndex: index }
    })

    // CRITICAL: Sort by X position (leftmost first) 
    // This ensures assignment is ALWAYS based on position, NEVER on detection order
    // After sorting: facesWithPosition[0] = leftmost face (lowest X)
    //                facesWithPosition[1] = rightmost face (highest X)
    facesWithPosition.sort((a, b) => a.centerX - b.centerX)

    // IMPORTANT: Player 1 = Blue character (LEFT side in game)
    //            Player 2 = Red character (RIGHT side in game)
    // Camera is mirrored (scaleX(-1)), so:
    // - Rightmost face in camera = Left side in game = Player 1 (Blue)
    // - Leftmost face in camera = Right side in game = Player 2 (Red)
    
    // Process Player 1 (Blue character, LEFT side in game = RIGHTMOST face in camera)
    const processPlayer1 = async () => {
      if (facesWithPosition.length === 0) {
        setPlayer1TongueState('CENTER')
        return
      }

      // CRITICAL: Player 1 (Blue, Left side) = RIGHTMOST face in camera (highest X)
      // Use rightmost face when 2 faces present, otherwise use the only face
      const player1Face = facesWithPosition.length >= 2 ? facesWithPosition[1] : facesWithPosition[0]
      const mouthRegion = faceDetectorRef.current.extractMouthRegion(
        player1Face.landmarks,
        videoWidth,
        videoHeight
      )

      if (!mouthRegion) {
        setPlayer1TongueState('CENTER')
        return
      }

      const mouthCanvas = faceDetectorRef.current.cropMouthRegion(video, mouthRegion)

      try {
        const detection = await player1TongueDetectorRef.current.detect(
          mouthRegion,
          mouthCanvas,
          videoWidth,
          videoHeight
        )

        if (!detection) {
          setPlayer1TongueState('CENTER')
          return
        }

        const trackedPosition = player1TongueTrackerRef.current.update(detection)

        if (trackedPosition && trackedPosition.isVisible && detection.tongueOut) {
          const counterResult = player1MovementCounterRef.current.update(
            trackedPosition.relativeX,
            detection.tongueOut
          )
          
          setPlayer1Count(counterResult.count)
          setPlayer1TongueState(counterResult.state)
        } else {
          const counterResult = player1MovementCounterRef.current.update(
            trackedPosition?.relativeX || null,
            false
          )
          setPlayer1TongueState(counterResult.state)
        }
      } catch (err) {
        // Error handled silently
      }
    }

    // Process Player 2 (Red character, RIGHT side in game = LEFTMOST face in camera)
    const processPlayer2 = async () => {
      if (facesWithPosition.length === 0) {
        setPlayer2TongueState('CENTER')
        return
      }

      // CRITICAL: Player 2 (Red, Right side) = LEFTMOST face in camera (lowest X)
      // This is because camera view is mirrored - leftmost in camera = right side in game
      const player2Face = facesWithPosition[0]
      const mouthRegion = faceDetectorRef.current.extractMouthRegion(
        player2Face.landmarks,
        videoWidth,
        videoHeight
      )

      if (!mouthRegion) {
        setPlayer2TongueState('CENTER')
        return
      }

      const mouthCanvas = faceDetectorRef.current.cropMouthRegion(video, mouthRegion)

      try {
        const detection = await player2TongueDetectorRef.current.detect(
          mouthRegion,
          mouthCanvas,
          videoWidth,
          videoHeight
        )

        if (!detection) {
          setPlayer2TongueState('CENTER')
          return
        }

        const trackedPosition = player2TongueTrackerRef.current.update(detection)

        if (trackedPosition && trackedPosition.isVisible && detection.tongueOut) {
          const counterResult = player2MovementCounterRef.current.update(
            trackedPosition.relativeX,
            detection.tongueOut
          )
          
          setPlayer2Count(counterResult.count)
          setPlayer2TongueState(counterResult.state)
        } else {
          const counterResult = player2MovementCounterRef.current.update(
            trackedPosition?.relativeX || null,
            false
          )
          setPlayer2TongueState(counterResult.state)
        }
      } catch (err) {
        // Error handled silently
      }
    }

    // Process both players in parallel
    processPlayer1()
    processPlayer2()
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

      // Initialize tongue detectors for both players
      const player1TongueDetector = new TongueDetector()
      await player1TongueDetector.initialize(false)
      player1TongueDetectorRef.current = player1TongueDetector

      const player2TongueDetector = new TongueDetector()
      await player2TongueDetector.initialize(false)
      player2TongueDetectorRef.current = player2TongueDetector

      // Initialize trackers for both players with more lenient settings
      const player1Tracker = new TongueTracker({
        smoothingWindow: options.smoothingWindow || 5,
        minConfidence: options.minConfidence || 0.3 // Lower confidence for easier detection
      })
      player1TongueTrackerRef.current = player1Tracker

      const player2Tracker = new TongueTracker({
        smoothingWindow: options.smoothingWindow || 5,
        minConfidence: options.minConfidence || 0.3 // Lower confidence for easier detection
      })
      player2TongueTrackerRef.current = player2Tracker

      // Initialize counters for both players with more lenient thresholds
      // Thresholds closer to zero = easier to trigger left/right detection (smaller movements detected)
      const player1Counter = new MovementCounter({
        leftThreshold: options.leftThreshold !== undefined ? options.leftThreshold : -0.0003,
        rightThreshold: options.rightThreshold !== undefined ? options.rightThreshold : 0.0003,
        minHoldFrames: options.minHoldFrames !== undefined ? options.minHoldFrames : 1
      })
      player1MovementCounterRef.current = player1Counter

      // Player 2 (right side of camera) needs more sensitive thresholds
      // Especially rightThreshold to detect RIGHT movements more easily
      const player2Counter = new MovementCounter({
        leftThreshold: options.player2LeftThreshold !== undefined ? options.player2LeftThreshold : -0.0001,
        rightThreshold: options.player2RightThreshold !== undefined ? options.player2RightThreshold : 0.0001,
        minHoldFrames: options.minHoldFrames !== undefined ? options.minHoldFrames : 1
      })
      player2MovementCounterRef.current = player2Counter

      setError(null)
    } catch (err) {
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
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        if (videoWidth === 0 || videoHeight === 0) {
          animationFrameRef.current = requestAnimationFrame(processFrame)
          return
        }

        const faceDetector = faceDetectorRef.current
        if (!faceDetector || !faceDetector.isInitialized || !faceDetector.faceMesh) {
          animationFrameRef.current = requestAnimationFrame(processFrame)
          return
        }

        // Process frame with face detection
        await faceDetector.send(video)

        // Draw video to canvas
        if (canvas) {
          const rect = video.getBoundingClientRect()
          canvas.width = rect.width
          canvas.height = rect.height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(video, 0, 0, rect.width, rect.height)
        }

        animationFrameRef.current = requestAnimationFrame(processFrame)
      } catch (err) {
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
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })

      video.srcObject = stream
      
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
        
        if (video.readyState >= 1) {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          resolve()
        }
      })

      try {
        await video.play()
      } catch (playErr) {
        // Ignore AbortError
      }

      isActiveRef.current = true
      setIsActive(true)
      setIsDetecting(true)
      setError(null)

      processFrame()
    } catch (err) {
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
   * Reset counters
   */
  const resetCounts = useCallback(() => {
    if (player1MovementCounterRef.current) {
      player1MovementCounterRef.current.reset()
      setPlayer1Count(0)
      setPlayer1TongueState('CENTER')
    }
    if (player2MovementCounterRef.current) {
      player2MovementCounterRef.current.reset()
      setPlayer2Count(0)
      setPlayer2TongueState('CENTER')
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
      if (player1TongueDetectorRef.current) {
        player1TongueDetectorRef.current.dispose()
      }
      if (player2TongueDetectorRef.current) {
        player2TongueDetectorRef.current.dispose()
      }
    }
  }, [stopDetection])

  return {
    videoRef,
    canvasRef,
    isActive,
    isDetecting,
    player1Count,
    player2Count,
    player1TongueState,
    player2TongueState,
    error,
    detectedFaces,
    startDetection,
    stopDetection,
    resetCounts
  }
}
