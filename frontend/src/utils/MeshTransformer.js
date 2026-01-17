import * as THREE from 'three'

// MediaPipe pose landmark indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
}

// SMPL joint names (approximate mapping)
// Note: This is a simplified mapping - actual SMPL models may have different joint names
const SMPL_JOINT_NAMES = [
  'pelvis',           // 0
  'left_hip',         // 1
  'right_hip',        // 2
  'spine1',           // 3
  'left_knee',        // 4
  'right_knee',       // 5
  'spine2',           // 6
  'left_ankle',       // 7
  'right_ankle',      // 8
  'spine3',           // 9
  'left_foot',        // 10
  'right_foot',       // 11
  'neck',             // 12
  'left_collar',      // 13
  'right_collar',     // 14
  'head',             // 15
  'left_shoulder',    // 16
  'right_shoulder',   // 17
  'left_elbow',       // 18
  'right_elbow',      // 19
  'left_wrist',       // 20
  'right_wrist',      // 21
  'left_hand',        // 22
  'right_hand'        // 23
]

// Mapping from MediaPipe landmarks to SMPL joint indices
const LANDMARK_TO_JOINT = {
  [POSE_LANDMARKS.LEFT_SHOULDER]: { name: 'left_shoulder', index: 16 },
  [POSE_LANDMARKS.RIGHT_SHOULDER]: { name: 'right_shoulder', index: 17 },
  [POSE_LANDMARKS.LEFT_ELBOW]: { name: 'left_elbow', index: 18 },
  [POSE_LANDMARKS.RIGHT_ELBOW]: { name: 'right_elbow', index: 19 },
  [POSE_LANDMARKS.LEFT_WRIST]: { name: 'left_wrist', index: 20 },
  [POSE_LANDMARKS.RIGHT_WRIST]: { name: 'right_wrist', index: 21 },
  [POSE_LANDMARKS.LEFT_HIP]: { name: 'left_hip', index: 1 },
  [POSE_LANDMARKS.RIGHT_HIP]: { name: 'right_hip', index: 2 },
  [POSE_LANDMARKS.LEFT_KNEE]: { name: 'left_knee', index: 4 },
  [POSE_LANDMARKS.RIGHT_KNEE]: { name: 'right_knee', index: 5 },
  [POSE_LANDMARKS.LEFT_ANKLE]: { name: 'left_ankle', index: 7 },
  [POSE_LANDMARKS.RIGHT_ANKLE]: { name: 'right_ankle', index: 8 }
}

export class MeshTransformer {
  constructor() {
    this.smoothingFactor = 0.7
    this.smoothedRotations = new Map()
    this.lastLandmarks = null
  }

  /**
   * Update body mesh pose using MediaPipe landmarks
   * @param {Array} worldLandmarks - MediaPipe world landmarks (3D positions)
   * @param {Array} landmarks - MediaPipe screen landmarks (normalized 2D positions)
   * @param {Array} bones - Three.js skeleton bones
   */
  updatePose(worldLandmarks, landmarks, bones) {
    if (!worldLandmarks || worldLandmarks.length === 0 || !bones) {
      return
    }

    if (!this.lastLandmarks) {
      this.lastLandmarks = worldLandmarks.map(l => ({ ...l }))
    }

    // Process each landmark-to-joint mapping
    Object.keys(LANDMARK_TO_JOINT).forEach(landmarkIndex => {
      const landmarkIdx = parseInt(landmarkIndex)
      const jointInfo = LANDMARK_TO_JOINT[landmarkIdx]
      
      const landmark = worldLandmarks[landmarkIdx]
      if (!landmark || landmark.visibility < 0.5) {
        return // Skip low visibility landmarks
      }

      // Find bone by name (flexible matching)
      const bone = this.findBoneByName(bones, jointInfo.name)
      if (!bone) {
        return
      }

      // Calculate rotation based on bone hierarchy
      this.updateBoneRotation(landmark, landmarkIdx, bone, bones, worldLandmarks)
    })

    // Smooth rotations
    this.smoothRotations(bones)

    // Store landmarks for next frame
    this.lastLandmarks = worldLandmarks.map(l => ({ ...l }))
  }

  /**
   * Find bone by name (flexible matching)
   * @param {Array} bones - Three.js bones
   * @param {string} name - Joint name to find
   * @returns {THREE.Bone|null}
   */
  findBoneByName(bones, name) {
    // Try exact match first
    let bone = bones.find(b => b.name.toLowerCase() === name.toLowerCase())
    if (bone) return bone

    // Try partial match (e.g., "LeftShoulder" matches "left_shoulder")
    const nameLower = name.toLowerCase().replace(/_/g, '')
    bone = bones.find(b => {
      const boneName = b.name.toLowerCase().replace(/_/g, '').replace(/ /g, '')
      return boneName.includes(nameLower) || nameLower.includes(boneName)
    })
    if (bone) return bone

    // Try index-based matching
    const jointInfo = Object.values(LANDMARK_TO_JOINT).find(j => j.name === name)
    if (jointInfo && bones[jointInfo.index]) {
      return bones[jointInfo.index]
    }

    return null
  }

