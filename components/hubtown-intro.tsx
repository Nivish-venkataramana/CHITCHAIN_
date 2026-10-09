"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, ChevronRight, Sparkles, Volume2, VolumeX, Maximize2, Shield, Play } from "lucide-react";

interface HubtownIntroProps {
  onEnter: () => void;
  isOpen: boolean;
}

export function HubtownIntro({ onEnter, isOpen }: HubtownIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const navItems = [
    "FUTURE",
    "DECENTRALIZED",
    "TRANSPARENT",
    "CONFIDENTIAL",
    "TRUST",
    "LEGACY"
  ];

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020817, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 9.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    currentMount.appendChild(renderer.domElement);

    // Ambient and Point Lights
    const ambientLight = new THREE.AmbientLight(0x0a1930, 1.8);
    scene.add(ambientLight);

    const mainBlueLight = new THREE.PointLight(0x00a3ff, 5.0, 50);
    mainBlueLight.position.set(3, 4, 5);
    scene.add(mainBlueLight);

    const cyanRimLight = new THREE.PointLight(0x38bdf8, 4.0, 40);
    cyanRimLight.position.set(-4, -2, 4);
    scene.add(cyanRimLight);

    const deepGlowLight = new THREE.PointLight(0x1e40af, 6.0, 30);
    deepGlowLight.position.set(0, 0, -2);
    scene.add(deepGlowLight);

    // Create the Modular 3D Blue Monolith Cube Group
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    // Outer Segmented Box Architecture (just like Hubtown blue textured monolith)
    const gridSize = 3;
    const blockSize = 0.88;
    const gap = 0.08;
    const halfGrid = ((gridSize - 1) * (blockSize + gap)) / 2;

    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.85,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
      transmission: 0.1,
      reflectivity: 0.9,
    });

    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });

    // Central glowing energy core
    const coreGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const coreMesh = new THREE.Mesh(coreGeo, innerCoreMat);
    cubeGroup.add(coreMesh);

    // Create modular exterior panels
    const panelGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          // Hollow out inner core
          if (x > 0 && x < gridSize - 1 && y > 0 && y < gridSize - 1 && z > 0 && z < gridSize - 1) {
            continue;
          }
          // Organic variation in block depths
          const isOffset = (x + y + z) % 2 === 0;
          const panel = new THREE.Mesh(panelGeo, boxMat);
          const px = x * (blockSize + gap) - halfGrid;
          const py = y * (blockSize + gap) - halfGrid;
          const pz = z * (blockSize + gap) - halfGrid + (isOffset ? 0.05 : -0.04);
          panel.position.set(px, py, pz);
          cubeGroup.add(panel);

          // Wireframe edge accents for futuristic blueprint aesthetic
          const edges = new THREE.EdgesGeometry(panelGeo);
          const lineMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.45 });
          const wireframe = new THREE.LineSegments(edges, lineMat);
          wireframe.position.copy(panel.position);
          cubeGroup.add(wireframe);
        }
      }
    }

    // Reflective Water Plane / Horizon Grid
    const waterGeo = new THREE.PlaneGeometry(60, 60, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x020b1e,
      roughness: 0.1,
      metalness: 0.95,
      wireframe: false,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3.2;
    scene.add(water);

    // Mountain Ridge Silhouettes (Left and Right background)
    const createMountainRidge = (isLeft: boolean) => {
      const ridgeGeo = new THREE.ConeGeometry(8, 7, 5);
      const ridgeMat = new THREE.MeshBasicMaterial({
        color: 0x03122e,
        wireframe: false,
      });
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.set(isLeft ? -11 : 11, 0.2, -10);
      ridge.rotation.y = isLeft ? 0.4 : -0.4;
      scene.add(ridge);
    };
    createMountainRidge(true);
    createMountainRidge(false);

    // Floating Bioluminescent Dust / Bokeh Particles
    const particleCount = 650;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 25;
      particlePos[i + 1] = (Math.random() - 0.5) * 14;
      particlePos[i + 2] = (Math.random() - 0.5) * 18;

      particleVel[i] = (Math.random() - 0.5) * 0.003;
      particleVel[i + 1] = Math.random() * 0.008 + 0.002; // upward drift
      particleVel[i + 2] = (Math.random() - 0.5) * 0.003;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

    // Particle Texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(125, 211, 252, 1)");
      gradient.addColorStop(0.4, "rgba(56, 189, 248, 0.6)");
      gradient.addColorStop(1, "rgba(2, 132, 199, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.18,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Interaction Physics
    let targetRotationX = 0.3;
    let targetRotationY = 0.5;
    let targetCubePosX = 0;
    let targetCubePosY = 0.3;
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      previousMouseX = clientX;
      previousMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - previousMouseX;
        const deltaY = clientY - previousMouseY;
        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.008;
        previousMouseX = clientX;
        previousMouseY = clientY;
      } else {
        const normX = (clientX / window.innerWidth) * 2 - 1;
        const normY = -(clientY / window.innerHeight) * 2 + 1;
        targetCubePosX = normX * 0.45;
        targetCubePosY = 0.3 + normY * 0.35;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("touchmove", onPointerMove);
    window.addEventListener("touchend", onPointerUp);

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous fluid rotation when not dragging
      if (!isDragging) {
        targetRotationY += 0.004;
        targetRotationX = Math.sin(elapsedTime * 0.5) * 0.2 + 0.15;
      }

      // Smooth inertia lerp for cube rotation
      cubeGroup.rotation.y += (targetRotationY - cubeGroup.rotation.y) * 0.06;
      cubeGroup.rotation.x += (targetRotationX - cubeGroup.rotation.x) * 0.06;

      // Floating vertical hover oscillation
      const floatY = targetCubePosY + Math.sin(elapsedTime * 1.4) * 0.18;
      cubeGroup.position.x += (targetCubePosX - cubeGroup.position.x) * 0.05;
      cubeGroup.position.y += (floatY - cubeGroup.position.y) * 0.05;

      // Core pulsating glow
      const pulse = 1.0 + Math.sin(elapsedTime * 2.5) * 0.25;
      coreMesh.scale.set(pulse, pulse, pulse);

      // Particle upward movement
      const posArray = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i + 1] += particleVel[i + 1];
        if (posArray[i + 1] > 8) {
          posArray[i + 1] = -5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Water subtle undulating ripple
      const waterPosArray = waterGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < waterPosArray.length; i += 3) {
        const u = waterPosArray[i];
        const v = waterPosArray[i + 1];
        waterPosArray[i + 2] = Math.sin(u * 0.4 + elapsedTime * 1.2) * 0.08 + Math.cos(v * 0.4 + elapsedTime * 1.5) * 0.08;
      }
      waterGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("resize", handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isOpen]);

  const handleEnterProtocol = () => {
    setIsClosing(true);
    setTimeout(() => {
      onEnter();
      setIsClosing(false);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#010816] text-white select-none transition-all duration-700 ease-in-out ${
        isClosing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Three.js 3D Interactive WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Futuristic Chamfered Tech HUD Frame Overlay matching Hubtown styling */}
      <div className="absolute inset-4 sm:inset-6 lg:inset-8 pointer-events-none flex flex-col justify-between border border-cyan-500/25 rounded-3xl p-6 sm:p-8 backdrop-blur-[0.5px]">
        
        {/* Top Header Row inside HUD */}
        <header className="flex items-center justify-between pointer-events-auto">
          {/* Logo in wide futuristic tracking */}
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-[0.35em] text-white font-mono uppercase drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]">
              CHITCHAIN
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] uppercase font-mono tracking-widest text-cyan-300 border border-cyan-500/40 rounded-full bg-cyan-950/40">
              INDIA V2
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs tracking-[0.2em] text-neutral-300 font-mono font-medium">
            <span className="hover:text-cyan-300 cursor-pointer transition-colors">ABOUT</span>
            <span className="hover:text-cyan-300 cursor-pointer transition-colors">PROTOCOL</span>
            <span className="hover:text-cyan-300 cursor-pointer transition-colors">CIRCLES</span>
            <span className="hover:text-cyan-300 cursor-pointer transition-colors">AUCTIONS</span>
            <span className="hover:text-cyan-300 cursor-pointer transition-colors">COMMUNITY</span>
          </nav>

          {/* Right Header Controls matching Hubtown cut corner buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterProtocol}
              className="px-5 py-2 text-xs font-mono tracking-widest text-neutral-200 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOGIN</span>
            </button>

            <button
              onClick={handleEnterProtocol}
              className="px-5 py-2 text-xs font-mono font-bold tracking-widest text-black bg-white hover:bg-cyan-100 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <span>ENTER</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Center Main Content Area with Monolith Title and CTA */}
        <main className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto space-y-6 pointer-events-auto px-4">
          
          {/* Main Hero Headline matching Hubtown format */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_0_35px_rgba(2,132,199,0.8)] leading-[1.08] max-w-3xl">
            WE BUILD THE FUTURE OF CHIT FUNDS
          </h1>

          {/* Narrative Subtitle */}
          <p className="text-xs sm:text-sm lg:text-base text-cyan-100/80 max-w-2xl font-light leading-relaxed drop-shadow-md">
            For generations, community chit funds have empowered Indian families. Now transformed on Base Sepolia with automated pooling, confidential sealed bids, and zero intermediary fees.
          </p>

          {/* Interactive CTA Button matching Hubtown center badge */}
          <div className="pt-4">
            <button
              onClick={handleEnterProtocol}
              className="group relative px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl font-mono text-xs sm:text-sm tracking-[0.25em] uppercase text-white bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/60 hover:border-cyan-300 transition-all duration-300 shadow-[0_0_30px_rgba(2,132,199,0.4)] hover:shadow-[0_0_45px_rgba(56,189,248,0.7)] flex items-center gap-3 cursor-pointer transform hover:scale-105"
            >
              <span className="text-cyan-400 group-hover:text-cyan-200">::</span>
              <span className="font-bold">EXPLORE OUR PROTOCOL</span>
              <span className="text-cyan-400 group-hover:text-cyan-200">::</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
            <span>Drag cursor to rotate 3D monolith</span>
            <span>•</span>
            <button onClick={handleEnterProtocol} className="text-cyan-400 hover:underline cursor-pointer">
              Skip directly to dashboard
            </button>
          </div>
        </main>

        {/* Left Side Vertical Nav Indicators matching Hubtown */}
        <aside className="absolute left-8 sm:left-12 top-1/2 transform -translate-y-1/2 hidden xl:flex flex-col gap-6 text-[11px] font-mono tracking-[0.25em] text-neutral-400 pointer-events-auto">
          {navItems.map((item, idx) => (
            <div
              key={item}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                activeTab === idx ? "text-white font-bold translate-x-2" : "hover:text-neutral-200"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 transition-all duration-300 ${
                  activeTab === idx ? "bg-cyan-400 scale-125 shadow-[0_0_8px_#38bdf8]" : "bg-neutral-600"
                }`}
              />
              <span>{item}</span>
            </div>
          ))}
        </aside>

        {/* Bottom Footer Row inside HUD */}
        <footer className="flex items-center justify-between pointer-events-auto pt-4 border-t border-cyan-500/15 text-[11px] font-mono tracking-widest text-neutral-400">
          <div>
            <span>WWW.CHITCHAIN.ETH</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hidden sm:inline text-neutral-400">BASE SEPOLIA ONCHAIN</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
