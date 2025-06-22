import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

type OceanConfig = {
  cameraPosition: THREE.Vector3;
  waterSize: number;
  shipScale: number;
  islandScale: number;
  islandPosition: THREE.Vector3;
  waterColor: number;
  sunPositionSpherical: [number, number, number];
  shipSpeed: number;
  shipRockingSpeed: number;
  shipRockingAmount: number;
  shipStopDistance: number;
  shipMinSpeed: number;
  textFadeInDuration: number;
};

export class ThreeOceanManager {
  private static instance: ThreeOceanManager | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private water: Water;
  private sky: Sky;
  private shipRef: THREE.Group | null = null;
  private animationFrameId: number | null = null;
  private shipSpeed: number;
  private shipPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  private config: OceanConfig;
  private assetPaths: any;
  private container: HTMLDivElement | null = null;
  private onShipMove?: (pos: { x: number; y: number; z: number }, speed: number) => void;
  private onCameraMove?: (pos: { x: number; y: number; z: number }) => void;

  private constructor(config: OceanConfig, assetPaths: any) {
    this.config = config;
    this.assetPaths = assetPaths;
    this.shipSpeed = config.shipSpeed;

    // Initialize basic scene objects (but don't attach to DOM yet)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.copy(this.config.cameraPosition);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    (this.renderer as any).outputEncoding = THREE.SRGBColorSpace;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(0, 50, 100);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(100);
    this.scene.add(this.sky);

    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(
      this.config.sunPositionSpherical[0],
      THREE.MathUtils.degToRad(this.config.sunPositionSpherical[1]),
      THREE.MathUtils.degToRad(this.config.sunPositionSpherical[2])
    );
    (this.sky.material.uniforms as any).sunPosition.value.copy(sun);

    // Water
    const waterGeometry = new THREE.PlaneGeometry(this.config.waterSize, this.config.waterSize);
    this.water = new Water(waterGeometry, {
      textureWidth: 256,
      textureHeight: 256,
      waterNormals: new THREE.TextureLoader().load(this.assetPaths.waterNormal, t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: this.config.waterColor,
      distortionScale: 2.5,
      fog: this.scene.fog !== undefined
    });
    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);

    // Load models asynchronously
    this.loadIsland();
    this.loadShip();

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  public static getInstance(config: OceanConfig, assetPaths: any) {
    if (!ThreeOceanManager.instance) {
      ThreeOceanManager.instance = new ThreeOceanManager(config, assetPaths);
    }
    return ThreeOceanManager.instance;
  }

  public attachToDOM(container: HTMLDivElement) {
    this.container = container;
    if (!container.contains(this.renderer.domElement)) {
      container.appendChild(this.renderer.domElement);
    }
    this.startAnimation();
    this.handleResize();
  }

  public detachFromDOM() {
    this.stopAnimation();
    if (this.container) {
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }

  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private loadIsland() {
    const textureLoader = new THREE.TextureLoader();
    const objLoader = new OBJLoader();

    textureLoader.load(this.assetPaths.islandTexture, (islandTexture) => {
      islandTexture.colorSpace = THREE.SRGBColorSpace;
      islandTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const islandMaterial = new THREE.MeshStandardMaterial({
        map: islandTexture,
        metalness: 0.1,
        roughness: 0.8,
      });

      objLoader.load(this.assetPaths.islandModel, (obj) => {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        obj.scale.setScalar(this.config.islandScale);
        obj.position.copy(this.config.islandPosition);

        obj.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = islandMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        this.scene.add(obj);
      });
    });
  }

  private loadShip() {
    const textureLoader = new THREE.TextureLoader();
    const objLoader = new OBJLoader();

    textureLoader.load(this.assetPaths.shipTexture, (shipTexture) => {
      shipTexture.colorSpace = THREE.SRGBColorSpace;
      shipTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const shipMaterial = new THREE.MeshStandardMaterial({
        map: shipTexture,
        metalness: 0.3,
        roughness: 0.7,
      });

      objLoader.load(this.assetPaths.shipModel, (obj) => {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        const scale = this.config.shipScale / Math.max(box.getSize(new THREE.Vector3()).length(), 1);
        obj.scale.setScalar(scale);

        const bottomY = box.min.y * scale;
        obj.position.set(0, -bottomY, 0);
        obj.rotation.y = THREE.MathUtils.degToRad(-290);

        obj.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = shipMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        this.scene.add(obj);
        this.shipRef = obj;
      });
    });
  }

  private animate = (timestamp: number) => {

    // Animate water
    if (this.water) {
      (this.water.material.uniforms as any).time.value += 0.25 / 25.0;
    }

    // Move ship forward
    if (this.shipRef) {
      // Calculate distance to camera's initial Z position
      const distanceToCamera = this.config.cameraPosition.z - this.shipRef.position.z;

      // If ship is approaching the camera's view, slow down
      if (distanceToCamera < this.config.shipStopDistance) {
        // Gradually reduce speed (smooth deceleration)
        this.shipSpeed = Math.max(
          this.config.shipMinSpeed,
          this.shipSpeed * 0.98
        );

        // Stop completely when very close
        if (distanceToCamera < 5) {
          this.shipSpeed = 0;
        }
      }

      // Apply movement with current speed
      this.shipRef.position.z += this.shipSpeed;

      // Rocking motion (reduced when slowing down)
      const rockingIntensity = this.shipSpeed > 0.01 ? 1 :
        (this.shipSpeed / 0.01);

      const rocking = Math.sin(timestamp * this.config.shipRockingSpeed) * rockingIntensity;
      this.shipRef.rotation.z = rocking * 0.08;
      this.shipRef.rotation.x = Math.sin(timestamp * this.config.shipRockingSpeed * 0.7) * 0.03 * rockingIntensity;
      this.shipRef.position.y = -0.5 + rocking * this.config.shipRockingAmount;
      this.shipRef.position.y += Math.sin(timestamp * 0.0015) * 0.15 * rockingIntensity;

      // Update ship position
      this.shipPosition = {
        x: this.shipRef.position.x,
        y: this.shipRef.position.y,
        z: this.shipRef.position.z
      };
      if (this.onShipMove) this.onShipMove(this.shipPosition, this.shipSpeed);
    }

    // Emit camera info if needed
    if (this.onCameraMove) {
      const pos = this.camera.position;
      this.onCameraMove({ x: pos.x, y: pos.y, z: pos.z });
    }

    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public setShipMoveListener(fn: (pos: { x: number; y: number; z: number }, speed: number) => void) {
    this.onShipMove = fn;
  }

  public setCameraMoveListener(fn: (pos: { x: number; y: number; z: number }) => void) {
    this.onCameraMove = fn;
  }

  public startAnimation() {
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  }

  public stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getShipPosition() {
    return this.shipPosition;
  }
  public getShipSpeed() {
    return this.shipSpeed;
  }
  public getCameraPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
  }
}