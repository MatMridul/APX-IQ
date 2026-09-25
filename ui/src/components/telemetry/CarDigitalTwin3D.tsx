"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  RotateCcw,
  Layers,
  Eye,
  Sparkles,
  Wind,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUxStore } from "@/store/uxStore";

interface CarDigitalTwin3DProps {
  speed?: number; // km/h (0 - 360)
  throttle?: number; // % (0 - 100)
  brake?: number; // % (0 - 100)
  steerAngle?: number; // degrees (-30 to +30)
  rpm?: number;
  gear?: number | string;
  tyreTemps?: {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
  };
  gForceLat?: number; // lateral G (-5 to +5)
  gForceLon?: number; // longitudinal G (-5 to +5)
  drsActive?: boolean;
  // Aerodynamic & Ground-Effect Telemetry (MotionEx + CarDamage + CarSetups)
  wheelVertForce?: number[]; // [RL, RR, FL, FR] vertical downforce load (N)
  frontAeroHeight?: number;  // mm (Ground-effect clearance)
  rearAeroHeight?: number;   // mm (Ground-effect clearance)
  chassisPitch?: number;     // rad
  chassisRoll?: number;      // rad
  aeroDamage?: {
    frontLeftWing?: number;
    frontRightWing?: number;
    rearWing?: number;
    floor?: number;
    diffuser?: number;
    sidepod?: number;
  };
  className?: string;
}

type CameraPreset = "ISOMETRIC" | "CHASE" | "SIDE" | "TOP" | "FRONT" | "COCKPIT";

