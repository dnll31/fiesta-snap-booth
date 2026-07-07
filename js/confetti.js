/* Fiesta Snap Booth — lightweight confetti engine (no dependencies) */
(function (global) {
  const COLORS = ['#E8432D', '#FFC933', '#1D8FE1', '#2FA84F', '#FF7A29', '#FF5CA6'];

  class ConfettiField {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} opts
     * @param {number} opts.density - ambient particles per 100000 px^2 (0 = no ambient rain)
     * @param {boolean} opts.gravity - whether particles fall (true) or drift (ambient)
     */
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.density = opts.density ?? 0;
      this.particles = [];
      this.running = false;
      this._resize = this._resize.bind(this);
      this._resize();
      window.addEventListener('resize', this._resize);
      if (this.density > 0) this._seedAmbient();
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
    }

    _seedAmbient() {
      const count = Math.max(8, Math.round((this.w * this.h) / 100000 * this.density));
      for (let i = 0; i < count; i++) {
        this.particles.push(this._makeParticle(true));
      }
    }

    _makeParticle(ambient, originX, originY) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (ambient) {
        return {
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          size: 5 + Math.random() * 6,
          color,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.3 + Math.random() * 0.6,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.04,
          shape: Math.random() > 0.5 ? 'rect' : 'circle',
          ambient: true
        };
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      return {
        x: originX ?? this.w / 2,
        y: originY ?? this.h / 2,
        size: 5 + Math.random() * 7,
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        gravity: 0.18,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 90 + Math.random() * 40,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        ambient: false
      };
    }

    burst(x, y, count = 80) {
      for (let i = 0; i < count; i++) {
        this.particles.push(this._makeParticle(false, x, y));
      }
      if (!this.running) this.start();
    }

    start() {
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this._tick();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    stop() {
      this.running = false;
    }

    _tick() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.particles = this.particles.filter((p) => {
        if (p.ambient) {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          if (p.y > this.h + 10) p.y = -10;
          if (p.x < -10) p.x = this.w + 10;
          if (p.x > this.w + 10) p.x = -10;
          this._draw(p);
          return true;
        } else {
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          p.life++;
          const alpha = Math.max(0, 1 - p.life / p.maxLife);
          this._draw(p, alpha);
          return p.life < p.maxLife;
        }
      });
    }

    _draw(p, alpha = 1) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  global.ConfettiField = ConfettiField;
})(window);
