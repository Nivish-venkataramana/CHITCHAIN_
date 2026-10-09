"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, Shield } from "lucide-react";

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

    // High performance Three.js Scene without alpha readback stutter
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060302);
    scene.fog = new THREE.FogExp2(0x060302, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 7.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    currentMount.appendChild(renderer.domElement);

    // Warm Ambient and Directional Lighting optimized for GPU
    const ambientLight = new THREE.AmbientLight(0x2a1005, 2.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xff8800, 3.5);
    mainLight.position.set(5, 6, 6);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 2.2);
    rimLight.position.set(-6, -2, 4);
    scene.add(rimLight);

    const backGlow = new THREE.PointLight(0xe05600, 4.0, 25);
    backGlow.position.set(0, 0, -2);
    scene.add(backGlow);

    // Prominent 3D Orange Gold Monolith
    const cubeGroup = new THREE.Group();
    cubeGroup.position.set(0, 0.5, 0);
    scene.add(cubeGroup);

    // Materials optimized for 60/120 FPS
    const goldCopperMat = new THREE.MeshStandardMaterial({
      color: 0xe06010,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.9,
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.8,
    });

    // Glowing Inner Energy Core
    const coreGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    cubeGroup.add(coreMesh);

    // Modular Segmented Box
    const gridSize = 3;
    const blockSize = 0.96;
    const gap = 0.08;
    const halfGrid = ((gridSize - 1) * (blockSize + gap)) / 2;

    const panelGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const wireframeEdges = new THREE.EdgesGeometry(panelGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.6 });

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          if (x > 0 && x < gridSize - 1 && y > 0 && y < gridSize - 1 && z > 0 && z < gridSize - 1) {
            continue;
          }
          const isOffset = (x + y + z) % 2 === 0;
          const panel = new THREE.Mesh(panelGeo, goldCopperMat);
          const px = x * (blockSize + gap) - halfGrid;
          const py = y * (blockSize + gap) - halfGrid;
          const pz = z * (blockSize + gap) - halfGrid + (isOffset ? 0.07 : -0.04);
          panel.position.set(px, py, pz);
          cubeGroup.add(panel);

          const wireframe = new THREE.LineSegments(wireframeEdges, lineMat);
          wireframe.position.copy(panel.position);
          cubeGroup.add(wireframe);
        }
      }
    }

    // Reflective Base Plane
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0502,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    scene.add(floor);

    // Mountains
    const createMountain = (isLeft: boolean) => {
      const geo = new THREE.ConeGeometry(8, 7, 5);
      const mat = new THREE.MeshBasicMaterial({ color: 0x120601 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(isLeft ? -11 : 11, 0.1, -9);
      mesh.rotation.y = isLeft ? 0.4 : -0.4;
      scene.add(mesh);
    };
    createMountain(true);
    createMountain(false);

    // GPU Accelerated Particle Field (No CPU Buffer updates)
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 22;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleGroup = new THREE.Points(particleGeo, pMat);
    scene.add(particleGroup);

    // Smooth Interaction Physics
    let rotY = 0.5;
    let rotX = 0.25;
    let targetX = 0;
    let targetY = 0.5;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      prevX = clientX;
      prevY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const dx = clientX - prevX;
        const dy = clientY - prevY;
        rotY += dx * 0.008;
        rotX += dy * 0.008;
        prevX = clientX;
        prevY = clientY;
      } else {
        const nx = (clientX / window.innerWidth) * 2 - 1;
        const ny = -(clientY / window.innerHeight) * 2 + 1;
        targetX = nx * 0.4;
        targetY = 0.5 + ny * 0.3;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("mousedown", onPointerDown, { passive: true });
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("mouseup", onPointerUp, { passive: true });
    window.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp, { passive: true });

    const handleResize = () => {
      if (!currentMount) return;
      const nw = currentMount.clientWidth;
      const nh = currentMount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    // Fluid 60 FPS Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Fluid auto rotation
      if (!isDragging) {
        rotY += 0.006;
        rotX = Math.sin(elapsed * 0.5) * 0.2 + 0.18;
      }

      // Smooth lerp transformations
      cubeGroup.rotation.y += (rotY - cubeGroup.rotation.y) * 0.06;
      cubeGroup.rotation.x += (rotX - cubeGroup.rotation.x) * 0.06;

      const floatY = targetY + Math.sin(elapsed * 1.3) * 0.15;
      cubeGroup.position.x += (targetX - cubeGroup.position.x) * 0.05;
      cubeGroup.position.y += (floatY - cubeGroup.position.y) * 0.05;

      // Core pulse
      const pulse = 1.0 + Math.sin(elapsed * 2.5) * 0.18;
      coreMesh.scale.set(pulse, pulse, pulse);

      // Hardware accelerated particle drift
      particleGroup.rotation.y += 0.0008;
      particleGroup.position.y = Math.sin(elapsed * 0.6) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
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
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#060302] text-white select-none transition-all duration-600 ease-in-out ${
        isClosing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Hardware Accelerated WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Futuristic Chamfered Tech HUD Frame in Warm Orange and Gold */}
      <div className="absolute inset-4 sm:inset-6 lg:inset-8 pointer-events-none flex flex-col justify-between border border-orange-500/25 rounded-3xl p-6 sm:p-8">
        
        {/* Top Header Row inside HUD */}
        <header className="flex items-center justify-between pointer-events-auto">
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

          <nav className="hidden lg:flex items-center gap-8 text-xs tracking-[0.2em] text-neutral-300 font-mono font-medium">
            <span className="hover:text-orange-400 cursor-pointer transition-colors">ABOUT</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">PROTOCOL</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">CIRCLES</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">AUCTIONS</span>
            <span className="hover:text-orange-400 cursor-pointer transition-colors">COMMUNITY</span>
          </nav>

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
          
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_0_40px_rgba(234,88,12,0.85)] leading-[1.08] max-w-3xl">
            WE BUILD THE FUTURE OF CHIT FUNDS
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-amber-100/90 max-w-2xl font-light leading-relaxed drop-shadow-md">
            For generations, community chit funds have empowered Indian families. Now transformed on Base Sepolia with automated pooling, confidential sealed bids, and zero intermediary fees.
          </p>

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