export function CarDigitalTwin3D({
  speed = 268,
  throttle = 92,
  brake = 0,
  steerAngle = -4.5,
  rpm = 11400,
  gear = 7,
  tyreTemps = { fl: 104, fr: 108, rl: 99, rr: 102 },
  gForceLat = -2.4,
  gForceLon = 0.9,
  drsActive = false,
  wheelVertForce = [3150, 3200, 3950, 4020],
  frontAeroHeight = 24.5,
  rearAeroHeight = 58.2,
  chassisPitch = -0.015,
  chassisRoll = 0.024,
  aeroDamage = { frontLeftWing: 0, frontRightWing: 0, rearWing: 0, floor: 0, diffuser: 0, sidepod: 0 },
  className,
}: CarDigitalTwin3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showAeroFlow, setShowAeroFlow] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeCamPreset, setActiveCamPreset] = useState<CameraPreset>("ISOMETRIC");
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  // Telemetry values ref for smooth animation without recreating scene
  const telemetryRef = useRef({
    speed,
    throttle,
    brake,
    steerAngle,
    gForceLat,
    gForceLon,
    drsActive: drsActive || speed > 260,
    wheelVertForce,
    frontAeroHeight,
    rearAeroHeight,
    chassisPitch,
    chassisRoll,
    aeroDamage,
  });

  const mouseOffsetRef = useRef({ x: 0, y: 0 });

  const showAeroFlowRef = useRef(showAeroFlow);
  useEffect(() => {
    showAeroFlowRef.current = showAeroFlow;
  }, [showAeroFlow]);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    telemetryRef.current = {
      speed,
      throttle,
      brake,
      steerAngle,
      gForceLat,
      gForceLon,
      drsActive: drsActive || speed > 260,
      wheelVertForce,
      frontAeroHeight,
      rearAeroHeight,
      chassisPitch,
      chassisRoll,
      aeroDamage,
    };
  }, [
    speed,
    throttle,
    brake,
    steerAngle,
    gForceLat,
    gForceLon,
    drsActive,
    wheelVertForce,
    frontAeroHeight,
    rearAeroHeight,
    chassisPitch,
    chassisRoll,
    aeroDamage,
  ]);

  // Scene references
  const sceneElementsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    carRoot: THREE.Group;
    bodyGroup: THREE.Object3D | null;
    wheels: {
      fl: { root: THREE.Object3D; basePos: THREE.Vector3; spinnerAngle: number };
      fr: { root: THREE.Object3D; basePos: THREE.Vector3; spinnerAngle: number };
      rl: { root: THREE.Object3D; basePos: THREE.Vector3; spinnerAngle: number };
      rr: { root: THREE.Object3D; basePos: THREE.Vector3; spinnerAngle: number };
    };
    brakeMaterials: THREE.MeshStandardMaterial[];
    aeroParticles: THREE.Points;
    aeroLines?: THREE.LineSegments;
    particleGeo: THREE.BufferGeometry;
    lineGeo?: THREE.BufferGeometry;
    particleMat?: THREE.PointsMaterial;
    lineMat?: THREE.LineBasicMaterial;
    particleSpeeds: Float32Array;
    particleCount: number;
    animId: number;
  } | null>(null);

  // Initialize Scene & Load Ferrari SF1000 Model
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 480;

    // 1. Scene & Motorsport Studio Environment (Linear fog: keeps car 100% bright, fades far grid)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.Fog(0x06070a, 15, 45);

    // 2. Camera Setup (Closer Hero Framing)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(4.0, 1.85, 4.3);

    // 3. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "default",
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = false; // Disabled to prevent GPU hang on complex CAD models

    // Graceful WebGL context loss handling
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      console.warn("APX-IQ // WebGL context lost, recovering...");
    });

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Smooth OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.35, -0.2);
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera under ground
    controls.minDistance = 2.0;
    controls.maxDistance = 20;

    // 5. Motorsport Cinematic Lighting Rig (High-Contrast Focused Studio Rig)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
    scene.add(ambientLight);

    // High-power Key Light casting clear specular highlights along body curves
    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    mainKeyLight.position.set(4, 7, 5);
    scene.add(mainKeyLight);

    // Cross-angle Fill Light
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.8);
    fillLight.position.set(-5, 6, 3);
    scene.add(fillLight);

    // Forward Key Light illuminating nose cone and front wing cascades
    const frontNoseLight = new THREE.DirectionalLight(0xffffff, 1.6);
    frontNoseLight.position.set(0, 3, 6);
    scene.add(frontNoseLight);

    // Overhead Skylight outlining halo and cockpit perimeter
    const topOverheadLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topOverheadLight.position.set(0, 9, -0.5);
    scene.add(topOverheadLight);

    const cyanRim = new THREE.DirectionalLight(0x00f5d4, 0.85);
    cyanRim.position.set(-6, 4, -5);
    scene.add(cyanRim);

    const goldUnderglow = new THREE.DirectionalLight(0xd4af37, 1.0);
    goldUnderglow.position.set(0, -1, 3);
    scene.add(goldUnderglow);

    const rearRedAccent = new THREE.PointLight(0xef4444, 1.8, 6);
    rearRedAccent.position.set(0, 0.5, -2.5);
    scene.add(rearRedAccent);

    // 6. Ground Runway Grid & Ultra-Lightweight Ambient Shadow Plane
    const grid = new THREE.GridHelper(24, 24, 0xd4af37, 0x1a202c);
    grid.position.y = 0;
    scene.add(grid);

    // Dynamic contact shadow plane under the car body (zero GPU overhead)
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext("2d");
    if (shadowCtx) {
      const gradient = shadowCtx.createRadialGradient(64, 128, 10, 64, 128, 60);
      gradient.addColorStop(0, "rgba(0,0,0,0.85)");
      gradient.addColorStop(0.5, "rgba(0,0,0,0.45)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      shadowCtx.fillStyle = gradient;
      shadowCtx.fillRect(0, 0, 128, 256);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowGeo = new THREE.PlaneGeometry(2.4, 5.2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005;
    scene.add(contactShadow);

    // 7. Car Hierarchy Container
    const carRoot = new THREE.Group();
    carRoot.name = "Car_Digital_Twin_Root";
    scene.add(carRoot);

    const brakeMaterials: THREE.MeshStandardMaterial[] = [];

    // Helper to create glowing brake disc inside wheel hub
    const createBrakeRotor = () => {
      const rotorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24);
      rotorGeo.rotateZ(Math.PI / 2);
      const rotorMat = new THREE.MeshStandardMaterial({
        color: 0x1f242d,
        roughness: 0.35,
        metalness: 0.9,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
      });
      brakeMaterials.push(rotorMat);
      const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
      return { mesh: rotorMesh, mat: rotorMat };
    };

    // Shared Motorsport PBR Materials Palette (General FIA Prototype Livery)
    // 1. Primary Monocoque & Sidepod Bodywork: Deep Gloss Anthracite Gunmetal
    const matChassisBody = new THREE.MeshStandardMaterial({
      name: "Livery_Technical_Gunmetal",
      color: 0x242834,
      roughness: 0.22,
      metalness: 0.55,
    });

    // 2. High-Tech Aerodynamic Two-Tone Spine & Cowl: Satin Platinum Titanium
    const matSpineSilver = new THREE.MeshStandardMaterial({
      name: "Livery_Platinum_Spine",
      color: 0x727c8e,
      roughness: 0.22,
      metalness: 0.72,
    });

    // 3. Telemetry Livery Highlight Accents (Nose cone & wingtips): Apex Amber Gold
    const matLiveryAccent = new THREE.MeshStandardMaterial({
      name: "Livery_Apex_Gold",
      color: 0xf59e0b,
      roughness: 0.18,
      metalness: 0.85,
    });

    // 4. Wings, Floor, Diffuser, Halo & Ground Effect Strakes: Raw 3K Matte Carbon Fiber
    const matCarbonFiber = new THREE.MeshStandardMaterial({
      name: "Twill_CarbonFiber",
      color: 0x121417,
      roughness: 0.65,
      metalness: 0.20,
    });

    // 5. Internal Sidepod Heat Exchangers / Radiator Core: Dark Textured Alloy
    const matInternalRadiator = new THREE.MeshStandardMaterial({
      name: "Internal_Radiator_Core",
      color: 0x181c24,
      roughness: 0.68,
      metalness: 0.45,
    });

    // 6. Suspension Wishbones, Pushrods, Uprights: Aerospace Brushed Titanium
    const matTitanium = new THREE.MeshStandardMaterial({
      name: "Brushed_Titanium",
      color: 0x8a94a4,
      roughness: 0.20,
      metalness: 0.95,
    });

    // 7. Cockpit Cell & Anti-Glare Cowl: Ultra-Matte Deep Black
    const matCockpitDark = new THREE.MeshStandardMaterial({
      name: "Cockpit_AntiGlare",
      color: 0x0c0e12,
      roughness: 0.92,
      metalness: 0.05,
    });

    // 8. Wheels & Rims: Pirelli Slicks & Forged BBS Rims
    const matTireRubber = new THREE.MeshStandardMaterial({
      name: "Pirelli_Slick_Rubber",
      color: 0x131518,
      roughness: 0.90,
      metalness: 0.05,
    });

    const matWheelRim = new THREE.MeshStandardMaterial({
      name: "BBS_Forged_Rim",
      color: 0x1f232b,
      roughness: 0.32,
      metalness: 0.85,
    });

    const matCenterLock = new THREE.MeshStandardMaterial({
      name: "Anodized_CenterLock",
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.85,
    });

    // Wheel references container
    const wheelRefs: Record<"fl" | "fr" | "rl" | "rr", { root: THREE.Object3D; basePos: THREE.Vector3; spinnerAngle: number }> = {
      fl: { root: new THREE.Group(), basePos: new THREE.Vector3(-0.78, 0.54, 1.33), spinnerAngle: 0 },
      fr: { root: new THREE.Group(), basePos: new THREE.Vector3(0.78, 0.54, 1.33), spinnerAngle: 0 },
      rl: { root: new THREE.Group(), basePos: new THREE.Vector3(-0.78, 0.56, -1.79), spinnerAngle: 0 },
      rr: { root: new THREE.Group(), basePos: new THREE.Vector3(0.78, 0.56, -1.79), spinnerAngle: 0 },
    };

    let bodyGroupRef: THREE.Object3D | null = null;

    // 8. Load Optimized Formula 1 GLB CAD Asset
    const loader = new GLTFLoader();
    // Defer to avoid synchronous setState within effect body
    setTimeout(() => setModelLoading(true), 0);

    loader.load(
      "/models/ferrari_sf1000.glb",
      (gltf) => {
        const loadedModel = gltf.scene;

        // Strip any embedded lights from CAD export to prevent overexposure
        const lightsToRemove: THREE.Object3D[] = [];
        loadedModel.traverse((child) => {
          if ((child as unknown as { isLight?: boolean }).isLight) {
            lightsToRemove.push(child);
          }
        });
        lightsToRemove.forEach((l) => l.parent?.remove(l));

        loadedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const lower = (child.name || "").toLowerCase();

            // A. Wheels, Rims, and Centerlocks
            if (lower.includes("circle001") || lower.includes("circle003")) {
              child.material = matTireRubber;
            } else if (lower.includes("circle002") || lower.includes("circle004")) {
              child.material = matWheelRim;
            } else if (lower.includes("circle005") || lower.includes("circle007")) {
              child.material = matCenterLock;
            }
            // B. Internal Radiators & Heat Exchangers (Dark intercooler mesh)
            else if (
              lower.includes("cube001") ||
              lower.includes("cube002")
            ) {
              child.material = matInternalRadiator;
            }
            // C. Telemetry Livery Highlight Accents (Apex Gold on nose tip & wing endplates)
            else if (
              lower.includes("plane011") ||
              lower.includes("plane006") ||
              lower.includes("cube007")
            ) {
              child.material = matLiveryAccent;
            }
            // D. Aerodynamic Downforce Surfaces & Undertray Floor (Raw Carbon Fiber)
            else if (
              lower.includes("wing") ||
              lower.includes("plane015") || lower.includes("plane016") || lower.includes("plane017") || lower.includes("plane018") ||
              lower.includes("plane019") || lower.includes("plane020") || lower.includes("plane021") || lower.includes("plane022") ||
              lower.includes("plane024") || lower.includes("plane025") || lower.includes("plane026") || lower.includes("plane027") ||
              lower.includes("plane031") ||
              lower.includes("diffuser") || lower.includes("floor") || lower.includes("halo") ||
              lower.includes("curve006") || lower.includes("curve001") || lower.includes("curve004") || lower.includes("curve") ||
              lower.includes("cube004") || lower.includes("cube006") || lower.includes("cube008") || lower.includes("plane003") ||
              lower === "cylinder002" || lower === "cylinder001" || lower === "cylinder013" ||
              lower === "cylinder005" || lower === "cylinder003" || lower === "cylinder010" ||
              lower === "cylinder011" || lower === "cylinder012" || lower === "cylinder"
            ) {
              child.material = matCarbonFiber;
            }
            // E. Mechanical Suspension Wishbones, Pushrods, Steering Links (Aerospace Titanium)
            else if (
              lower.includes("cylinder") ||
              lower.includes("susp") ||
              lower.includes("rod") ||
              lower.includes("exhaust")
            ) {
              child.material = matTitanium;
            }
            // F. Cockpit Interior & Anti-Glare Cowl
            else if (lower.includes("plane013") || lower.includes("torus")) {
              child.material = matCockpitDark;
            }
            // G. Primary Monocoque & Sculpted Sidepod Bodywork (Technical Satin Gunmetal)
            else {
              child.material = matChassisBody;
            }
          }

          if (child.name === "Car_Body") {
            bodyGroupRef = child;
          } else if (child.name === "Wheel_FL") {
            wheelRefs.fl.root = child;
            wheelRefs.fl.basePos.copy(child.position);
            const { mesh } = createBrakeRotor();
            child.add(mesh);
          } else if (child.name === "Wheel_FR") {
            wheelRefs.fr.root = child;
            wheelRefs.fr.basePos.copy(child.position);
            const { mesh } = createBrakeRotor();
            child.add(mesh);
          } else if (child.name === "Wheel_RL") {
            wheelRefs.rl.root = child;
            wheelRefs.rl.basePos.copy(child.position);
            const { mesh } = createBrakeRotor();
            child.add(mesh);
          } else if (child.name === "Wheel_RR") {
            wheelRefs.rr.root = child;
            wheelRefs.rr.basePos.copy(child.position);
            const { mesh } = createBrakeRotor();
            child.add(mesh);
          }
        });

        carRoot.add(loadedModel);
        setModelLoading(false);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percent = (xhr.loaded / xhr.total) * 100;
          setLoadProgress(Math.round(percent));
        }
      },
      (err) => {
        console.warn("Could not load /models/ferrari_sf1000.glb, rendering high-precision fallback:", err);
        setModelLoading(false);
      }
    );

    // 9. Calibrated Wind Tunnel CFD Airflow Streamlines (Analytical Potential Flow)
    interface StreamlineRake {
      x: number;
      y: number;
      zStart: number;
      spread: number;
      type: "nose-spine" | "venturi-floor" | "tyre-outwash" | "wing-outwash" | "sidepod-undercut" | "sidepod-ramp" | "rear-wing-vortex";
    }

    const STREAMLINE_RAKES: StreamlineRake[] = [
      // 1 & 2: Centerline Nose Bridge & Airbox Spine (upwash over nose, splits at halo, crests airbox)
      { x: -0.05, y: 0.32, zStart: 3.4, spread: 0.015, type: "nose-spine" },
      { x:  0.05, y: 0.32, zStart: 3.4, spread: 0.015, type: "nose-spine" },

      // 3 & 4: Front Wing Flap Y250 & Underfloor Venturi Ingestion (ground-effect suction, diffuser upwash)
      { x: -0.26, y: 0.12, zStart: 3.4, spread: 0.020, type: "venturi-floor" },
      { x:  0.26, y: 0.12, zStart: 3.4, spread: 0.020, type: "venturi-floor" },

      // 5 & 6: Front Tyre Impingement & Outwash Deflection (lateral divergence, tyre crown lift)
      { x: -0.74, y: 0.36, zStart: 3.2, spread: 0.030, type: "tyre-outwash" },
      { x:  0.74, y: 0.36, zStart: 3.2, spread: 0.030, type: "tyre-outwash" },

      // 7 & 8: Outer Front Wing Tip Vortex & Outboard Flank
      { x: -0.94, y: 0.22, zStart: 3.2, spread: 0.020, type: "wing-outwash" },
      { x:  0.94, y: 0.22, zStart: 3.2, spread: 0.020, type: "wing-outwash" },

      // 9 & 10: Sidepod Undercut & Coke-Bottle Contouring (radiator undercut, Coanda inward pull)
      { x: -0.42, y: 0.22, zStart: 2.8, spread: 0.025, type: "sidepod-undercut" },
      { x:  0.42, y: 0.22, zStart: 2.8, spread: 0.025, type: "sidepod-undercut" },

      // 11 & 12: Sidepod Shoulder & Engine Cowl Downwash
      { x: -0.52, y: 0.48, zStart: 2.6, spread: 0.025, type: "sidepod-ramp" },
      { x:  0.52, y: 0.48, zStart: 2.6, spread: 0.025, type: "sidepod-ramp" },

      // 13 & 14: Cockpit Flank & Rear Wing Mainplane / Endplate Tip Vortex
      { x: -0.46, y: 0.72, zStart: 2.4, spread: 0.020, type: "rear-wing-vortex" },
      { x:  0.46, y: 0.72, zStart: 2.4, spread: 0.020, type: "rear-wing-vortex" },
    ];

    const particlesPerRake = 10;
    const particleCount = STREAMLINE_RAKES.length * particlesPerRake; // 140 particles

    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const prevPositions = new Float32Array(particleCount * 3);
    const particleRakeIdx = new Uint8Array(particleCount);

    // Dynamic Streamline Line Segments (Head + Tail per particle)
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * 2 * 3);
    const lineColors = new Float32Array(particleCount * 2 * 3);

    for (let r = 0; r < STREAMLINE_RAKES.length; r++) {
      const rake = STREAMLINE_RAKES[r];
      for (let p = 0; p < particlesPerRake; p++) {
        const i = r * particlesPerRake + p;
        particleRakeIdx[i] = r;

        // Distribute initial particles along the length of each stream from front (+3.4) to rear (-4.0)
        const zFraction = p / particlesPerRake;
        const initialZ = rake.zStart - zFraction * 7.4 + (Math.random() - 0.5) * 0.2;
        const initialX = rake.x + (Math.random() - 0.5) * rake.spread;
        const initialY = rake.y + (Math.random() - 0.5) * rake.spread;

        particlePositions[i * 3 + 0] = initialX;
        particlePositions[i * 3 + 1] = initialY;
        particlePositions[i * 3 + 2] = initialZ;

        prevPositions[i * 3 + 0] = initialX;
        prevPositions[i * 3 + 1] = initialY;
        prevPositions[i * 3 + 2] = initialZ + 0.15;

        particleSpeeds[i] = 0.07 + Math.random() * 0.03;

        // Initial line vertices
        linePositions[i * 6 + 0] = initialX;
        linePositions[i * 6 + 1] = initialY;
        linePositions[i * 6 + 2] = initialZ;
        linePositions[i * 6 + 3] = initialX;
        linePositions[i * 6 + 4] = initialY;
        linePositions[i * 6 + 5] = initialZ + 0.15;

        // Initial cyan colors
        lineColors[i * 6 + 0] = 0.0;
        lineColors[i * 6 + 1] = 0.96;
        lineColors[i * 6 + 2] = 0.83;
        lineColors[i * 6 + 3] = 0.0;
        lineColors[i * 6 + 4] = 0.28;
        lineColors[i * 6 + 5] = 0.24;
      }
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 0.048,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
    });
    const aeroParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(aeroParticles);

    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const aeroLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(aeroLines);

    // Pre-allocated palette colors for zero-allocation lerping
    const COLOR_CYAN = new THREE.Color(0x00f5d4);
    const COLOR_CRIMSON = new THREE.Color(0xff3359);

    // 10. Animation & Physics Simulation Loop
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const animId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const cur = telemetryRef.current;

      // 1. CFD Airflow Streamlines: Analytical Potential Flow Vector Field
      if (showAeroFlowRef.current && aeroParticles && aeroLines) {
        aeroParticles.visible = true;
        aeroLines.visible = true;

        const positions = particleGeo.attributes.position.array as Float32Array;
        const linePos = lineGeo.attributes.position.array as Float32Array;
        const lineCols = lineGeo.attributes.color.array as Float32Array;

        // Downforce (N) from Packet 13 MotionEx or derived quadratic curve
        const hasRealVertForce = cur.wheelVertForce && cur.wheelVertForce.length === 4 && cur.wheelVertForce[0] > 0;
        const totalDownforceN = hasRealVertForce
          ? cur.wheelVertForce.reduce((a, b) => a + b, 0)
          : Math.pow(Math.max(10, cur.speed) / 100, 2) * 6200;

        // Aerodynamic damage detection from Packet 10
        const floorDam = cur.aeroDamage?.floor ?? 0;
        const diffDam = cur.aeroDamage?.diffuser ?? 0;
        const leftWingDam = cur.aeroDamage?.frontLeftWing ?? 0;
        const rightWingDam = cur.aeroDamage?.frontRightWing ?? 0;
        const isGeneralAeroCompromised = floorDam > 15 || diffDam > 15 || leftWingDam > 20 || rightWingDam > 20;

        // Base particle flow velocity proportional to car speed & downforce
        const flowVelocity = Math.max(0.40, (totalDownforceN / 14000) * 2.2);

        // Target steer angle in radians for front tyre wake deflections
        const targetSteerRad = (-cur.steerAngle * Math.PI) / 180;

        // Global color modulation for particle points
        if (isGeneralAeroCompromised) {
          particleMat.color.lerp(COLOR_CRIMSON, 0.08);
        } else {
          particleMat.color.lerp(COLOR_CYAN, 0.08);
        }

        for (let i = 0; i < particleCount; i++) {
          const rIdx = particleRakeIdx[i];
          const rake = STREAMLINE_RAKES[rIdx];

          // Advance along -Z
          positions[i * 3 + 2] -= particleSpeeds[i] * flowVelocity;

          let x = positions[i * 3 + 0];
          let y = positions[i * 3 + 1];
          let z = positions[i * 3 + 2];

          // Reset particle to rake nozzle upstream when passing beyond the rear
          if (z < -4.2) {
            z = rake.zStart + Math.random() * 0.4;
            x = rake.x + (Math.random() - 0.5) * rake.spread;
            y = rake.y + (Math.random() - 0.5) * rake.spread;
            prevPositions[i * 3 + 0] = x;
            prevPositions[i * 3 + 1] = y;
            prevPositions[i * 3 + 2] = z + 0.15;
          } else {
            // Apply Analytical Potential Flow Deflections

            // A. Nose Cone & Front Bulkhead Deflection (Z: 2.6 -> 0.7)
            if (z < 2.6 && z > 0.7) {
              const tNose = (2.6 - z) / 1.9;
              const noseHeight = 0.28 + 0.28 * tNose;
              const noseWidth = 0.16 + 0.18 * tNose;

              if (Math.abs(x) < noseWidth && y < noseHeight + 0.05 && y > 0.10) {
                if (y >= noseHeight - 0.08) {
                  y = noseHeight + 0.05; // Curve up over nose bridge
                } else {
                  x = Math.sign(x || 0.01) * (noseWidth + 0.04); // Part outwash laterally
                }
              }
            }

            // B. Front Wheels Bluff-Body Obstacle (Z: 1.70 -> 0.95)
            const fwRadius = 0.36;
            const fwHalfWidth = 0.22;
            const fwZ = 1.33;
            const fwY = 0.54;

            for (const fwX of [-0.78, 0.78]) {
              const dx = x - fwX;
              const dy = y - fwY;
              const dz = z - fwZ;
              const distYZ = Math.sqrt(dy * dy + dz * dz);

              if (Math.abs(dx) < fwHalfWidth + 0.06 && distYZ < fwRadius + 0.06 && z > 0.95) {
                const steerLateralBias = targetSteerRad * 0.18;
                if (Math.abs(x) >= Math.abs(fwX) - 0.04) {
                  x = Math.sign(fwX) * (Math.abs(fwX) + fwHalfWidth + 0.06) + steerLateralBias;
                } else {
                  x = Math.sign(fwX) * (Math.abs(fwX) - fwHalfWidth - 0.05);
                }
                if (y > fwY - 0.10) {
                  const crownY = fwY + Math.sqrt(Math.max(0, (fwRadius + 0.06) ** 2 - dz * dz));
                  y = Math.max(y, crownY);
                }
              }
            }

            // C. Cockpit Opening, Halo V-Pillar & Engine Airbox (Z: 0.7 -> -0.2)
            if (z < 0.7 && z > -0.2) {
              if (z > 0.25 && z < 0.50 && Math.abs(x) < 0.09 && y > 0.55 && y < 0.88) {
                x = Math.sign(x === 0 ? 0.01 : x) * 0.11;
              }
              if (Math.abs(x) < 0.28 && y > 0.65 && y < 0.98) {
                if (y >= 0.70) {
                  y = Math.max(y, 1.00); // Crest over roll-hoop airbox
                } else {
                  x = Math.sign(x || 0.01) * 0.32; // Channel into sidepod flanks
                }
              }
            }

            // D. Sidepod Undercuts & Coke-Bottle Sculpting (Z: 0.8 -> -1.3)
            if (z < 0.8 && z > -1.3) {
              const tSide = (0.8 - z) / 2.1;
              const sidepodWidth = 0.72 - 0.38 * tSide;

              if (Math.abs(x) >= 0.20 && Math.abs(x) <= sidepodWidth + 0.04 && y > 0.12 && y < 0.60) {
                if (y < 0.26) {
                  y = Math.max(0.12, Math.min(y, 0.24));
                } else {
                  y = Math.max(y, 0.56 - 0.18 * tSide);
                }
                // Coanda suction: air adheres to Coke-bottle waist narrowing
                x *= (1 - 0.012 * Math.min(2.0, flowVelocity));
              }
            }

            // E. Rear Wheels Obstacle (Z: -1.45 -> -2.15)
            const rwRadius = 0.36;
            const rwHalfWidth = 0.24;
            const rwZ = -1.79;
            const rwY = 0.56;

            for (const rwX of [-0.78, 0.78]) {
              const dx = x - rwX;
              const dy = y - rwY;
              const dz = z - rwZ;
              const distYZ = Math.sqrt(dy * dy + dz * dz);

              if (Math.abs(dx) < rwHalfWidth + 0.06 && distYZ < rwRadius + 0.06) {
                if (Math.abs(x) > Math.abs(rwX)) {
                  x = Math.sign(rwX) * (Math.abs(rwX) + rwHalfWidth + 0.06);
                } else {
                  x = Math.sign(rwX) * (Math.abs(rwX) - rwHalfWidth - 0.05);
                }
                if (y > rwY - 0.10) {
                  const crownY = rwY + Math.sqrt(Math.max(0, (rwRadius + 0.06) ** 2 - dz * dz));
                  y = Math.max(y, crownY);
                }
              }
            }

            // F. Ground-Effect Venturi Tunnels & Rear Diffuser Upwash (Z: 1.2 -> -2.5)
            if (rake.type === "venturi-floor" || y < 0.28) {
              if (z > -1.1 && z < 1.2) {
                y = Math.max(0.06, Math.min(y, 0.14));
              } else if (z <= -1.1 && z > -2.5) {
                const tDiff = (-1.1 - z) / 1.4;
                y = Math.max(y, 0.08 + 0.34 * tDiff);
                x += Math.sign(x || 0.01) * (0.015 * tDiff * flowVelocity);
              }
            }

            // G. Rear Wing Mainplane & Endplate Tip Vortices (Z: -2.0 -> -2.6)
            if (z <= -2.0 && z > -2.6) {
              const isDRSOpen = cur.drsActive;

              if (Math.abs(x) <= 0.55 && y > 0.65) {
                if (isDRSOpen) {
                  y = Math.max(y, 0.88);
                } else {
                  const tRW = (-2.0 - z) / 0.6;
                  y = Math.max(y, 0.98 + 0.25 * tRW);
                }
              }

              if (Math.abs(x) >= 0.42 && Math.abs(x) <= 0.58 && y > 0.70) {
                const vortexPhase = currentTime * 0.012 + i;
                x += Math.sin(vortexPhase) * 0.018;
                y += Math.cos(vortexPhase) * 0.018;
              }
            }

            // Ground floor boundary
            y = Math.max(0.04, y);

            // Localized damage stall turbulence
            const isLocalDamage =
              (x < 0 && leftWingDam > 20 && z > 1.2) ||
              (x > 0 && rightWingDam > 20 && z > 1.2) ||
              (floorDam > 15 && y < 0.25) ||
              (diffDam > 15 && z < -1.1);

            if (isLocalDamage || isGeneralAeroCompromised) {
              x += (Math.random() - 0.5) * 0.024;
              y += (Math.random() - 0.5) * 0.024;
            }
          }

          positions[i * 3 + 0] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          // Update Dynamic Streamline Line Segment (Head & Tail)
          linePos[i * 6 + 0] = x;
          linePos[i * 6 + 1] = y;
          linePos[i * 6 + 2] = z;

          linePos[i * 6 + 3] = prevPositions[i * 3 + 0];
          linePos[i * 6 + 4] = prevPositions[i * 3 + 1];
          linePos[i * 6 + 5] = prevPositions[i * 3 + 2];

          // Tail smoothly tracks behind the head along the 3D streamline trajectory
          prevPositions[i * 3 + 0] = THREE.MathUtils.lerp(prevPositions[i * 3 + 0], x, 0.40);
          prevPositions[i * 3 + 1] = THREE.MathUtils.lerp(prevPositions[i * 3 + 1], y, 0.40);
          prevPositions[i * 3 + 2] = THREE.MathUtils.lerp(prevPositions[i * 3 + 2], z + (0.18 * flowVelocity), 0.50);

          // Localized color shift per line segment
          const isStalled =
            (x < 0 && leftWingDam > 20 && z > 1.0) ||
            (x > 0 && rightWingDam > 20 && z > 1.0) ||
            (floorDam > 15 && y < 0.25) ||
            (diffDam > 15 && z < -1.0) ||
            isGeneralAeroCompromised;

          if (isStalled) {
            // Hot Crimson stall streak
            lineCols[i * 6 + 0] = 1.0;
            lineCols[i * 6 + 1] = 0.20;
            lineCols[i * 6 + 2] = 0.35;
            lineCols[i * 6 + 3] = 0.25;
            lineCols[i * 6 + 4] = 0.02;
            lineCols[i * 6 + 5] = 0.06;
          } else {
            // Clean Electric Cyan aerodynamic filament
            lineCols[i * 6 + 0] = 0.0;
            lineCols[i * 6 + 1] = 0.96;
            lineCols[i * 6 + 2] = 0.83;
            lineCols[i * 6 + 3] = 0.0;
            lineCols[i * 6 + 4] = 0.25;
            lineCols[i * 6 + 5] = 0.22;
          }
        }

        particleGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;
      } else {
        if (aeroParticles) aeroParticles.visible = false;
        if (aeroLines) aeroLines.visible = false;
      }

      // 2. Wheel Rotation (Authentic Forward Rolling along X-Axle)
      // For car moving forward (+Z), wheels roll around X-axis.
      // Top moves forward (+Z), bottom pushes back (-Z).
      const wheelRadius = 0.33; // 660mm outer diameter F1 slick
      const linearSpeedMps = (cur.speed * 1000) / 3600;
      const angularVelocity = linearSpeedMps / wheelRadius; // rad/s
      const rollDelta = angularVelocity * dt;

      // Front Wheels Steering Yaw (Y-axis) and Roll (X-axis)
      const targetSteerRad = (-cur.steerAngle * Math.PI) / 180;

      if (wheelRefs.fl.root) {
        wheelRefs.fl.spinnerAngle += rollDelta;
        wheelRefs.fl.root.rotation.x = wheelRefs.fl.spinnerAngle;
        wheelRefs.fl.root.rotation.y = THREE.MathUtils.lerp(wheelRefs.fl.root.rotation.y, targetSteerRad, 0.18);
      }
      if (wheelRefs.fr.root) {
        wheelRefs.fr.spinnerAngle += rollDelta;
        wheelRefs.fr.root.rotation.x = wheelRefs.fr.spinnerAngle;
        wheelRefs.fr.root.rotation.y = THREE.MathUtils.lerp(wheelRefs.fr.root.rotation.y, targetSteerRad, 0.18);
      }
      if (wheelRefs.rl.root) {
        wheelRefs.rl.spinnerAngle += rollDelta;
        wheelRefs.rl.root.rotation.x = wheelRefs.rl.spinnerAngle;
      }
      if (wheelRefs.rr.root) {
        wheelRefs.rr.spinnerAngle += rollDelta;
        wheelRefs.rr.root.rotation.x = wheelRefs.rr.spinnerAngle;
      }

      // 3. Dynamic Brake Disc Thermal Incandescence (Glowing Rotors)
      const brakeNormalized = cur.brake / 100;
      brakeMaterials.forEach((mat) => {
        if (brakeNormalized > 0.05) {
          mat.emissive.setHex(0xff3800);
          mat.emissiveIntensity = brakeNormalized * 3.0;
        } else {
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0, 0.05);
        }
      });

      // 4. Ground-Effect Dynamic Ride Height, Pitch & Roll
      const hasRealHeights = cur.frontAeroHeight != null && cur.frontAeroHeight > 0 && cur.rearAeroHeight != null;
      if (hasRealHeights) {
        const avgRideHeightMm = (cur.frontAeroHeight! + cur.rearAeroHeight!) / 2;
        const targetY = THREE.MathUtils.clamp(-0.25 - ((55 - avgRideHeightMm) * 0.0012), -0.32, -0.19);
        carRoot.position.y = THREE.MathUtils.lerp(carRoot.position.y, targetY, 0.1);
      }

      const targetPitch = cur.chassisPitch != null && cur.chassisPitch !== 0
        ? cur.chassisPitch
        : (cur.brake * 0.0005) - (cur.throttle * 0.0002);
      const targetRoll = cur.chassisRoll != null && cur.chassisRoll !== 0
        ? cur.chassisRoll
        : (cur.gForceLat * 0.010);

      carRoot.rotation.x = THREE.MathUtils.lerp(carRoot.rotation.x, targetPitch, 0.1);
      carRoot.rotation.z = THREE.MathUtils.lerp(carRoot.rotation.z, targetRoll, 0.1);

      // 5. Gyroscopic Cursor Parallax (Aerodynamic car tilt responding to user mouse)
      const gyroYaw = mouseOffsetRef.current.x * 0.055;
      const gyroPitch = mouseOffsetRef.current.y * 0.035;
      carRoot.rotation.y = THREE.MathUtils.lerp(carRoot.rotation.y, gyroYaw, 0.08);
      carRoot.rotation.x = THREE.MathUtils.lerp(carRoot.rotation.x, targetPitch - gyroPitch, 0.08);
      carRoot.rotation.z = THREE.MathUtils.lerp(carRoot.rotation.z, targetRoll + (mouseOffsetRef.current.x * 0.015), 0.08);

      // 6. Turntable Orbit
      if (autoRotateRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.8;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    const animId = requestAnimationFrame(animate);

    // Mouse Cursor Gyroscopic Interaction
    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseOffsetRef.current = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
    };

    const handleMouseLeave = () => {
      mouseOffsetRef.current = { x: 0, y: 0 };
    };

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    sceneElementsRef.current = {
      scene,
      camera,
      renderer,
      controls,
      carRoot,
      bodyGroup: bodyGroupRef,
      wheels: wheelRefs,
      brakeMaterials,
      aeroParticles,
      aeroLines,
      particleGeo,
      lineGeo,
      particleMat,
      lineMat,
      particleSpeeds,
      particleCount,
      animId,
    };

    // Resize Observer
    const handleResize = () => {
      if (!container || !sceneElementsRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      sceneElementsRef.current.camera.aspect = w / h;
      sceneElementsRef.current.camera.updateProjectionMatrix();
      sceneElementsRef.current.renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (sceneElementsRef.current) {
        cancelAnimationFrame(sceneElementsRef.current.animId);
        sceneElementsRef.current.controls.dispose();
        sceneElementsRef.current.renderer.dispose();
        sceneElementsRef.current.particleGeo?.dispose();
        sceneElementsRef.current.lineGeo?.dispose();
        sceneElementsRef.current.particleMat?.dispose();
        sceneElementsRef.current.lineMat?.dispose();
      }
    };
  }, []);

  // Camera Presets Controller
  useEffect(() => {
    if (!sceneElementsRef.current) return;
    const { camera, controls } = sceneElementsRef.current;

    switch (activeCamPreset) {
      case "ISOMETRIC":
        camera.position.set(4.0, 1.85, 4.3);
        controls.target.set(0, 0.35, -0.2);
        break;
      case "CHASE":
        camera.position.set(0, 1.8, -5.5);
        controls.target.set(0, 0.4, 1.2);
        break;
      case "SIDE":
        camera.position.set(5.5, 1.2, 0);
        controls.target.set(0, 0.4, 0);
        break;
      case "TOP":
        camera.position.set(0, 7.5, 0.01);
        controls.target.set(0, 0, 0);
        break;
      case "FRONT":
        camera.position.set(0, 1.0, 5.5);
        controls.target.set(0, 0.4, 0);
        break;
      case "COCKPIT":
        camera.position.set(0, 0.85, 0.2);
        controls.target.set(0, 0.4, 3.2);
        break;
    }
  }, [activeCamPreset]);

  // Exploded View Assembly Animation
  useEffect(() => {
    if (!sceneElementsRef.current) return;
    const { bodyGroup, wheels } = sceneElementsRef.current;

    if (isExploded) {
      if (bodyGroup) bodyGroup.position.y = 0.5;
      if (wheels.fl.root) {
        wheels.fl.root.position.x = wheels.fl.basePos.x - 0.4;
        wheels.fl.root.position.z = wheels.fl.basePos.z + 0.2;
      }
      if (wheels.fr.root) {
        wheels.fr.root.position.x = wheels.fr.basePos.x + 0.4;
        wheels.fr.root.position.z = wheels.fr.basePos.z + 0.2;
      }
      if (wheels.rl.root) {
        wheels.rl.root.position.x = wheels.rl.basePos.x - 0.4;
        wheels.rl.root.position.z = wheels.rl.basePos.z - 0.2;
      }
      if (wheels.rr.root) {
        wheels.rr.root.position.x = wheels.rr.basePos.x + 0.4;
        wheels.rr.root.position.z = wheels.rr.basePos.z - 0.2;
      }
    } else {
      if (bodyGroup) bodyGroup.position.set(0, 0, 0);
      if (wheels.fl.root) wheels.fl.root.position.copy(wheels.fl.basePos);
      if (wheels.fr.root) wheels.fr.root.position.copy(wheels.fr.basePos);
      if (wheels.rl.root) wheels.rl.root.position.copy(wheels.rl.basePos);
      if (wheels.rr.root) wheels.rr.root.position.copy(wheels.rr.basePos);
    }
  }, [isExploded]);

  // Wireframe CAD Mode Toggle
  useEffect(() => {
    if (!sceneElementsRef.current) return;
    sceneElementsRef.current.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => (m.wireframe = wireframeMode));
        } else {
          child.material.wireframe = wireframeMode;
        }
      }
    });
  }, [wireframeMode]);

  // Tyre Thermal Color Resolver
  const getThermalBadge = (temp: number) => {
    if (temp < 92) return { label: "COLD", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
    if (temp <= 108) return { label: "OPTIMAL", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    return { label: "HOT", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-neutral-950/90 border border-white/[0.12] p-4 sm:p-5 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md relative overflow-hidden group",
        className
      )}
    >
      {/* ── TOP HEADER & TELEMETRY CONTROLS ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                3D SPATIAL DIGITAL TWIN &amp; THERMAL KINEMATICS
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Cpu size={10} />
                FIA FORMULA 1 PROTOCOL // APX-IQ SPEC
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Authentic CAD Aerodynamics · 4-Wheel Forward Roll Kinematics · Dynamic Thermal Brake Glow
            </span>
          </div>
        </div>

        {/* Camera View Angle Selector */}
        <div className="flex flex-wrap items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 font-mono text-[10px]">
          {(["ISOMETRIC", "CHASE", "SIDE", "TOP", "FRONT", "COCKPIT"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setActiveCamPreset(preset)}
              className={cn(
                "px-2.5 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer",
                activeCamPreset === preset
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D CANVAS VIEWPORT & HUD OVERLAYS ───────────────────────────── */}
      <div className="relative w-full h-[400px] sm:h-[480px] rounded-xl bg-[#06070a] border border-white/[0.06] overflow-hidden">
        {/* Three.js DOM Container with Interactive Orbit Cursor */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Overlay */}
        {modelLoading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 font-mono">
            <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <div className="text-xs font-bold text-white tracking-widest uppercase">
              LOADING 3D SPATIAL DIGITAL TWIN [FIA F1 CAD SPEC]
            </div>
            <div className="text-[10px] text-neutral-400">
              {loadProgress > 0 ? `${loadProgress}%` : "INITIALIZING WEBGL RIG"}
            </div>
          </div>
        )}

        {/* 4-Corner Tyre Thermal Overlay Telemetry HUD */}
        {/* Front Left */}
        <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md font-mono text-[10px] flex flex-col gap-0.5 shadow-lg">
          <span className="text-neutral-400 uppercase font-bold">TYRE FL</span>
          <span className="text-sm font-black text-white tabular-nums">{tyreTemps.fl}°C</span>
          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border self-start mt-0.5", getThermalBadge(tyreTemps.fl).color)}>
            {getThermalBadge(tyreTemps.fl).label}
          </span>
        </div>

        {/* Front Right */}
        <div className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md font-mono text-[10px] flex flex-col items-end gap-0.5 shadow-lg">
          <span className="text-neutral-400 uppercase font-bold">TYRE FR</span>
          <span className="text-sm font-black text-white tabular-nums">{tyreTemps.fr}°C</span>
          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border self-end mt-0.5", getThermalBadge(tyreTemps.fr).color)}>
            {getThermalBadge(tyreTemps.fr).label}
          </span>
        </div>

        {/* Rear Left */}
        <div className="absolute bottom-16 left-4 p-2.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md font-mono text-[10px] flex flex-col gap-0.5 shadow-lg">
          <span className="text-neutral-400 uppercase font-bold">TYRE RL</span>
          <span className="text-sm font-black text-white tabular-nums">{tyreTemps.rl}°C</span>
          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border self-start mt-0.5", getThermalBadge(tyreTemps.rl).color)}>
            {getThermalBadge(tyreTemps.rl).label}
          </span>
        </div>

        {/* Rear Right */}
        <div className="absolute bottom-16 right-4 p-2.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md font-mono text-[10px] flex flex-col items-end gap-0.5 shadow-lg">
          <span className="text-neutral-400 uppercase font-bold">TYRE RR</span>
          <span className="text-sm font-black text-white tabular-nums">{tyreTemps.rr}°C</span>
          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border self-end mt-0.5", getThermalBadge(tyreTemps.rr).color)}>
            {getThermalBadge(tyreTemps.rr).label}
          </span>
        </div>

        {/* Center Top Live Kinematics Vector HUD */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md font-mono text-[10px] flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">LAT G:</span>
            <span className="font-bold text-amber-400 tabular-nums">{gForceLat > 0 ? `+${gForceLat.toFixed(1)}` : gForceLat.toFixed(1)}G</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">LON G:</span>
            <span className="font-bold text-cyan-400 tabular-nums">{gForceLon > 0 ? `+${gForceLon.toFixed(1)}` : gForceLon.toFixed(1)}G</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">STEER:</span>
            <span className="font-bold text-white tabular-nums">{steerAngle.toFixed(1)}°</span>
          </div>
        </div>

        {/* Real Ground-Effect Aerodynamics & Downforce Telemetry Strip */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-black/80 border border-emerald-500/25 backdrop-blur-md font-mono text-[9px] flex items-center gap-3 shadow-lg z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">AERO LOAD:</span>
            <span className="font-black text-white tabular-nums">
              {(
                (wheelVertForce && wheelVertForce.length === 4
                  ? wheelVertForce.reduce((a, b) => a + b, 0)
                  : Math.pow(Math.max(10, speed) / 100, 2) * 6200) / 9.81
              ).toFixed(0)}{" "}
              kgF
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold">RIDE HEIGHT:</span>
            <span className="font-black text-white tabular-nums">
              F {frontAeroHeight.toFixed(0)}mm / R {rearAeroHeight.toFixed(0)}mm
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 font-bold">AERO BALANCE:</span>
            <span className="font-black text-amber-400 tabular-nums">
              {wheelVertForce && wheelVertForce.length === 4 && wheelVertForce.reduce((a, b) => a + b, 0) > 0
                ? `${Math.round(((wheelVertForce[2] + wheelVertForce[3]) / wheelVertForce.reduce((a, b) => a + b, 0)) * 100)}% F`
                : "44.5% F"}
            </span>
          </div>
        </div>

        {/* Floating Quick Action Toggles Dock */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 bg-black/85 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-md font-mono text-[10px] shadow-2xl">
          <button
            onClick={() => setIsExploded(!isExploded)}
            className={cn(
              "px-2.5 py-1 rounded-xl uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              isExploded ? "bg-amber-500/25 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "text-neutral-400 hover:text-white"
            )}
            title="Explode 3D Chassis Assembly"
          >
            <Layers size={13} />
            <span>EXPLODED VIEW</span>
          </button>

          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={cn(
              "px-2.5 py-1 rounded-xl uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              wireframeMode ? "bg-cyan-500/25 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,245,212,0.3)]" : "text-neutral-400 hover:text-white"
            )}
            title="Toggle Wireframe CAD Mesh"
          >
            <Eye size={13} />
            <span>CAD MESH</span>
          </button>

          <button
            onClick={() => setShowAeroFlow(!showAeroFlow)}
            className={cn(
              "px-2.5 py-1 rounded-xl uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              showAeroFlow ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]" : "text-neutral-400 hover:text-white"
            )}
            title="Toggle Wind Tunnel CFD Airflow Streamlines"
          >
            <Wind size={13} />
            <span>CFD AIRFLOW</span>
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={cn(
              "px-2.5 py-1 rounded-xl uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              autoRotate ? "bg-purple-500/25 text-purple-400 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-neutral-400 hover:text-white"
            )}
            title="Toggle Continuous Turntable Orbit"
          >
            <RotateCcw size={13} />
            <span>ORBIT</span>
          </button>

          <button
            onClick={() => useUxStore.getState().openPuModal()}
            className="px-2.5 py-1 rounded-xl uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-gold/15 text-gold hover:bg-gold/30 border border-gold/40 shadow-[0_0_12px_rgba(207,163,73,0.2)]"
            title="Open FIA Power Unit & Mechanical Diagnostics (Packet 10)"
          >
            <Cpu size={13} />
            <span>PU HEALTH</span>
          </button>
        </div>
      </div>
    </div>
  );
}
