import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { ThreeOceanManager } from '../lib/ThreeOceanManager';
import themeMusic from '../assets/sounds/theme.mp3';

const MINECRAFT_FONT_URL = 'fonts/minecraft.ttf';

const CONFIG = {
  cameraPosition: new THREE.Vector3(-24.00, 1.26, 34.29),
  waterSize: 100,
  shipScale: 15,
  islandScale: 60,
  islandPosition: new THREE.Vector3(0, 3, -40),
  waterColor: 0x001e0f,
  sunPositionSpherical: [1, 88, 180] as [number, number, number],
  shipSpeed: 0.02,
  shipRockingSpeed: 0.002,
  shipRockingAmount: 0.2,
  shipStopDistance: 8,
  shipMinSpeed: 0.001,
  textFadeInDuration: 3000,
};

const assetPaths = {
  waterNormal: new URL('../assets/textures/waternormals.jpg', import.meta.url).href,
  shipModel: new URL('../assets/objects/ship-model.obj', import.meta.url).href,
  shipTexture: new URL('../assets/textures/solar_punk_pirate_shi_0617201936_texture.png', import.meta.url).href,
  islandModel: new URL('../assets/objects/medas.obj', import.meta.url).href,
  islandTexture: new URL('../assets/textures/medas_texture.png', import.meta.url).href
};

const TEXT_CONTENT = [
  "Els pirates electrònics",
  "desembarquen",
  "SALA mariscal",
  "28/08/2025"
];

const getRainbowColor = (offset: number, index: number, speed: number = 0.005) => {
  const hue = ((offset + index * 10) * speed * 360) % 360;
  return `hsl(${hue}, 100%, 70%)`;
};

export default function OceanScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [textOpacity, setTextOpacity] = useState(0);
  const [colorOffset, setColorOffset] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const managerRef = useRef<ThreeOceanManager | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Preload all assets
  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Load font
        const fontFace = new FontFace('Minecraft', `url(${MINECRAFT_FONT_URL})`);
        await fontFace.load();
        document.fonts.add(fontFace);

        // Load audio
        audioRef.current = new Audio(themeMusic);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;

        // Initialize Three.js manager (but don't attach to DOM yet)
        managerRef.current = ThreeOceanManager.getInstance(CONFIG, assetPaths);

        setIsLoaded(true);
      } catch (error) {
        console.error('Loading failed:', error);
        setIsLoaded(true); // Still allow interaction even if some assets failed
      }
    };

    loadAssets();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (managerRef.current) {
        managerRef.current.detachFromDOM();
      }
    };
  }, []);

  // Handle play button click
  const handlePlay = () => {
    if (!isLoaded || isPlaying) return;

    setIsPlaying(true);

    // Start audio
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }

    // Attach Three.js scene to DOM
    if (mountRef.current && managerRef.current) {
      managerRef.current.attachToDOM(mountRef.current);
    }

    // Start text fade-in
    const startTime = Date.now();
    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const opacity = Math.min(elapsed / CONFIG.textFadeInDuration, 1);
      setTextOpacity(opacity);
      if (opacity < 1) requestAnimationFrame(fadeIn);
    };
    fadeIn();

    // Start RGB animation
    const animateColors = () => {
      setColorOffset(prev => (prev + 1) % 360);
      animationRef.current = requestAnimationFrame(animateColors);
    };
    animationRef.current = requestAnimationFrame(animateColors);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const renderTextWithEffect = (text: string) => {
    return text.split('').map((char, i) => (
      <span
        key={i}
        style={{
          color: getRainbowColor(colorOffset, i),
          display: 'inline-block',
          textShadow: `
            0 0 5px white,
            0 0 10px white,
            0 0 15px white,
            0 0 20px rgba(255, 255, 255, 0.5),
            2px 2px 0 #3F3F3F`
        }}
      >
        {char}
      </span>
    ));
  };

  return (
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Loading screen */}
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: 'white',
          fontFamily: 'Minecraft, monospace'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '40px' }}>Els Pirates Electrònics</h1>

          {isLoaded ? (
            <button
              ref={buttonRef}
              onClick={handlePlay}
              style={{
                padding: '15px 30px',
                fontSize: '24px',
                fontFamily: 'Minecraft, monospace',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={() => {
                if (buttonRef.current) {
                  buttonRef.current.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={() => {
                if (buttonRef.current) {
                  buttonRef.current.style.transform = 'scale(1)';
                }
              }}
            >
              START VOYAGE
            </button>
          ) : (
            <div style={{ width: '300px', marginTop: '20px' }}>
              <div style={{
                width: '100%',
                height: '10px',
                backgroundColor: '#333',
                borderRadius: '5px'
              }}>
                <div style={{
                  width: '0%',
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px' }}>Loading...</p>
            </div>
          )}
        </div>
      )}

      {/* Mute button (only visible when playing) */}
      {isPlaying && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid white',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Minecraft, monospace'
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}

      {/* Text overlay (only visible when playing) */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          fontFamily: 'Minecraft, monospace',
          textShadow: '2px 2px 0 #3F3F3F',
          fontSize: '48px',
          lineHeight: '1.5',
          opacity: textOpacity,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
          background: 'none'
        }}>
          {TEXT_CONTENT.map((line, index) => (
            <div key={index}>{renderTextWithEffect(line)}</div>
          ))}
        </div>
      )}
    </div>
  );
}