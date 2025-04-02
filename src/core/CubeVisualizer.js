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
    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa }) // Grey color
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

    // Rotate the cube
    if (this.cube) {
      this.cube.rotation.x += 0.01
      this.cube.rotation.y += 0.01
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

  // Optional method to change cube color based on state
  setRecordingState(isRecording) {
    if (this.cube) {
      this.cube.material.color.setHex(isRecording ? 0xff0000 : 0xaaaaaa) // Red when recording, grey otherwise
      console.log(`Cube color set for recording state: ${isRecording}`)
    }
  }
}
