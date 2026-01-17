import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export class BodyMeshManager {
  constructor(scene) {
    this.scene = scene
    this.bodyMesh = null
    this.bodyGroup = null
    this.skeleton = null
    this.bones = null
    this.isLoaded = false
    this.loader = new GLTFLoader()
    this.avatarId = null
  }

  /**
   * Load body mesh
   * @param {string} avatarId - Avatar ID
   * @returns {Promise<void>}
   */
  async loadMesh(avatarId) {
    try {
      if (this.bodyGroup) {
        // Remove existing mesh
        this.removeMesh()
      }

      this.avatarId = avatarId
      console.log('Loading body mesh for avatar:', avatarId)

      // Download mesh from backend
      const response = await axios.get(`${API_BASE_URL}/api/avatar-mesh/${avatarId}`, {
        responseType: 'blob'
      })

      // Create object URL from blob
      const blobUrl = URL.createObjectURL(response.data)

      // Load GLB model
      const gltf = await this.loader.loadAsync(blobUrl)

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl)

      console.log('Body mesh loaded:', gltf)
      console.log('Scene contains', gltf.scene.children.length, 'children')

      // Create group to hold the body mesh
      this.bodyGroup = new THREE.Group()
      
      // Clone the scene so we can modify it independently
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          // Configure mesh for AR rendering
          child.castShadow = true
          child.receiveShadow = true
          
          // Set material properties
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                material.needsUpdate = true
                // Make body mesh semi-transparent or hidden initially
                // We'll make it visible when needed
              }
            })
          }
          
          // Set render order
          child.renderOrder = 100 // Lower than clothing (999)
        }
      })

      // Extract skeleton if available
      if (gltf.scene) {
        gltf.scene.traverse((child) => {
          if (child.isSkinnedMesh && child.skeleton) {
            this.skeleton = child.skeleton
            this.bones = child.skeleton.bones
            console.log('Found skeleton with', this.bones.length, 'bones')
            
            // Store reference to the skinned mesh
            this.bodyMesh = child
          }
        })
      }

      // Add the entire scene to our group
      this.bodyGroup.add(gltf.scene)
      
      // Initially hidden until we're ready to show it
      this.bodyGroup.visible = false
      this.bodyGroup.renderOrder = 100
      
      // Add to scene
      this.scene.add(this.bodyGroup)

      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(this.bodyGroup)
      const size = box.getSize(new THREE.Vector3())
      console.log('Body mesh bounding box size:', size)

      this.isLoaded = true
      console.log('Body mesh successfully loaded and added to scene')
      
      return { skeleton: this.skeleton, bones: this.bones, mesh: this.bodyMesh }
    } catch (error) {
      console.error('Error loading body mesh:', error)
      this.isLoaded = false
      throw error
    }
  }

  /**
   * Set mesh visibility
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (this.bodyGroup) {
      this.bodyGroup.visible = visible
    }
  }

  /**
   * Get skeleton bones for transformation
   * @returns {Array<THREE.Bone>|null}
   */
  getBones() {
    return this.bones
  }

  /**
   * Get skeleton for animation
   * @returns {THREE.Skeleton|null}
   */
  getSkeleton() {
    return this.skeleton
  }

  /**
   * Get body mesh
   * @returns {THREE.Group|null}
   */
  getMesh() {
    return this.bodyGroup
  }

  /**
   * Get skinned mesh
   * @returns {THREE.SkinnedMesh|null}
   */
  getSkinnedMesh() {
    return this.bodyMesh
  }

  /**
   * Update skeleton (call after bone transformations)
   */
  updateSkeleton() {
    if (this.skeleton) {
      this.skeleton.update()
    }
  }

  /**
   * Check if mesh is loaded
   * @returns {boolean}
   */
  isMeshLoaded() {
    return this.isLoaded && this.bodyGroup !== null
  }

  /**
   * Remove mesh from scene
   */
  removeMesh() {
    if (this.bodyGroup) {
      // Dispose of geometries and materials
      this.bodyGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose()
          }
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              if (material.map) material.map.dispose()
              if (material.normalMap) material.normalMap.dispose()
              if (material.roughnessMap) material.roughnessMap.dispose()
              if (material.metalnessMap) material.metalnessMap.dispose()
              material.dispose()
            })
          }
        }
      })

      this.scene.remove(this.bodyGroup)
      this.bodyGroup = null
      this.bodyMesh = null
      this.skeleton = null
      this.bones = null
      this.isLoaded = false
      this.avatarId = null
    }
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.removeMesh()
  }
}
