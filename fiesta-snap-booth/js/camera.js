/* Fiesta Snap Booth — camera capture controller */
(function (global) {

  let audioCtx = null;
  function playShutter() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, t0);
      osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);
      gain.gain.setValueAtTime(0.18, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    } catch (e) { /* audio not available, fail silently */ }
  }

  class CameraController {
    /**
     * @param {Object} opts
     * @param {HTMLVideoElement} opts.videoEl
     * @param {HTMLCanvasElement} opts.canvasEl - offscreen capture canvas
     * @param {HTMLElement} opts.flashEl
     * @param {HTMLElement} opts.countdownOverlay
     * @param {HTMLElement} opts.countdownNum
     * @param {HTMLElement} opts.progressDots
     * @param {HTMLElement} opts.captionEl
     */
    constructor(opts) {
      Object.assign(this, opts);
      this.stream = null;
      this.usingRemoteStream = false;
    }

    async startLocal() {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      this.videoEl.srcObject = this.stream;
      this.usingRemoteStream = false;
      await this.videoEl.play().catch(() => {});
    }

    useRemoteStream(mediaStream) {
      this.stream = mediaStream;
      this.videoEl.srcObject = mediaStream;
      this.usingRemoteStream = true;
      this.videoEl.play().catch(() => {});
    }

    stop() {
      if (this.stream && !this.usingRemoteStream) {
        this.stream.getTracks().forEach((t) => t.stop());
      }
      this.stream = null;
    }

    setProgress(total, current, doneCount) {
      this.progressDots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('span');
        if (i < doneCount) dot.classList.add('is-done');
        else if (i === current) dot.classList.add('is-current');
        this.progressDots.appendChild(dot);
      }
    }

    async countdown(seconds, onTick) {
      this.countdownOverlay.classList.add('is-active');
      for (let s = seconds; s >= 1; s--) {
        this.countdownNum.textContent = s;
        this.countdownNum.classList.remove('zoom');
        void this.countdownNum.offsetWidth; // reflow to restart animation
        this.countdownNum.classList.add('zoom');
        if (onTick) onTick(s);
        await wait(1000);
      }
      this.countdownOverlay.classList.remove('is-active');
    }

    flash() {
      this.flashEl.classList.remove('is-flashing');
      void this.flashEl.offsetWidth;
      this.flashEl.classList.add('is-flashing');
      playShutter();
    }

    /** Capture one frame from the live video, applying a CSS filter string, return dataURL */
    captureFrame(filterCss) {
      const video = this.videoEl;
      const canvas = this.canvasEl;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 960;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      ctx.save();
      // mirror to match the preview (front camera feels natural mirrored)
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      if (filterCss && filterCss !== 'none') ctx.filter = filterCss;
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.restore();
      return canvas.toDataURL('image/png');
    }

    /**
     * Runs the full 4-shot sequence.
     * @param {Object} cfg - { shots, initialCountdown, gapSeconds, filterCss, onProgress, onCaptured }
     * @returns {Promise<string[]>} array of dataURLs
     */
    async runSequence(cfg) {
      const { shots = 4, initialCountdown = 3, gapSeconds = 2, filterCss, onProgress, onCaptured } = cfg;
      const photos = [];
      for (let i = 0; i < shots; i++) {
        this.setProgress(shots, i, i);
        const cd = i === 0 ? initialCountdown : gapSeconds;
        await this.countdown(cd, (s) => onProgress && onProgress(i, s));
        this.flash();
        await wait(120);
        const dataUrl = this.captureFrame(filterCss);
        photos.push(dataUrl);
        this.setProgress(shots, i, i + 1);
        if (onCaptured) onCaptured(i, dataUrl);
        await wait(250);
      }
      return photos;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  global.CameraController = CameraController;
})(window);
