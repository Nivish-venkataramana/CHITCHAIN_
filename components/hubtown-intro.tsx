"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, Box, Shield } from "lucide-react";

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

    // Scene, Camera, Renderer in Obsidian Warm Tone
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060302, 0.032);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.8, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    currentMount.appendChild(renderer.domElement);

    // Warm Ambient and Golden Point Lights
    const ambientLight = new THREE.AmbientLight(0x1a0a03, 2.2);
    scene.add(ambientLight);

    const mainOrangeLight = new THREE.PointLight(0xff7700, 6.5, 60);
    mainOrangeLight.position.set(3.5, 4.5, 5.5);
    scene.add(mainOrangeLight);

    const goldRimLight = new THREE.PointLight(0xfbbf24, 5.0, 45);
    goldRimLight.position.set(-4.5, -2.5, 4.5);
    scene.add(goldRimLight);

    const deepCopperGlow = new THREE.PointLight(0xc2410c, 7.0, 35);
    deepCopperGlow.position.set(0, 0, -2.5);
    scene.add(deepCopperGlow);

    // Create the Prominent Modular 3D Orange Gold Monolith Cube
    const cubeGroup = new THREE.Group();
    cubeGroup.position.set(0, 0.6, 0);
    scene.add(cubeGroup);

    // Outer Segmented Box Architecture in Rich Copper and Gold
    const gridSize = 3;
    const blockSize = 1.05;
    const gap = 0.09;
    const halfGrid = ((gridSize - 1) * (blockSize + gap)) / 2;

    const orangeGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xe06010,
      emissive: 0x9a3412,
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.92,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      reflectivity: 0.95,
    });

    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.8,
      roughness: 0.08,
      metalness: 0.95,
    });

    // Central glowing radiant gold core
    const coreGeo = new THREE.BoxGeometry(2.0, 2.0, 2.0);
    const coreMesh = new THREE.Mesh(coreGeo, innerCoreMat);
    cubeGroup.add(coreMesh);

    // Create modular exterior panels with relief variations
    const panelGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          if (x > 0 && x < gridSize - 1 && y > 0 && y < gridSize - 1 && z > 0 && z < gridSize - 1) {
            continue;
          }
          const isOffset = (x + y + z) % 2 === 0;
          const panel = new THREE.Mesh(panelGeo, orangeGoldMat);
          const px = x * (blockSize + gap) - halfGrid;
          const py = y * (blockSize + gap) - halfGrid;
          const pz = z * (blockSize + gap) - halfGrid + (isOffset ? 0.08 : -0.05);
          panel.position.set(px, py, pz);
          cubeGroup.add(panel);

          // Golden wireframe edge accents
          const edges = new THREE.EdgesGeometry(panelGeo);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.65 });
          const wireframe = new THREE.LineSegments(edges, lineMat);
          wireframe.position.copy(panel.position);
          cubeGroup.add(wireframe);
        }
      }
    }

    // Reflective Floor in Obsidian Copper Dark Tone
    const waterGeo = new THREE.PlaneGeometry(70, 70, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x080402,
      roughness: 0.12,
      metalness: 0.92,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3.4;
    scene.add(water);

    // Warm Atmospheric Mountain Silhouettes
    const createMountainRidge = (isLeft: boolean) => {
      const ridgeGeo = new THREE.ConeGeometry(9, 7.5, 5);
      const ridgeMat = new THREE.MeshBasicMaterial({
        color: 0x140702,
      });
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.set(isLeft ? -12 : 12, 0.2, -10);
      ridge.rotation.y = isLeft ? 0.4 : -0.4;
      scene.add(ridge);
    };
    createMountainRidge(true);
    createMountainRidge(false);

    // Floating Golden Ember Particles
    const particleCount = 750;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 26;
      particlePos[i + 1] = (Math.random() - 0.5) * 15;
      particlePos[i + 2] = (Math.random() - 0.5) * 20;

      particleVel[i] = (Math.random() - 0.5) * 0.003;
      particleVel[i + 1] = Math.random() * 0.009 + 0.003;
      particleVel[i + 2] = (Math.random() - 0.5) * 0.003;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

    // Particle Radial Glow Texture in Gold Amber
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(253, 224, 71, 1)");
      gradient.addColorStop(0.35, "rgba(249, 115, 22, 0.7)");
      gradient.addColorStop(1, "rgba(194, 65, 12, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.22,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Physics and Immediate Continuous Rotation
    let rotationAngleY = 0.5;
    let rotationAngleX = 0.35;
    let targetCubePosX = 0;
    let targetCubePosY = 0.5;
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
        rotationAngleY += deltaX * 0.009;
        rotationAngleX += deltaY * 0.009;
        previousMouseX = clientX;
        previousMouseY = clientY;
      } else {
        const normX = (clientX / window.innerWidth) * 2 - 1;
        const normY = -(clientY / window.innerHeight) * 2 + 1;
        targetCubePosX = normX * 0.5;
        targetCubePosY = 0.5 + normY * 0.4;
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

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Continuous Animation Loop running immediately on load
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous dynamic auto rotation on initial load
      if (!isDragging) {
        rotationAngleY += 0.0075;
        rotationAngleX = Math.sin(elapsedTime * 0.6) * 0.25 + 0.2;
      }

      // Smooth interpolation for rotational tilt
      cubeGroup.rotation.y += (rotationAngleY - cubeGroup.rotation.y) * 0.08;
      cubeGroup.rotation.x += (rotationAngleX - cubeGroup.rotation.x) * 0.08;

      // Vertical floating oscillation
      const floatY = targetCubePosY + Math.sin(elapsedTime * 1.5) * 0.2;
      cubeGroup.position.x += (targetCubePosX - cubeGroup.position.x) * 0.06;
      cubeGroup.position.y += (floatY - cubeGroup.position.y) * 0.06;

      // Pulsating golden core
      const pulse = 1.0 + Math.sin(elapsedTime * 2.8) * 0.22;
      coreMesh.scale.set(pulse, pulse, pulse);

      // Particle upward movement
      const posArray = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i + 1] += particleVel[i + 1];
        if (posArray[i + 1] > 8.5) {
          posArray[i + 1] = -5.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Water plane gentle ripples
      const waterPosArray = waterGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < waterPosArray.length; i += 3) {
        const u = waterPosArray[i];
        const v = waterPosArray[i + 1];
        waterPosArray[i + 2] = Math.sin(u * 0.35 + elapsedTime * 1.3) * 0.09 + Math.cos(v * 0.35 + elapsedTime * 1.4) * 0.09;
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
      className={`fixed inset-0 z-50 bg-[#060302] text-white select-none transition-all duration-700 ease-in-out ${
        isClosing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Three.js 3D Interactive WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Futuristic Chamfered Tech HUD Frame in Warm Orange and Gold matching ChitChain palette */}
      <div className="absolute inset-4 sm:inset-6 lg:inset-8 pointer-events-none flex flex-col justify-between border border-orange-500/25 rounded-3xl p-6 sm:p-8 backdrop-blur-[0.5px]">
        
        {/* Top Header Row inside HUD */}
        <header className="flex items-center justify-between pointer-events-auto">
          {/* Logo with Indian Rupee Emblem and Wide Tracking */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-950/60">
              <span className="font-bold text-white text-sm">₹</span>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-[0.35em] text-white font-mono uppercase drop-shadow-[0_0_20px_rgba(249,115,22,0.7)]">
              CHITCHAIN
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] uppercase font-mono tracking-widest text-orange-300 border border-orange-500/40 rounded-full bg-orange-950/40">
              INDIA V2
            </span>
          </div>

          {/* Center Navigation Links in Warm Tones */}
          <nav className="hidden lg:flex items-center gap-8 text-xs tracking-[0.2em] text-neutral-300 font-mono font-medium">
            <span className="hover:text-orange-400 cursor-pointer transition-colors">ABOUT</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">PROTOCOL</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">CIRCLES</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">AUCTIONS</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">COMMUNITY</span>
          </nav>

          {/* Right Header Controls matching Burnt Orange Style */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterProtocol}
              className="px-5 py-2 text-xs font-mono tracking-widest text-neutral-200 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span>LOGIN</span>
            </button>

            <button
              onClick={handleEnterProtocol}
              className="px-5 py-2 text-xs font-mono font-bold tracking-widest text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/60"
            >
              <span>ENTER</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Center Main Content Area with Monolith Title and CTA */}
        <main className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto space-y-6 pointer-events-auto px-4">
          
          {/* Main Hero Headline in Warm Gold Drop Shadow */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_0_40px_rgba(234,88,12,0.85)] leading-[1.08] max-w-3xl">
            WE BUILD THE FUTURE OF CHIT FUNDS
          </h1>

          {/* Narrative Subtitle */}
          <p className="text-xs sm:text-sm lg:text-base text-amber-100/90 max-w-2xl font-light leading-relaxed drop-shadow-md">
            For generations, community chit funds have empowered Indian families. Now transformed on Base Sepolia with automated pooling, confidential sealed bids, and zero intermediary fees.
          </p>

          {/* Interactive CTA Button in Burnt Orange */}
          <div className="pt-4">
            <button
              onClick={handleEnterProtocol}
              className="group relative px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl font-mono text-xs sm:text-sm tracking-[0.25em] uppercase text-white bg-orange-950/80 hover:bg-orange-900/90 border border-orange-500/60 hover:border-orange-400 transition-all duration-300 shadow-[0_0_35px_rgba(234,88,12,0.5)] hover:shadow-[0_0_50px_rgba(251,191,36,0.8)] flex items-center gap-3 cursor-pointer transform hover:scale-105"
            >
              <span className="text-amber-400 group-hover:text-amber-200">::</span>
              <span className="font-bold">EXPLORE OUR PROTOCOL</span>
              <span className="text-amber-400 group-hover:text-amber-200">::</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
            <span>Drag cursor to rotate 3D monolith</span>
            <span>•</span>
            <button onClick={handleEnterProtocol} className="text-orange-400 hover:underline cursor-pointer">
              Skip directly to dashboard
            </button>
          </div>
        </main>

        {/* Left Side Vertical Nav Indicators */}
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
                  activeTab === idx ? "bg-orange-400 scale-125 shadow-[0_0_8px_#f97316]" : "bg-neutral-600"
                }`}
              />
              <span>{item}</span>
            </div>
          ))}
        </aside>

        {/* Bottom Footer Row inside HUD */}
        <footer className="flex items-center justify-between pointer-events-auto pt-4 border-t border-orange-500/15 text-[11px] font-mono tracking-widest text-neutral-400">
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
