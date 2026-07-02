import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// ==========================================
// GLOBALS & STATE
// ==========================================
const TOTAL_FRAMES = 240;
const images = [];
let loadedCount = 0;
let targetFrame = 0;
let currentFrame = 0;
let isLoaded = false;
const loadStartTime = Date.now();

// DOM Cache
const watchCanvas = document.getElementById('watch-canvas');
const watchCtx = watchCanvas?.getContext('2d');
const particleCanvas = document.getElementById('particle-canvas');
const particleCtx = particleCanvas?.getContext('2d');
const loaderProgress = document.getElementById('loader-progress');
const loadPercentage = document.getElementById('load-percentage');
const ambientOverlay = document.getElementById('ambient-light-overlay');

// ==========================================
// 1. CINEMATIC SMOOTH SCROLL (LENIS)
// ==========================================
const lenis = new Lenis({
  duration: 2.5, 
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
  direction: 'vertical',
  gestureDirection: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 0.95,
  touchMultiplier: 1.4,
  infinite: false,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Disable scroll while loading
lenis.stop();

// ==========================================
// 2. CONCURRENT IMAGE PRELOAD SYSTEM
// ==========================================
function preloadImages(onProgress, onComplete) {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(4, '0');
    // Reference the exact folder structure: /watch _site/frame_####.jpg
    img.src = `/watch _site/frame_${frameNum}.jpg`;
    img.onload = () => handleFrameLoaded(onProgress, onComplete);
    img.onerror = () => handleFrameLoaded(onProgress, onComplete);
    images.push(img);
  }
}

function handleFrameLoaded(onProgress, onComplete) {
  loadedCount++;
  const progress = loadedCount / TOTAL_FRAMES;
  onProgress(progress);

  if (loadedCount === TOTAL_FRAMES) {
    onComplete();
  }
}

// Start preloading
preloadImages(
  (progress) => {
    if (loaderProgress) loaderProgress.style.width = `${progress * 100}%`;
    if (loadPercentage) loadPercentage.textContent = `${Math.round(progress * 100).toString().padStart(2, '0')}%`;
  },
  () => {
    isLoaded = true;
    checkLoadingTimeAndTransition();
  }
);

function checkLoadingTimeAndTransition() {
  const elapsedTime = Date.now() - loadStartTime;
  const remainingTime = 5000 - elapsedTime;

  if (remainingTime > 0) {
    setTimeout(triggerCinematicTransition, remainingTime);
  } else {
    triggerCinematicTransition();
  }
}

// ==========================================
// 3. CINEMATIC SHUTTER SPLIT TRANSITION
// ==========================================
function triggerCinematicTransition() {
  gsap.to('#loader', {
    opacity: 0,
    duration: 1.0,
    ease: 'power3.inOut',
    onComplete: () => {
      const loaderEl = document.getElementById('loader');
      if (loaderEl) loaderEl.style.display = 'none';
    }
  });

  gsap.timeline({
    onComplete: () => {
      const shutterEl = document.getElementById('transition-shutter');
      if (shutterEl) shutterEl.style.display = 'none';
      lenis.start();
      ScrollTrigger.refresh();
    }
  })
  .to('#shutter-top', {
    y: '-100%',
    duration: 1.6,
    ease: 'power4.inOut'
  }, 0.2)
  .to('#shutter-bottom', {
    y: '100%',
    duration: 1.6,
    ease: 'power4.inOut'
  }, 0.2)
  .to('#smooth-wrapper', {
    opacity: 1,
    duration: 1.6,
    ease: 'power2.out'
  }, 0.5);

  gsap.to(ambientOverlay, { opacity: 1, duration: 2.0 });
  
  resizeCanvas();
  renderLoop();
  initScrollAnimations();
}

// ==========================================
// 4. OPTIMIZED CANVAS RENDERING ENGINE
// ==========================================
function resizeCanvas() {
  if (!watchCanvas) return;
  
  const rect = watchCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  watchCanvas.width = rect.width * dpr;
  watchCanvas.height = rect.height * dpr;
  
  if (watchCtx) {
    watchCtx.scale(dpr, dpr);
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  resizeParticleCanvas();
});

function drawFrame(index) {
  if (!watchCanvas || !watchCtx || !images[index]) return;

  const img = images[index];
  const rect = watchCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  watchCtx.clearRect(0, 0, width, height);

  // Maintain aspect ratio CONTAIN behavior
  const imgRatio = img.width / img.height;
  
  const marginScale = window.innerWidth < 768 ? 0.90 : 0.85; 
  const maxDrawWidth = width * marginScale;
  const maxDrawHeight = height * marginScale;
  
  let drawWidth, drawHeight;
  
  if (maxDrawWidth / imgRatio <= maxDrawHeight) {
    drawWidth = maxDrawWidth;
    drawHeight = maxDrawWidth / imgRatio;
  } else {
    drawHeight = maxDrawHeight;
    drawWidth = maxDrawHeight * imgRatio;
  }
  
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  watchCtx.drawImage(img, x, y, drawWidth, drawHeight);
}

function renderLoop() {
  currentFrame += (targetFrame - currentFrame) * 0.07; 
  
  const frameToDraw = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));
  
  if (images[frameToDraw] && images[frameToDraw].complete) {
    drawFrame(frameToDraw);
  }

  updateSideInfo(frameToDraw);
  renderParticles();
  
  requestAnimationFrame(renderLoop);
}