  /**
   * Update bone rotation based on landmark position
   * @param {Object} landmark - MediaPipe world landmark
   * @param {number} landmarkIndex - Landmark index
   * @param {THREE.Bone} bone - Three.js bone to update
   * @param {Array} bones - All bones (for hierarchy)
   * @param {Array} worldLandmarks - All world landmarks
   */
  updateBoneRotation(landmark, landmarkIndex, bone, bones, worldLandmarks) {
    // Get parent bone
    const parentBone = bone.parent
    if (!parentBone || !parentBone.isBone) {
      return // Skip if no valid parent
    }

    // Get parent landmark position (or estimate from hierarchy)
    let parentPosition = { x: 0, y: 0, z: 0 }
    
    if (landmarkIndex === POSE_LANDMARKS.LEFT_ELBOW || landmarkIndex === POSE_LANDMARKS.RIGHT_ELBOW) {
      // Elbow: parent is shoulder
      const shoulderIdx = landmarkIndex === POSE_LANDMARKS.LEFT_ELBOW 
        ? POSE_LANDMARKS.LEFT_SHOULDER 
        : POSE_LANDMARKS.RIGHT_SHOULDER
      const shoulderLandmark = worldLandmarks[shoulderIdx]
      if (shoulderLandmark && shoulderLandmark.visibility > 0.5) {
        parentPosition = shoulderLandmark
      }
    } else if (landmarkIndex === POSE_LANDMARKS.LEFT_WRIST || landmarkIndex === POSE_LANDMARKS.RIGHT_WRIST) {
      // Wrist: parent is elbow
      const elbowIdx = landmarkIndex === POSE_LANDMARKS.LEFT_WRIST 
        ? POSE_LANDMARKS.LEFT_ELBOW 
        : POSE_LANDMARKS.RIGHT_ELBOW
      const elbowLandmark = worldLandmarks[elbowIdx]
      if (elbowLandmark && elbowLandmark.visibility > 0.5) {
        parentPosition = elbowLandmark
      }
    } else if (landmarkIndex === POSE_LANDMARKS.LEFT_SHOULDER || landmarkIndex === POSE_LANDMARKS.RIGHT_SHOULDER) {
      // Shoulder: parent is neck/spine (approximate from midpoint)
      const leftShoulder = worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
      const rightShoulder = worldLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
      if (leftShoulder && rightShoulder) {
        parentPosition = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          z: (leftShoulder.z + rightShoulder.z) / 2
        }
      }
    } else if (landmarkIndex === POSE_LANDMARKS.LEFT_HIP || landmarkIndex === POSE_LANDMARKS.RIGHT_HIP) {
      // Hip: parent is pelvis (midpoint of hips)
      const leftHip = worldLandmarks[POSE_LANDMARKS.LEFT_HIP]
      const rightHip = worldLandmarks[POSE_LANDMARKS.RIGHT_HIP]
      if (leftHip && rightHip) {
        parentPosition = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          z: (leftHip.z + rightHip.z) / 2
        }
      }
    } else if (landmarkIndex === POSE_LANDMARKS.LEFT_KNEE || landmarkIndex === POSE_LANDMARKS.RIGHT_KNEE) {
      // Knee: parent is hip
      const hipIdx = landmarkIndex === POSE_LANDMARKS.LEFT_KNEE 
        ? POSE_LANDMARKS.LEFT_HIP 
        : POSE_LANDMARKS.RIGHT_HIP
      const hipLandmark = worldLandmarks[hipIdx]
      if (hipLandmark && hipLandmark.visibility > 0.5) {
        parentPosition = hipLandmark
      }
    } else if (landmarkIndex === POSE_LANDMARKS.LEFT_ANKLE || landmarkIndex === POSE_LANDMARKS.RIGHT_ANKLE) {
      // Ankle: parent is knee
      const kneeIdx = landmarkIndex === POSE_LANDMARKS.LEFT_ANKLE 
        ? POSE_LANDMARKS.LEFT_KNEE 
        : POSE_LANDMARKS.RIGHT_KNEE
      const kneeLandmark = worldLandmarks[kneeIdx]
      if (kneeLandmark && kneeLandmark.visibility > 0.5) {
        parentPosition = kneeLandmark
      }
    }

    // Calculate direction vector from parent to current landmark
    const direction = new THREE.Vector3(
      landmark.x - parentPosition.x,
      landmark.y - parentPosition.y,
      landmark.z - (parentPosition.z || 0)
    ).normalize()

    // Convert direction to rotation (simplified approach)
    // Use lookAt to calculate rotation
    const target = new THREE.Vector3(
      bone.position.x + direction.x,
      bone.position.y + direction.y,
      bone.position.z + direction.z
    )

    // Create temporary object to get rotation
    const tempObject = new THREE.Object3D()
    tempObject.position.copy(bone.position)
    tempObject.lookAt(target)

    // Apply rotation with smoothing
    const rotationKey = bone.uuid || bone.name
    if (!this.smoothedRotations.has(rotationKey)) {
      this.smoothedRotations.set(rotationKey, {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z
      })
    }

    const smoothed = this.smoothedRotations.get(rotationKey)
    smoothed.x = this.smoothingFactor * smoothed.x + (1 - this.smoothingFactor) * tempObject.rotation.x
    smoothed.y = this.smoothingFactor * smoothed.y + (1 - this.smoothingFactor) * tempObject.rotation.y
    smoothed.z = this.smoothingFactor * smoothed.z + (1 - this.smoothingFactor) * tempObject.rotation.z

    // Apply rotation to bone (will be smoothed later)
    bone.userData.targetRotation = {
      x: smoothed.x,
      y: smoothed.y,
      z: smoothed.z
    }
  }

  /**
   * Apply smoothed rotations to bones
   * @param {Array} bones - Three.js skeleton bones
   */
  smoothRotations(bones) {
    bones.forEach(bone => {
      if (bone.userData.targetRotation) {
        bone.rotation.x = bone.userData.targetRotation.x
        bone.rotation.y = bone.userData.targetRotation.y
        bone.rotation.z = bone.userData.targetRotation.z
      }
    })
  }

  /**
   * Reset transformations
   */
  reset() {
    this.smoothedRotations.clear()
    this.lastLandmarks = null
  }

  /**
   * Set smoothing factor (0-1, higher = more smoothing)
   * @param {number} factor
   */
  setSmoothingFactor(factor) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor))
  }
}
