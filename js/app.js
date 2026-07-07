/* Fiesta Snap Booth — main app controller */
(function () {
  const { TEMPLATES, DECORATIONS, FILTERS, getTemplate, getFilter, drawPhotoStrip, loadImages } = window.FiestaTemplates;

  const state = {
    templateId: TEMPLATES[0].id,
    decorations: ['confetti', 'stars'],
    filterId: 'original',
    text: { eventName: '', guestName: '', date: '', message: '' },
    photos: [],
    remote: { role: null, pairing: null, connected: false }
  };

  const el = (id) => document.getElementById(id);
  const screens = document.querySelectorAll('.screen');

  function showScreen(name) {
    screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- banderita string ----------
  function buildBanderitaString() {
    const wrap = el('banderitaString');
    const colors = ['var(--red)', 'var(--yellow)', 'var(--blue)', 'var(--green)', 'var(--orange)', 'var(--pink)'];
    const count = Math.ceil(window.innerWidth / 46);
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<span class="flag" style="--fc:${colors[i % colors.length]}; animation-delay:${(i % 5) * 0.15}s"></span>`;
    }
    wrap.innerHTML = html;
  }

  // ---------- ambient confetti ----------
  let ambientField, burstField;
  function initConfetti() {
    ambientField = new ConfettiField(el('ambientConfetti'), { density: 0.6 });
    ambientField.start();
    burstField = new ConfettiField(el('resultBurst'), { density: 0 });
  }

  // ---------- template grid ----------
  function renderTemplateGrid() {
    const grid = el('templateGrid');
    grid.innerHTML = TEMPLATES.map((t) => `
      <button class="template-card ${t.id === state.templateId ? 'is-selected' : ''}" data-template="${t.id}">
        <div class="template-swatch" style="background:linear-gradient(160deg, ${t.bg[0]}, ${t.bg[1]})">
          ${t.emoji.map((e) => `<span>${e}</span>`).join('')}
        </div>
        <div class="template-name">${t.name}</div>
      </button>
    `).join('');
    grid.querySelectorAll('.template-card').forEach((card) => {
      card.addEventListener('click', () => {
        state.templateId = card.dataset.template;
        renderTemplateGrid();
        prefillTextFromTemplate();
      });
    });
  }

  function prefillTextFromTemplate() {
    const t = getTemplate(state.templateId);
    if (!el('inpEventName').value) el('inpEventName').placeholder = t.defaultTitle;
    if (!el('inpMessage').value) el('inpMessage').placeholder = t.defaultMessage;
  }

  // ---------- chips ----------
  function renderChips() {
    const decoWrap = el('decorationChips');
    decoWrap.innerHTML = DECORATIONS.map((d) => `
      <button class="chip ${state.decorations.includes(d.id) ? 'is-selected' : ''}" data-deco="${d.id}">${d.label}</button>
    `).join('');
    decoWrap.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.deco;
        const idx = state.decorations.indexOf(id);
        if (idx > -1) state.decorations.splice(idx, 1);
        else state.decorations.push(id);
        chip.classList.toggle('is-selected');
      });
    });

    const filterWrap = el('filterChips');
    filterWrap.innerHTML = FILTERS.map((f) => `
      <button class="chip ${f.id === state.filterId ? 'is-selected' : ''}" data-filter="${f.id}">${f.label}</button>
    `).join('');
    filterWrap.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.filterId = chip.dataset.filter;
        filterWrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
      });
    });
  }

  // ---------- camera controller ----------
  let cam;
  function initCamera() {
    cam = new CameraController({
      videoEl: el('videoEl'),
      canvasEl: el('captureCanvas'),
      flashEl: el('flashEl'),
      countdownOverlay: el('countdownOverlay'),
      countdownNum: el('countdownNum'),
      progressDots: el('progressDots'),
      captionEl: el('cameraCaption')
    });
  }

  async function enterCameraScreen() {
    showScreen('camera');
    el('cameraCaption').textContent = 'Get ready — first pose in 3…';
    el('hudSource').textContent = state.remote.connected ? '📱 Remote camera (phone)' : '📷 Local camera';
    try {
      if (state.remote.connected && state.remote.stream) {
        cam.useRemoteStream(state.remote.stream);
      } else {
        await cam.startLocal();
      }
    } catch (err) {
      alert('We could not access a camera. Please allow camera permission and try again.');
      showScreen('templates');
      return;
    }

    const filter = getFilter(state.filterId);
    const photos = await cam.runSequence({
      shots: 4,
      initialCountdown: 3,
      gapSeconds: 2,
      filterCss: filter.css,
      onProgress: (shotIndex, secondsLeft) => {
        el('cameraCaption').textContent = shotIndex === 0
          ? `Get ready — first pose in ${secondsLeft}…`
          : `Next pose (${shotIndex + 1}/4) in ${secondsLeft}…`;
        if (state.remote.connected && state.remote.pairing) {
          state.remote.pairing.send(`countdown:${secondsLeft}`);
        }
      },
      onCaptured: (shotIndex) => {
        el('cameraCaption').textContent = `Got it! (${shotIndex + 1}/4) 🎉`;
        if (state.remote.connected && state.remote.pairing) {
          state.remote.pairing.send('flash');
        }
      }
    });

    state.photos = photos;
    if (!state.remote.connected) cam.stop();
    await processAndShowResult();
  }

  // ---------- processing + compositing ----------
  async function processAndShowResult() {
    showScreen('processing');
    const template = getTemplate(state.templateId);
    const images = await loadImages(state.photos);
    template._imgCache = images;

    // small delay so the loading animation is felt, not just flashed
    await new Promise((r) => setTimeout(r, 1400));

    const canvas = document.createElement('canvas');
    drawPhotoStrip(canvas, state.photos, template, state.decorations, {
      eventName: el('inpEventName').value.trim(),
      guestName: el('inpGuestName').value.trim(),
      date: el('inpDate').value.trim(),
      message: el('inpMessage').value.trim()
    });

    el('resultImage').src = canvas.toDataURL('image/png');
    el('resultImage').dataset.filename = `fiesta-snap-booth-${Date.now()}.png`;
    showScreen('result');
    burstField.burst(window.innerWidth / 2, window.innerHeight * 0.3, 140);
    setTimeout(() => burstField.burst(window.innerWidth * 0.2, window.innerHeight * 0.4, 60), 300);
    setTimeout(() => burstField.burst(window.innerWidth * 0.8, window.innerHeight * 0.4, 60), 500);
  }

  function downloadResult() {
    const img = el('resultImage');
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.dataset.filename || 'fiesta-snap-booth.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareResult() {
    const img = el('resultImage');
    try {
      if (navigator.canShare && navigator.share) {
        const res = await fetch(img.src);
        const blob = await res.blob();
        const file = new File([blob], img.dataset.filename || 'fiesta-snap-booth.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Fiesta Snap Booth', text: 'Check out our photo strip!' });
          return;
        }
      }
    } catch (e) { /* fall through to download */ }
    downloadResult();
  }

  function resetForAnother() {
    state.photos = [];
    showScreen('templates');
  }

  // ---------- remote pairing UI ----------
  function initRemoteUI() {
    const roleCards = el('roleCards');
    const pairingBox = el('pairingBox');
    const pairingSteps = el('pairingSteps');
    const outLabel = el('pairingOutLabel');
    const outBox = el('pairingOut');
    const inWrap = el('pairingInWrap');
    const inLabel = el('pairingInLabel');
    const inBox = el('pairingIn');
    const btnUseCode = el('btnUseCode');
    const status = el('pairingStatus');

    roleCards.querySelectorAll('.role-card').forEach((card) => {
      card.addEventListener('click', async () => {
        roleCards.querySelectorAll('.role-card').forEach((c) => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        const role = card.dataset.role;
        state.remote.role = role;
        pairingBox.hidden = false;
        state.remote.pairing = new RemotePairing(role);

        state.remote.pairing.onConnectionState = (cs) => {
          if (cs === 'connected') {
            status.textContent = '✅ Connected! You can head to the kiosk screen now.';
            state.remote.connected = true;
          } else if (cs === 'failed' || cs === 'disconnected') {
            status.textContent = '⚠️ Connection lost. Try pairing again.';
            state.remote.connected = false;
          }
        };

        if (role === 'tablet') {
          pairingSteps.innerHTML = `
            <li>Tap <strong>Copy code</strong> below and send it to the phone (AirDrop, chat, etc).</li>
            <li>On the phone, open this same page, choose <strong>Camera</strong>, and paste the code.</li>
            <li>Copy the phone's reply code back here and press <strong>Connect</strong>.</li>`;
          outLabel.textContent = 'Step 1 — your kiosk code';
          status.textContent = 'Generating pairing code…';
          inWrap.hidden = false;
          inLabel.textContent = 'Step 3 — paste the phone\'s reply code here';

          state.remote.pairing.onRemoteStream = (stream) => {
            state.remote.stream = stream;
          };

          const code = await state.remote.pairing.createOfferCode();
          outBox.value = code;
          status.textContent = 'Send this code to the phone, then paste its reply below.';

          btnUseCode.onclick = async () => {
            if (!inBox.value.trim()) return;
            status.textContent = 'Connecting…';
            try {
              await state.remote.pairing.completeWithAnswerCode(inBox.value.trim());
              status.textContent = 'Finalizing connection…';
            } catch (e) {
              status.textContent = '⚠️ That code did not work. Double-check and try again.';
            }
          };
        } else {
          pairingSteps.innerHTML = `
            <li>Paste the kiosk's code below, then press <strong>Connect</strong> — this will ask for camera access.</li>
            <li>Copy the reply code that appears and send it back to the kiosk.</li>
            <li>Keep this tab open — it's now your roaming fiesta camera! 🎉</li>`;
          outLabel.textContent = 'Step 2 — your camera\'s reply code';
          outBox.value = '';
          outBox.placeholder = 'Will appear here after you connect below...';
          inWrap.hidden = false;
          inLabel.textContent = 'Step 1 — paste the kiosk\'s code here';
          status.textContent = 'Waiting for the kiosk code…';

          btnUseCode.textContent = 'Connect';
          btnUseCode.onclick = async () => {
            if (!inBox.value.trim()) return;
            status.textContent = 'Requesting camera access…';
            try {
              const { code, localStream } = await state.remote.pairing.acceptOfferAndGetCamera(inBox.value.trim());
              outBox.value = code;
              status.textContent = 'Camera live! Send the reply code above back to the kiosk.';
              // preview own stream locally too, if a video element existed here we could show it
            } catch (e) {
              status.textContent = '⚠️ Could not read that code or access the camera.';
            }
          };
        }
      });
    });

    el('btnCopyCode').addEventListener('click', () => {
      outBox.select();
      document.execCommand('copy');
      el('btnCopyCode').textContent = 'Copied!';
      setTimeout(() => (el('btnCopyCode').textContent = 'Copy code'), 1500);
    });
  }

  // ---------- wire up static buttons ----------
  function wireNav() {
    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => showScreen(btn.dataset.goto));
    });
    el('btnStart').addEventListener('click', () => showScreen('templates'));
    el('btnRemoteMode').addEventListener('click', () => showScreen('remote'));
    el('btnToCamera').addEventListener('click', enterCameraScreen);
    el('btnDownload').addEventListener('click', downloadResult);
    el('btnShare').addEventListener('click', shareResult);
    el('btnAgain').addEventListener('click', resetForAnother);
  }

  // ---------- PWA ----------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', () => {
    buildBanderitaString();
    initConfetti();
    renderTemplateGrid();
    renderChips();
    prefillTextFromTemplate();
    initCamera();
    initRemoteUI();
    wireNav();
    registerServiceWorker();
  });

  window.addEventListener('resize', buildBanderitaString);
})();