// ==========================================
// 5. PROGRESSIVE SIDE INFORMATION DISPLAYER
// ==========================================
function updateSideInfo(frameIndex) {
  const infoItems = document.querySelectorAll('.side-info-item');
  
  infoItems.forEach((item) => {
    const start = parseInt(item.dataset.rangeStart, 10);
    const end = parseInt(item.dataset.rangeEnd, 10);
    
    if (frameIndex >= start && frameIndex <= end) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ==========================================
// 6. AMBIENT MOVING REFLECTIONS & PARTICLES
// ==========================================
window.addEventListener('mousemove', (e) => {
  if (!ambientOverlay) return;
  const x = e.clientX;
  const y = e.clientY;
  ambientOverlay.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.08) 0%, transparent 65%)`;
});

// Particles System
let particles = [];
const PARTICLE_COUNT = 55;

function resizeParticleCanvas() {
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
resizeParticleCanvas();

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 1.5 + 0.5,
    speedX: Math.random() * 0.4 - 0.2,
    speedY: -(Math.random() * 0.6 + 0.1),
    opacity: Math.random() * 0.14 + 0.04,
    frequency: Math.random() * 0.01 + 0.002,
    offset: Math.random() * 100
  });
}

function renderParticles() {
  if (!particleCanvas || !particleCtx) return;
  
  const width = particleCanvas.width;
  const height = particleCanvas.height;
  
  particleCtx.clearRect(0, 0, width, height);
  
  particles.forEach((p) => {
    p.x += p.speedX + Math.sin(p.y * p.frequency + p.offset) * 0.15;
    p.y += p.speedY;
    
    if (p.y < -10) {
      p.y = height + 10;
      p.x = Math.random() * width;
    }
    if (p.x < -10 || p.x > width + 10) {
      p.x = Math.random() * width;
    }
    
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
    particleCtx.shadowBlur = 4;
    particleCtx.shadowColor = '#ffffff';
    particleCtx.fill();
    particleCtx.shadowBlur = 0;
  });
}

// ==========================================
// 7. SCROLLTRIGGERS AND PINNING INITIALIZATION
// ==========================================
function initScrollAnimations() {
  
  // Pin hero section relative container and scrub target frame index (+=9000px)
  ScrollTrigger.create({
    trigger: '#hero-section',
    start: 'top top',
    end: '+=9000', 
    pin: true,
    scrub: 0.1, 
    anticipatePin: 1,
    onUpdate: (self) => {
      targetFrame = Math.floor(self.progress * (TOTAL_FRAMES - 1));
    }
  });

  // Manifesto Section quote reveal fade
  gsap.from('.reveal-fade-scroll', {
    opacity: 0,
    y: 50,
    filter: 'blur(12px)',
    duration: 1.6,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.reveal-fade-scroll',
      start: 'top 85%',
    }
  });

  // Stacking glass cards timeline with ScrollTrigger
  const cards = gsap.utils.toArray('.luxury-card');
  const totalCards = cards.length;
  
  const cardTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#cards-section',
      start: 'top top',
      end: '+=4500', 
      scrub: true,
      pin: true,
      anticipatePin: 1,
    }
  });

  // Setup initial stacking positions
  cards.forEach((card, index) => {
    if (index !== 0) {
      gsap.set(card, { y: '100vh', scale: 0.9, opacity: 0 });
    } else {
      gsap.set(card, { y: 0, scale: 1, opacity: 1 });
    }
  });

  // Card slide up and stack triggers
  cards.forEach((card, index) => {
    if (index === 0) return;
    
    cardTimeline.to(card, {
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'none'
    }, index - 0.75);

    for (let prevIdx = 0; prevIdx < index; prevIdx++) {
      const scaleOffset = 1 - (index - prevIdx) * 0.045;
      const yOffset = -(index - prevIdx) * 35;
      const blurOffset = (index - prevIdx) * 3;
      const opacityOffset = 0.5 / (index - prevIdx);
      
      cardTimeline.to(cards[prevIdx], {
        scale: scaleOffset,
        y: yOffset,
        opacity: opacityOffset,
        filter: `blur(${blurOffset}px)`,
        duration: 1,
        ease: 'none'
      }, index - 0.75);
    }
  });

  cardTimeline.eventCallback("onUpdate", () => {
    const progress = cardTimeline.progress(); 
    const activeIndex = Math.min(totalCards - 1, Math.floor(progress * totalCards));
    updateCardDots(activeIndex);
  });

  // ==========================================
  // 8. HORIZONTAL SHOWCASE SLIDE TIMELINE
  // ==========================================
  const showcaseStrip = document.getElementById('showcase-strip');
  
  if (showcaseStrip) {
    const scrollAmount = showcaseStrip.scrollWidth - window.innerWidth;
    
    gsap.fromTo(showcaseStrip, 
      { x: 0 },
      {
        x: -scrollAmount,
        scrollTrigger: {
          trigger: '#showcase-section',
          start: 'top top',
          end: '+=3000', 
          scrub: true,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const progressBar = document.getElementById('showcase-progress');
            if (progressBar) {
              progressBar.style.width = `${self.progress * 100}%`;
            }
          }
        }
      }
    );
  }

  // Story Section progressive reveals
  gsap.from('#story-section .space-y-6', {
    y: 50,
    opacity: 0,
    stagger: 0.25,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#story-section',
      start: 'top 80%',
    }
  });

  gsap.from('#story-section .neon-glow-border', {
    y: 60,
    opacity: 0,
    stagger: 0.25,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#story-section',
      start: 'top 80%',
    }
  });

  // Craftsmanship block reveals
  gsap.from('.craft-panel-hover-line', {
    x: -40,
    opacity: 0,
    stagger: 0.2,
    duration: 1.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#story-section', 
      start: 'bottom 40%',
    }
  });

  // Specifications index grids fade reveals
  gsap.from('.spec-list-row', {
    y: 35,
    opacity: 0,
    stagger: 0.08,
    duration: 1.0,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#specs-section',
      start: 'top 75%',
    }
  });

  // Final acquisition CTA reveals
  gsap.from('#purchase-section h2, #purchase-section p, #purchase-section .whatsapp-btn', {
    y: 45,
    opacity: 0,
    stagger: 0.15,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#purchase-section',
      start: 'top 75%',
    }
  });
}

function updateCardDots(activeIndex) {
  for (let i = 0; i < 5; i++) {
    const dot = document.getElementById(`card-dot-${i}`);
    if (dot) {
      if (i === activeIndex) {
        dot.className = 'w-10 h-[2px] bg-white transition-all duration-300 rounded';
      } else {
        dot.className = 'w-3 h-[2px] bg-zinc-800 transition-all duration-300 rounded';
      }
    }
  }
}

// ==========================================
// 9. 3D GLOSSY CARD TILT INTERACTIVE ENGINE
// ==========================================
const cardsList = document.querySelectorAll('.luxury-card');

cardsList.forEach((card) => {
  const glow = card.querySelector('.card-glow');
  
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top;  
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((centerY - y) / centerY) * 7; 
    const rotateY = -((centerX - x) / centerX) * 7; 
    
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    
    if (glow) {
      glow.style.opacity = '1';
      glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.18) 0%, transparent 60%)`;
    }
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
    if (glow) {
      glow.style.opacity = '0';
    }
  });
});
