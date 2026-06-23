import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeHead({ lookAngle = 0, activeIconType = "all-topics", activeLabel = "" }) {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const lookAngleRef = useRef(lookAngle);
  const lastMouseMoveRef = useRef(Date.now());
  const screenMatRef = useRef(null);
  const capMatRef = useRef(null);

  // Sync lookAngle ref
  useEffect(() => {
    lookAngleRef.current = lookAngle;
  }, [lookAngle]);

  // Helper to draw vector shapes on 2D canvas
  const drawSymbolOnCanvas = (type, label) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 256, 256);
    
    // Glowing neon styling
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#00f3ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#00f3ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (type === "unsorted") {
      // Vector Help Circle (HelpCircle shape)
      ctx.beginPath();
      ctx.arc(128, 128, 76, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.font = "bold 90px IBM Plex Sans, Arial";
      ctx.fillText("?", 128, 122);
    } else if (type === "all-topics") {
      // Vector BookMarked shape (closed book with a bookmark hanging down)
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(68, 54, 120, 148, 12);
      } else {
        ctx.rect(68, 54, 120, 148);
      }
      ctx.stroke();
      
      // Bookmark ribbon
      ctx.beginPath();
      ctx.moveTo(116, 54);
      ctx.lineTo(116, 125);
      ctx.lineTo(128, 112);
      ctx.lineTo(140, 125);
      ctx.lineTo(140, 54);
      ctx.stroke();
    } else if (type === "recently-viewed") {
      // Vector Clock face (Clock shape)
      ctx.beginPath();
      ctx.arc(128, 128, 76, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(128, 76);
      ctx.moveTo(128, 128);
      ctx.lineTo(172, 128);
      ctx.stroke();
    } else {
      // Draw first character of Topic in glowing brackets e.g. [ A ]
      const char = label ? label.charAt(0).toUpperCase() : "T";
      ctx.font = "bold 100px IBM Plex Sans, Arial";
      ctx.fillText(`[ ${char} ]`, 128, 128);
    }

    return canvas;
  };

  // Helper to draw the full topic name on the mortarboard cap
  const drawTopicOnCapCanvas = (label) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Clear and draw solid dark background matching visorMaterial color
    ctx.fillStyle = "#02050b";
    ctx.fillRect(0, 0, 512, 512);

    let displayText = label || "RESEARCH VAULT";

    // Draw tech accents/grid border around the board
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 472, 472);

    // Inner glowing circle
    ctx.beginPath();
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 243, 255, 0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw glowing neon text centered
    ctx.font = "bold 42px IBM Plex Sans, Arial";
    ctx.fillStyle = "#00f3ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00f3ff";
    ctx.shadowBlur = 18;

    // Rotate text by -45 degrees (-Math.PI/4) to cancel out the board's rotation.y
    ctx.translate(256, 256);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(displayText.toUpperCase(), 0, 0);

    return canvas;
  };

  // Sync symbol changes to the visor projection texture and cap label
  useEffect(() => {
    if (screenMatRef.current) {
      const canvas = drawSymbolOnCanvas(activeIconType, activeLabel);
      const newTexture = new THREE.CanvasTexture(canvas);
      
      if (screenMatRef.current.map) {
        screenMatRef.current.map.dispose();
      }
      
      screenMatRef.current.map = newTexture;
      screenMatRef.current.needsUpdate = true;
    }

    if (capMatRef.current) {
      const canvas = drawTopicOnCapCanvas(activeLabel);
      const newTexture = new THREE.CanvasTexture(canvas);
      
      if (capMatRef.current.map) {
        capMatRef.current.map.dispose();
      }
      
      capMatRef.current.map = newTexture;
      capMatRef.current.needsUpdate = true;
    }
  }, [activeIconType, activeLabel]);

  useEffect(() => {
    if (!containerRef.current) return;

    const isMobile = window.innerWidth <= 768;
    const width = isMobile ? 180 : 280;
    const height = isMobile ? 180 : 280;

    // --- 1. Scene & Renderer Setup ---
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- 2. Lighting ---
    const ambientLight = new THREE.AmbientLight(0x0a1628, 1.8);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 2.5);
    frontLight.position.set(2, 4, 6);
    scene.add(frontLight);

    const keyLight = new THREE.DirectionalLight(0x00f0ff, 2.0);
    keyLight.position.set(-3, 2, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 3.0);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // --- 3. Cybernetic Head Model (Procedural Group) ---
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // Metallic Material
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1220,
      metalness: 0.95,
      roughness: 0.15,
      bumpScale: 0.05,
    });

    // Dark Visor Material
    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x02050b,
      metalness: 0.98,
      roughness: 0.05,
    });

    // Cyan glowing material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
    });

    // Purple accent material
    const purpleGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xbc3ef7,
      transparent: true,
    });

    // A. Main Skull Sphere
    const skullGeo = new THREE.SphereGeometry(1, 32, 32);
    const skull = new THREE.Mesh(skullGeo, metalMaterial);
    skull.scale.set(0.9, 1.15, 0.8);
    headGroup.add(skull);

    // B. Facial Anatomy (Jaw, Chin, Cheekbones, Nose bridge)
    const chinGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const chin = new THREE.Mesh(chinGeo, metalMaterial);
    chin.position.set(0, -0.6, 0.28);
    chin.scale.set(0.85, 0.7, 0.9);
    headGroup.add(chin);

    const cheekGeo = new THREE.SphereGeometry(0.28, 16, 16);
    
    const leftCheek = new THREE.Mesh(cheekGeo, metalMaterial);
    leftCheek.position.set(-0.42, -0.15, 0.35);
    leftCheek.scale.set(0.8, 1.0, 0.8);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, metalMaterial);
    rightCheek.position.set(0.42, -0.15, 0.35);
    rightCheek.scale.set(0.8, 1.0, 0.8);
    headGroup.add(rightCheek);

    const noseGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
    const nose = new THREE.Mesh(noseGeo, metalMaterial);
    nose.position.set(0, 0.04, 0.84);
    nose.rotation.x = -Math.PI / 4.5;
    headGroup.add(nose);

    // Wireframe overlay
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireframeSkull = new THREE.Mesh(skullGeo, wireframeMat);
    wireframeSkull.scale.set(0.905, 1.155, 0.805);
    headGroup.add(wireframeSkull);

    // C. Visor (Faceplate shield)
    const visorGeo = new THREE.SphereGeometry(0.92, 32, 32, 0, Math.PI * 2, 0.1, Math.PI * 0.35);
    const visor = new THREE.Mesh(visorGeo, visorMaterial);
    visor.position.set(0, 0.18, 0.12);
    visor.rotation.x = -0.15;
    headGroup.add(visor);

    // D. Visor Holographic Projection Screen (Mouth position)
    const canvas = drawSymbolOnCanvas(activeIconType, activeLabel);
    const texture = new THREE.CanvasTexture(canvas);
    
    const screenMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    screenMatRef.current = screenMat;

    const screenGeo = new THREE.PlaneGeometry(0.65, 0.65);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    // Repositioned to sit directly at the mouth level
    screenMesh.position.set(0, -0.32, 0.84);
    screenMesh.rotation.x = -0.15;
    headGroup.add(screenMesh);

    // E. Glowing Eyes (Capsules, kept horizontal)
    const eyeGeo = new THREE.CapsuleGeometry(0.04, 0.15, 8, 16);
    
    const leftEye = new THREE.Mesh(eyeGeo, glowMaterial);
    leftEye.position.set(-0.25, 0.25, 0.88);
    leftEye.rotation.z = Math.PI / 2;
    headGroup.add(leftEye);

     const rightEye = new THREE.Mesh(eyeGeo, glowMaterial);
    rightEye.position.set(0.25, 0.25, 0.88);
    rightEye.rotation.z = Math.PI / 2;
    headGroup.add(rightEye);

    // F. Professor's Cap (Mortarboard)
    const capGroup = new THREE.Group();
    capGroup.position.set(0, 1.0, 0); // Positioned on top of the skull
    
    // 1. Cap Base (the skull-fitting band)
    const capBaseGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.35, 32);
    const capBase = new THREE.Mesh(capBaseGeo, visorMaterial);
    capBase.position.set(0, -0.05, 0.05);
    capBase.rotation.x = -0.15; // tilted forward so top is visible
    capGroup.add(capBase);

    // 2. The Board (flat square top) with dynamic text texture
    const capCanvas = drawTopicOnCapCanvas(activeLabel);
    const capTexture = new THREE.CanvasTexture(capCanvas);
    const capMat = new THREE.MeshStandardMaterial({
      map: capTexture,
      metalness: 0.95,
      roughness: 0.15,
    });
    capMatRef.current = capMat;

    const boardGeo = new THREE.BoxGeometry(1.7, 0.03, 1.7);
    const board = new THREE.Mesh(boardGeo, capMat);
    board.position.set(0, 0.15, 0.05);
    board.rotation.x = -0.35; // tilted forward so text is fully visible to camera
    board.rotation.y = Math.PI / 4; // rotated 45 degrees for dynamic diamond look
    capGroup.add(board);

    // 3. Central Button
    const capButtonGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const capButton = new THREE.Mesh(capButtonGeo, metalMaterial);
    capButton.position.set(0, 0.18, -0.05);
    capGroup.add(capButton);

    // 4. Tassel String (hanging down the right front side)
    const tasselStringGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.8, 8);
    const tasselString = new THREE.Mesh(tasselStringGeo, glowMaterial);
    // Positioned to run from center to the right edge and hang down
    tasselString.position.set(0.4, 0.05, 0.3);
    tasselString.rotation.z = -Math.PI / 6; // Angled down
    tasselString.rotation.x = 0.15;
    capGroup.add(tasselString);

    // 5. Tassel Fringe (hanging cone)
    const tasselFringeGeo = new THREE.ConeGeometry(0.05, 0.16, 16);
    const tasselFringe = new THREE.Mesh(tasselFringeGeo, glowMaterial);
    tasselFringe.position.set(0.75, -0.32, 0.45);
    capGroup.add(tasselFringe);

    headGroup.add(capGroup);

    // G. Ear Plates
    const earGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 32);
    
    const leftEar = new THREE.Mesh(earGeo, metalMaterial);
    leftEar.position.set(-0.85, 0.05, 0);
    leftEar.rotation.z = Math.PI / 2;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, metalMaterial);
    rightEar.position.set(0.85, 0.05, 0);
    rightEar.rotation.z = -Math.PI / 2;
    headGroup.add(rightEar);

    // Ear Glowing Rings
    const earRingGeo = new THREE.TorusGeometry(0.20, 0.02, 8, 32);
    
    const leftEarRing = new THREE.Mesh(earRingGeo, glowMaterial);
    leftEarRing.position.set(-0.93, 0.05, 0);
    leftEarRing.rotation.y = Math.PI / 2;
    headGroup.add(leftEarRing);

    const rightEarRing = new THREE.Mesh(earRingGeo, glowMaterial);
    rightEarRing.position.set(0.93, 0.05, 0);
    rightEarRing.rotation.y = -Math.PI / 2;
    headGroup.add(rightEarRing);

    // H. Neck Connection
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.6, 32);
    const neck = new THREE.Mesh(neckGeo, metalMaterial);
    neck.position.set(0, -1.0, -0.15);
    neck.rotation.x = 0.05;
    headGroup.add(neck);

    // I. Collar / Base
    const collarGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.15, 32);
    const collar = new THREE.Mesh(collarGeo, metalMaterial);
    collar.position.set(0, -1.3, -0.2);
    headGroup.add(collar);

    // --- 4. Concentric Holographic Base Rings ---
    const projectorGroup = new THREE.Group();
    projectorGroup.position.set(0, -1.45, -0.2);
    scene.add(projectorGroup);

    const baseRingGeo1 = new THREE.TorusGeometry(0.8, 0.015, 8, 64);
    const baseRingGeo2 = new THREE.TorusGeometry(1.0, 0.01, 8, 64);

    const baseRing1 = new THREE.Mesh(baseRingGeo1, glowMaterial);
    baseRing1.rotation.x = Math.PI / 2;
    projectorGroup.add(baseRing1);

    const baseRing2 = new THREE.Mesh(baseRingGeo2, purpleGlowMaterial);
    baseRing2.rotation.x = Math.PI / 2;
    projectorGroup.add(baseRing2);

    // Particle circle/dots
    const particleCount = 24;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.6;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });
    const baseParticles = new THREE.Points(particleGeo, particleMat);
    projectorGroup.add(baseParticles);

    // --- 5. Holographic Vertical Face Frame Ring (Centered around face) ---
    const faceRingGroup = new THREE.Group();
    faceRingGroup.position.set(0, 0.1, -0.1); 
    scene.add(faceRingGroup);

    const faceRingGeo1 = new THREE.TorusGeometry(1.22, 0.012, 8, 64);
    const faceRingGeo2 = new THREE.TorusGeometry(1.30, 0.006, 8, 64);

    const faceRing1 = new THREE.Mesh(faceRingGeo1, glowMaterial);
    faceRingGroup.add(faceRing1);

    const faceRing2 = new THREE.Mesh(faceRingGeo2, purpleGlowMaterial);
    faceRingGroup.add(faceRing2);

    // --- 6. Viewport Mouse Movement Tracking ---
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1.0; 
      lastMouseMoveRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleMouseMove);

    // --- 7. Animation Loop ---
    let animationId;
    const clock = new THREE.Clock();
    let blinkTimer = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Check if mouse is idle (1.8 seconds)
      const isMouseIdle = Date.now() - lastMouseMoveRef.current > 1800;
      if (isMouseIdle) {
        const targetAngleInRad = (lookAngleRef.current * Math.PI) / 180;
        mouseRef.current.targetX = Math.sin(targetAngleInRad) * 0.7;
        mouseRef.current.targetY = -0.35;
      }

      // Smooth dampening (lerp)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Rotate head based on mouse tracking
      headGroup.rotation.y = mouse.x * Math.PI * 0.14;
      headGroup.rotation.x = -mouse.y * Math.PI * 0.08;

      // Translate eyes horizontally/vertically
      const eyeLookOffsetLimitX = 0.10;
      const eyeLookOffsetLimitY = 0.06;
      
      leftEye.position.x = -0.25 + mouse.x * eyeLookOffsetLimitX;
      leftEye.position.y = 0.25 + mouse.y * eyeLookOffsetLimitY;
      rightEye.position.x = 0.25 + mouse.x * eyeLookOffsetLimitX;
      rightEye.position.y = 0.25 + mouse.y * eyeLookOffsetLimitY;

      // Blinking logic
      blinkTimer += 0.016;
      if (blinkTimer > 4.5) {
        const blinkProgress = (blinkTimer - 4.5) / 0.16;
        if (blinkProgress <= 1.0) {
          const blinkScale = Math.abs(Math.sin(blinkProgress * Math.PI) - 1.0);
          leftEye.scale.x = blinkScale;
          rightEye.scale.x = blinkScale;
        } else {
          leftEye.scale.x = 1;
          rightEye.scale.x = 1;
          blinkTimer = 0;
        }
      }

      // Visor Screen Pulsing glow and scale (breathing/talking effect)
      if (screenMatRef.current) {
        screenMatRef.current.opacity = 0.75 + Math.sin(elapsedTime * 4.0) * 0.15;
      }
      if (screenMesh) {
        const mouthPulse = 1.0 + Math.sin(elapsedTime * 4.0) * 0.08;
        screenMesh.scale.set(mouthPulse, mouthPulse, 1.0);
      }

      // Floating hover motion
      const hover = Math.sin(elapsedTime * 1.5) * 0.04;
      headGroup.position.y = hover + 0.1;

      // Spin base holographic rings
      baseRing1.rotation.z = elapsedTime * 0.2;
      baseRing2.rotation.z = -elapsedTime * 0.4;
      baseParticles.rotation.y = elapsedTime * 0.3;

      // Spin vertical face frame ring
      faceRing1.rotation.z = -elapsedTime * 0.1;
      faceRing2.rotation.z = elapsedTime * 0.2;

      // Flicker effect
      const flicker = 0.85 + Math.sin(elapsedTime * 25) * 0.08 + Math.random() * 0.05;
      glowMaterial.opacity = flicker;
      purpleGlowMaterial.opacity = flicker * 0.8;
      
      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 768;
  const size = isMobileViewport ? 180 : 280;
  const bottomOffset = isMobileViewport ? "20px" : "35px";

  return (
    <div 
      className="three-head-wrapper"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        bottom: bottomOffset,
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div 
        ref={containerRef} 
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          position: "relative",
        }}
      />
    </div>
  );
}
