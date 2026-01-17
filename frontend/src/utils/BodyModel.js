import * as THREE from 'three'

// MediaPipe pose landmark indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
}

export class BodyModel {
  constructor() {
    this.landmarks = null
    this.worldLandmarks = null
    this.segmentationMask = null
    this._isDetected = false
    
    // 3D skeleton representation
    this.skeleton = new THREE.Group()
    
    // Body measurements (estimated)
    this.measurements = {
      shoulderWidth: 0,
      torsoHeight: 0,
      hipWidth: 0,
      overallHeight: 0
    }

    // Smoothing for landmarks
    this.smoothedLandmarks = null
    this.smoothingFactor = 0.7
  }

  updateFromLandmarks(landmarks, segmentationMask) {
    if (!landmarks || landmarks.length === 0) {
      this._isDetected = false
      return
    }

    this.segmentationMask = segmentationMask
    this._isDetected = true

    // Smooth landmarks
    if (!this.smoothedLandmarks) {
      this.smoothedLandmarks = landmarks.map(l => ({ ...l }))
    } else {
      landmarks.forEach((landmark, i) => {
        this.smoothedLandmarks[i] = {
          x: this.smoothingFactor * this.smoothedLandmarks[i].x + (1 - this.smoothingFactor) * landmark.x,
          y: this.smoothingFactor * this.smoothedLandmarks[i].y + (1 - this.smoothingFactor) * landmark.y,
          z: this.smoothingFactor * this.smoothedLandmarks[i].z + (1 - this.smoothingFactor) * landmark.z,
          visibility: landmark.visibility
        }
      })
    }

    this.landmarks = this.smoothedLandmarks
    this.calculateMeasurements()
    this.updateSkeleton()
  }

  calculateMeasurements() {
    if (!this.landmarks) return

    const leftShoulder = this.landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = this.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
    const leftHip = this.landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = this.landmarks[POSE_LANDMARKS.RIGHT_HIP]
    const leftAnkle = this.landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    const nose = this.landmarks[POSE_LANDMARKS.NOSE]

    // Calculate distances (in normalized coordinates, will be scaled)
    this.measurements.shoulderWidth = this.distance(leftShoulder, rightShoulder)
    this.measurements.torsoHeight = this.distance(
      { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 },
      { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
    )
    this.measurements.hipWidth = this.distance(leftHip, rightHip)
    this.measurements.overallHeight = Math.abs(nose.y - leftAnkle.y)
  }

  distance(p1, p2) {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = (p1.z || 0) - (p2.z || 0)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  updateSkeleton() {
    // This creates a basic skeleton representation
    // In a full implementation, this would create 3D bones/joints
    this.skeleton.clear()
    
    if (!this.landmarks) return

    // Create joint markers (for visualization/debugging)
    const jointGeometry = new THREE.SphereGeometry(0.02, 8, 8)
    const jointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false })

    // Key joints for clothing attachment
    const keyJoints = [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.RIGHT_ELBOW
    ]

    keyJoints.forEach(landmarkIndex => {
      const landmark = this.landmarks[landmarkIndex]
      if (landmark && landmark.visibility > 0.5) {
        const joint = new THREE.Mesh(jointGeometry, jointMaterial)
        // Convert normalized coordinates to 3D space
        joint.position.set(
          (landmark.x - 0.5) * 2,
          (0.5 - landmark.y) * 2,
          (landmark.z || 0) * 2
        )
        this.skeleton.add(joint)
      }
    })
  }

  getLandmark(index) {
    if (!this.landmarks || !this.landmarks[index]) return null
    return this.landmarks[index]
  }

  getKeyPoints() {
    if (!this.landmarks) return null

    return {
      leftShoulder: this.landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      rightShoulder: this.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      leftHip: this.landmarks[POSE_LANDMARKS.LEFT_HIP],
      rightHip: this.landmarks[POSE_LANDMARKS.RIGHT_HIP],
      leftElbow: this.landmarks[POSE_LANDMARKS.LEFT_ELBOW],
      rightElbow: this.landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
      leftWrist: this.landmarks[POSE_LANDMARKS.LEFT_WRIST],
      rightWrist: this.landmarks[POSE_LANDMARKS.RIGHT_WRIST],
      nose: this.landmarks[POSE_LANDMARKS.NOSE]
    }
  }

  getPosition() {
    if (!this.landmarks) return new THREE.Vector3(0, 0, 0)

    // Calculate center of body (between shoulders and hips)
    const leftShoulder = this.landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = this.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
    const leftHip = this.landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = this.landmarks[POSE_LANDMARKS.RIGHT_HIP]

    const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
    const centerY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4
    const centerZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0) + (leftHip.z || 0) + (rightHip.z || 0)) / 4

    // Convert normalized coordinates to 3D space
    return new THREE.Vector3(
      (centerX - 0.5) * 2,
      (0.5 - centerY) * 2,
      centerZ * 2
    )
  }

  getMeasurements() {
    return this.measurements
  }

  getSkeleton() {
    return this.skeleton
  }

  isDetected() {
    return this._isDetected
  }

  getSegmentationMask() {
    return this.segmentationMask
  }
}
