// 3D Volcano Canvas Visualizer (HTML5 Canvas 3D Particle & Wireframe Shader - Zero External Dependency)
export class Volcano3DVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width = this.canvas.offsetWidth || 600;
    this.height = this.canvas.height = this.canvas.offsetHeight || 380;
    
    this.particles = [];
    this.rotationY = 0.3;
    this.rotationX = 0.25;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.animId = null;

    this.initParticles();
    this.setupEvents();
    this.animate = this.animate.bind(this);
  }

  initParticles() {
    this.particles = [];
    // Magma & smoke particles
    for (let i = 0; i < 90; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    return {
      x: (Math.random() - 0.5) * 40,
      y: -60 - Math.random() * 20,
      z: (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.2 - Math.random() * 2.2,
      vz: (Math.random() - 0.5) * 1.5,
      size: 4 + Math.random() * 7,
      color: Math.random() > 0.4 ? 'rgba(255, 87, 34, ' : 'rgba(255, 193, 7, ',
      alpha: 1,
      life: 1,
      decay: 0.012 + Math.random() * 0.015
    };
  }

  setupEvents() {
    if (!this.canvas) return;

    const onStart = (x, y) => {
      this.isDragging = true;
      this.lastMouseX = x;
      this.lastMouseY = y;
    };

    const onMove = (x, y) => {
      if (!this.isDragging) return;
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      this.rotationY += dx * 0.01;
      this.rotationX = Math.max(-0.4, Math.min(0.6, this.rotationX + dy * 0.01));
      this.lastMouseX = x;
      this.lastMouseY = y;
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onEnd);
  }

  project(x, y, z) {
    // 3D rotation
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);

    // Rotate around Y
    let x1 = x * cosY - z * sinY;
    let z1 = z * cosY + x * sinY;

    // Rotate around X
    let y2 = y * cosX - z1 * sinX;
    let z2 = z1 * cosX + y * sinX;

    const cameraDist = 380;
    const fov = cameraDist / (cameraDist + z2);

    return {
      x: this.width / 2 + x1 * fov,
      y: this.height / 2 + y2 * fov + 35,
      scale: fov,
      depth: z2
    };
  }

  start() {
    if (!this.animId) {
      this.animate();
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);
    this.render();
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // If not dragging, auto rotate slowly
    if (!this.isDragging) {
      this.rotationY += 0.008;
    }

    // Draw Volcano Body (Layers of concentric circles / cone structure)
    const layers = 14;
    const maxHeight = 130;
    const baseRadius = 150;
    const craterRadius = 28;

    // Mountain segments
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const r = baseRadius * (1 - t) + craterRadius * t;
      const y = (1 - t) * 60 - t * maxHeight;
      
      const numPts = 24;
      const pts = [];
      for (let j = 0; j <= numPts; j++) {
        const ang = (j / numPts) * Math.PI * 2;
        // subtle terrain jaggedness
        const bump = Math.sin(ang * 5 + i * 2) * 4;
        const px = Math.cos(ang) * (r + bump);
        const pz = Math.sin(ang) * (r + bump);
        pts.push(this.project(px, y, pz));
      }

      // Draw wireframe contour with earthy volcano styling
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        this.ctx.lineTo(pts[j].x, pts[j].y);
      }
      this.ctx.closePath();
      
      const shade = Math.floor(40 + t * 50);
      const glowRed = Math.floor(t * 180);
      this.ctx.strokeStyle = `rgba(${glowRed + 60}, ${shade + 10}, 30, ${0.45 + t * 0.4})`;
      this.ctx.lineWidth = 1.6 + t;
      this.ctx.stroke();

      if (i === layers - 1) {
        // Crater Glowing Magma pool
        this.ctx.fillStyle = 'rgba(255, 100, 20, 0.75)';
        this.ctx.shadowColor = '#ff5722';
        this.ctx.shadowBlur = 15;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    // Draw Magma Rivers / Glowing Crevices
    for (let c = 0; c < 5; c++) {
      const baseAng = (c / 5) * Math.PI * 2 + 0.3;
      this.ctx.beginPath();
      for (let i = layers - 1; i >= 0; i--) {
        const t = i / (layers - 1);
        const r = baseRadius * (1 - t) + craterRadius * t;
        const y = (1 - t) * 60 - t * maxHeight;
        const ang = baseAng + Math.sin(i * 0.8) * 0.2;
        const p = this.project(Math.cos(ang) * r, y, Math.sin(ang) * r);
        if (i === layers - 1) this.ctx.moveTo(p.x, p.y);
        else this.ctx.lineTo(p.x, p.y);
      }
      this.ctx.strokeStyle = 'rgba(255, 160, 0, 0.8)';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    }

    // Update and draw eruption particles
    this.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles[idx] = this.createParticle();
        return;
      }

      const proj = this.project(p.x, p.y, p.z);
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + p.alpha + ')';
      this.ctx.fill();
    });
  }
}
