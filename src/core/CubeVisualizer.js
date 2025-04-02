// Import Three.js using relative path (Temporary diagnostic step - Bundler recommended)
import * as THREE from '../../node_modules/three/build/three.module.js'

// Export the class so it can be imported elsewhere
export default class CubeVisualizer {
  constructor(canvasElement) {
    // No need to check if THREE is loaded, static import handles this.
    console.log('Initializing CubeVisualizer')
    this.canvas = canvasElement
    this.scene = null
    this.camera = null
    this.renderer = null
    this.cube = null
    this.currentVolume = 0.0 // Raw volume level (0-1)
    this.targetOpacity = 0.1 // Target opacity based on volume
    this.currentOpacity = 0.1 // Current smoothed opacity
    this.targetScale = 1.0 // Target scale based on volume
    this.currentScale = 1.0 // Current smoothed scale
    this.opacitySmoothingFactor = 0.1 // Revert to match scale damping
    this.scaleSmoothingFactor = 0.1 // Keep scale damping as is

    this.init()
    this.animate() // Start animation loop
  }

  init() {
    // --- Scene Setup ---
    this.scene = new THREE.Scene()
    this.scene.background = null // Explicitly set scene background to null

    // --- Camera Setup ---
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.z = 5 // Move camera further back to see the larger cube

    // --- Renderer Setup ---
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true, // Enable transparency
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x000000, 0) // Set clear color to black with 0 alpha (transparent)

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6) // Soft white light
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8) // White directional light
    directionalLight.position.set(1, 1, 1).normalize()
    this.scene.add(directionalLight)

    // --- Cube Geometry and Material ---
    this.cubeSize = 2 // Make cube 4x bigger (0.5 * 4 = 2)
    const geometry = new THREE.BoxGeometry(
      this.cubeSize,
      this.cubeSize,
      this.cubeSize
    )
    // Make material transparent, set color to RED, and set initial opacity
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red base color
      transparent: true,
      opacity: this.currentOpacity, // Use smoothed opacity state
    })
    this.cube = new THREE.Mesh(geometry, material)
    this.scene.add(this.cube)
    // Cube will be centered at (0,0,0) by default

    // --- Event Listeners ---
    // Use arrow function to maintain 'this' context
    window.addEventListener('resize', this.onWindowResize.bind(this), false)
    console.log('Three.js initialization complete within CubeVisualizer')
  }

  animate() {
    // Use arrow function to maintain 'this' context for requestAnimationFrame
    requestAnimationFrame(this.animate.bind(this))

    // Rotate the cube and update opacity based on volume
    if (this.cube) {
      this.cube.rotation.x += 0.01
      this.cube.rotation.y += 0.01

      // --- Damping Logic (User Suggestion with separate factors) ---
      // Opacity (More damping)
      this.currentOpacity +=
        (this.targetOpacity - this.currentOpacity) * this.opacitySmoothingFactor
      this.cube.material.opacity = this.currentOpacity

      // Scale (Less damping)
      this.currentScale +=
        (this.targetScale - this.currentScale) * this.scaleSmoothingFactor
      this.cube.scale.set(
        this.currentScale,
        this.currentScale,
        this.currentScale
      )
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  onWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      // No longer need to update cube position on resize, it stays centered
    }
  }

  // Removed updateCubePosition method

  // Method to change cube color based on state (Now uses shades of red)
  setRecordingState(isRecording) {
    if (this.cube) {
      // Keep it red, maybe slightly brighter when recording? Or just keep it red.
      // Let's keep it simple for now and just ensure it stays red.
      // If a visual distinction is needed later, we can adjust brightness/emissiveness.
      this.cube.material.color.setHex(0xff0000) // Always red
      console.log(`Cube recording state: ${isRecording} (Color remains red)`)
    }
  }

  // Method to receive volume updates and set the target opacity
  updateVolume(volumeLevel) {
    // Clamp volume between 0 and 1
    this.currentVolume = Math.max(0, Math.min(1, volumeLevel))

    // Map volume (0-1) to target opacity (e.g., 0.1 to 1.0)
    const minOpacity = 0.1
    const maxOpacity = 1.0
    this.targetOpacity =
      minOpacity + this.currentVolume * (maxOpacity - minOpacity)

    // Map volume (0-1) to target scale (e.g., 0.8 to 1.2)
    const minScale = 0.8
    const maxScale = 1.2
    this.targetScale = minScale + this.currentVolume * (maxScale - minScale)
    // console.log(`CubeVisualizer volume: ${this.currentVolume}, targetOpacity: ${this.targetOpacity}, targetScale: ${this.targetScale}`); // Debugging
  }
}
