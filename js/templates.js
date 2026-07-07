/* Fiesta Snap Booth — templates, decorations, filters, and strip compositing */
(function (global) {

  const TEMPLATES = [
    {
      id: 'barrio',
      name: 'Barrio Fiesta',
      bg: ['#FFF1D0', '#FFE0A3'],
      frame: '#E8432D',
      accent: '#FFC933',
      flagColors: ['#E8432D', '#FFC933', '#2FA84F', '#1D8FE1'],
      emoji: ['🎉', '🌽', '🎊'],
      defaultTitle: 'Barrio Fiesta',
      defaultMessage: 'Maligayang Pista!'
    },
    {
      id: 'colorful',
      name: 'Colorful Fiesta',
      bg: ['#FFE9F2', '#E6F6FF'],
      frame: '#FF5CA6',
      accent: '#1D8FE1',
      flagColors: ['#FF5CA6', '#FFC933', '#1D8FE1', '#2FA84F', '#FF7A29'],
      emoji: ['🎊', '🎈', '✨'],
      defaultTitle: 'Colorful Fiesta',
      defaultMessage: 'Smile bright!'
    },
    {
      id: 'flores',
      name: 'Flores de Mayo',
      bg: ['#FFF5F8', '#FFE3ED'],
      frame: '#FF5CA6',
      accent: '#2FA84F',
      flagColors: ['#FF5CA6', '#FFFFFF', '#2FA84F'],
      emoji: ['🌸', '🌺', '💐'],
      defaultTitle: 'Flores de Mayo',
      defaultMessage: 'Sagala Sweetheart'
    },
    {
      id: 'school',
      name: 'School Foundation Day',
      bg: ['#EAF3FF', '#DDEBFF'],
      frame: '#1D8FE1',
      accent: '#FFC933',
      flagColors: ['#1D8FE1', '#FFC933', '#E8432D'],
      emoji: ['🎓', '📚', '🎉'],
      defaultTitle: 'Foundation Day',
      defaultMessage: 'Proud Iskolar!'
    },
    {
      id: 'town',
      name: 'Town Fiesta',
      bg: ['#FFF3E0', '#FFE3C2'],
      frame: '#FF7A29',
      accent: '#E8432D',
      flagColors: ['#FF7A29', '#E8432D', '#FFC933'],
      emoji: ['🎆', '🥳', '🎇'],
      defaultTitle: 'Town Fiesta',
      defaultMessage: 'Fiesta Time!'
    },
    {
      id: 'philippine',
      name: 'Philippine Festival',
      bg: ['#FFF8E7', '#FDE7E7'],
      frame: '#1D8FE1',
      accent: '#E8432D',
      flagColors: ['#1D8FE1', '#E8432D', '#FFC933'],
      emoji: ['🇵🇭', '🎉', '⭐'],
      defaultTitle: 'Philippine Festival',
      defaultMessage: 'Mabuhay!'
    }
  ];

  const DECORATIONS = [
    { id: 'confetti', label: '🎉 Confetti' },
    { id: 'balloons', label: '🎈 Balloons' },
    { id: 'flowers', label: '🌸 Flowers' },
    { id: 'stars', label: '⭐ Stars' },
    { id: 'streamers', label: '🎊 Streamers' },
    { id: 'fireworks', label: '🎆 Fireworks' },
    { id: 'hearts', label: '❤️ Hearts' }
  ];
  const DECORATION_EMOJI = {
    confetti: '🎉', balloons: '🎈', flowers: '🌸', stars: '⭐',
    streamers: '🎊', fireworks: '🎆', hearts: '❤️'
  };

  const FILTERS = [
    { id: 'original', label: 'Original', css: 'none' },
    { id: 'bright', label: 'Bright', css: 'brightness(1.18) saturate(1.15)' },
    { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.3) brightness(1.05)' },
    { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(1.05) saturate(0.85) brightness(0.98)' },
    { id: 'bw', label: 'Black & White', css: 'grayscale(1) contrast(1.1)' },
    { id: 'glow', label: 'Soft Glow', css: 'brightness(1.12) saturate(1.1) blur(0.4px)' }
  ];

  function getTemplate(id) {
    return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
  }
  function getFilter(id) {
    return FILTERS.find((f) => f.id === id) || FILTERS[0];
  }

  /**
   * Draw the finished photo strip onto a canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {string[]} photoDataUrls - 4 dataURLs, already filtered
   * @param {Object} template
   * @param {string[]} decorationIds
   * @param {Object} text - {eventName, guestName, date, message}
   * @returns {Promise<void>}
   */
  function drawPhotoStrip(canvas, photoDataUrls, template, decorationIds, text) {
    const W = 900, PAD = 36, PHOTO_H = 560, GAP = 18;
    const HEADER_H = 150, FOOTER_H = 190;
    const H = HEADER_H + photoDataUrls.length * PHOTO_H + (photoDataUrls.length - 1) * GAP + FOOTER_H + PAD * 2;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, template.bg[0]);
    grad.addColorStop(1, template.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // decorative dashed border
    ctx.save();
    ctx.strokeStyle = template.frame;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = template.accent;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.restore();

    // banderita strip along the top
    drawBanderitas(ctx, W, template.flagColors, 40);

    // header text
    ctx.textAlign = 'center';
    ctx.fillStyle = template.frame;
    ctx.font = '700 44px "Baloo 2", sans-serif';
    ctx.fillText(text.eventName || template.defaultTitle, W / 2, 108);
    ctx.font = '600 20px "Poppins", sans-serif';
    ctx.fillStyle = '#5b4a3a';
    const dateLine = text.date ? text.date : '';
    ctx.fillText(dateLine, W / 2, 138);

    // photos
    let y = HEADER_H + PAD;
    photoDataUrls.forEach((url, i) => {
      // placeholder handled synchronously via preloaded Image cache (see loadImages below)
      const img = template._imgCache[i];
      const x = PAD;
      const w = W - PAD * 2;
      // white photo mat
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x - 8, y - 8, w + 16, PHOTO_H + 16, 14);
      ctx.fill();
      ctx.save();
      roundRect(ctx, x, y, w, PHOTO_H, 10);
      ctx.clip();
      drawCover(ctx, img, x, y, w, PHOTO_H);
      ctx.restore();
      // corner emoji flourish
      const flourish = template.emoji[i % template.emoji.length];
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(flourish, x + 8, y + 40);
      y += PHOTO_H + GAP;
    });

    // footer: guest name + message
    let fy = y + 46;
    ctx.textAlign = 'center';
    ctx.font = '700 30px "Baloo 2", sans-serif';
    ctx.fillStyle = template.frame;
    ctx.fillText(text.message || template.defaultMessage, W / 2, fy);
    if (text.guestName) {
      ctx.font = '500 20px "Poppins", sans-serif';
      ctx.fillStyle = '#5b4a3a';
      ctx.fillText(text.guestName, W / 2, fy + 34);
    }
    ctx.font = '600 16px "Poppins", sans-serif';
    ctx.fillStyle = '#8a7a68';
    ctx.fillText('Fiesta Snap Booth', W / 2, H - 40);

    // scattered decorations chosen by user
    scatterDecorations(ctx, W, H, decorationIds, HEADER_H, y);

    // bottom banderitas mirrored
    drawBanderitas(ctx, W, template.flagColors, H - 30, true);
  }

  function drawCover(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const tr = w / h;
    let sx, sy, sw, sh;
    if (ir > tr) {
      sh = img.height;
      sw = sh * tr;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / tr;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBanderitas(ctx, W, colors, topY, mirrored) {
    const flagW = 40, flagH = 52, gap = 10;
    const count = Math.ceil(W / (flagW + gap));
    ctx.save();
    for (let i = 0; i < count; i++) {
      const cx = i * (flagW + gap) + flagW / 2;
      const color = colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      if (!mirrored) {
        ctx.moveTo(cx - flagW / 2, topY);
        ctx.lineTo(cx + flagW / 2, topY);
        ctx.lineTo(cx, topY + flagH);
      } else {
        ctx.moveTo(cx - flagW / 2, topY + flagH);
        ctx.lineTo(cx + flagW / 2, topY + flagH);
        ctx.lineTo(cx, topY);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function scatterDecorations(ctx, W, H, decorationIds, startY, endY) {
    if (!decorationIds || !decorationIds.length) return;
    const rng = mulberry32(1337); // deterministic scatter
    const spots = 26;
    ctx.textAlign = 'center';
    for (let i = 0; i < spots; i++) {
      const id = decorationIds[i % decorationIds.length];
      const emoji = DECORATION_EMOJI[id];
      if (!emoji) continue;
      const x = 20 + rng() * (W - 40);
      const y = startY - 10 + rng() * (endY - startY + 20);
      // keep clear of the photo center band lightly by biasing toward margins
      const margin = 60;
      const finalX = x < W / 2 ? Math.min(x, margin + rng() * 20) : Math.max(x, W - margin - rng() * 20);
      const size = 20 + rng() * 14;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.font = `${size}px sans-serif`;
      ctx.translate(finalX, y);
      ctx.rotate((rng() - 0.5) * 0.6);
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    }
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadImages(dataUrls) {
    return Promise.all(
      dataUrls.map(
        (url) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          })
      )
    );
  }

  global.FiestaTemplates = {
    TEMPLATES, DECORATIONS, FILTERS, DECORATION_EMOJI,
    getTemplate, getFilter, drawPhotoStrip, loadImages
  };
})(window);
