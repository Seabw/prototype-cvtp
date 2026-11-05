/**
 * Canvas Prize Wheel Overlay for Mini, Mega, Ultra, and Center Wild wheels.
 * Includes absolute safety timers so wheel animations can never hang the game loop.
 */
export class WheelOverlay {
  constructor(overlayElement, canvasElement, titleElement, soundSynth) {
    this.overlay = overlayElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.titleElement = titleElement;
    this.soundSynth = soundSynth;
    this.isSpinning = false;
  }

  spinWheel({ wheelName, slices, targetIndex = 0, onComplete }) {
    if (!slices || slices.length === 0) {
      if (onComplete) onComplete(null);
      return;
    }

    // Clamp targetIndex
    const validTargetIndex = Math.max(0, Math.min(targetIndex, slices.length - 1));

    this.overlay.classList.remove('hidden');
    this.titleElement.innerText = (wheelName || 'PRIZE WHEEL').toUpperCase();
    this.isSpinning = true;

    const sliceCount = slices.length;
    const sliceAngle = (2 * Math.PI) / sliceCount;

    const pointerAngle = -Math.PI / 2;
    const targetSliceCenter = (validTargetIndex + 0.5) * sliceAngle;
    const baseFinalAngle = pointerAngle - targetSliceCenter;

    const fullSpins = 5 * (2 * Math.PI);
    const finalAngle = baseFinalAngle + fullSpins;

    const duration = 3200;
    const startTime = performance.now();
    let currentAngle = 0;
    let lastTickSlice = -1;
    let hasCompleted = false;

    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    const finish = () => {
      if (!hasCompleted) {
        hasCompleted = true;
        this.isSpinning = false;
        this.overlay.classList.add('hidden');
        if (onComplete) onComplete(slices[validTargetIndex]);
      }
    };

    // Absolute fallback timer (never hang)
    const safetyTimer = setTimeout(finish, duration + 2000);

    const renderFrame = currentTime => {
      try {
        if (hasCompleted) return;

        const elapsed = (currentTime || performance.now()) - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / duration));
        const eased = easeOutCubic(progress);

        currentAngle = eased * finalAngle;

        this.drawWheel(slices, currentAngle, validTargetIndex, progress >= 1);

        const normalizedAngle = ((pointerAngle - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const currentSlice = Math.floor(normalizedAngle / sliceAngle);
        if (currentSlice !== lastTickSlice && progress < 0.95) {
          lastTickSlice = currentSlice;
          if (this.soundSynth) this.soundSynth.playWheelTick();
        }

        if (progress < 1) {
          requestAnimationFrame(renderFrame);
        } else {
          if (this.soundSynth) this.soundSynth.playWheelWin();
          const wonLabel = slices[validTargetIndex]?.prizeString || slices[validTargetIndex]?.label || '';
          if (wonLabel) {
            this.titleElement.innerText = `${(wheelName || 'PRIZE WHEEL').toUpperCase()} — ${wonLabel.toUpperCase()}!`;
          }
          setTimeout(() => {
            if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimer);
            finish();
          }, 1400);
        }
      } catch (e) {
        if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimer);
        finish();
      }

    };

    requestAnimationFrame(renderFrame);
  }

  formatSliceLines(rawLabel) {
    const s = (rawLabel || '').trim();
    const lower = s.toLowerCase();

    if (lower.includes('strike')) {
      const m = s.match(/([+-]?\d+(\.\d+)?)/);
      const valStr = m ? `+${parseFloat(m[1]).toFixed(1)}x` : '+1.0x';
      if (lower.includes('mini')) return ['MINI CASH STRIKE', valStr];
      if (lower.includes('mega')) return ['MEGA CASH STRIKE', valStr];
      return ['ULTRA CASH STRIKE', valStr];
    }
    if (lower.includes('vortex')) {
      const m = s.match(/([+-]?\d+(\.\d+)?)/);
      const valStr = m ? `+${parseFloat(m[1]).toFixed(1)}x` : '+1.0x';
      if (lower.includes('mini')) return ['MINI CASH VORTEX', valStr];
      if (lower.includes('mega')) return ['MEGA CASH VORTEX', valStr];
      return ['ULTRA CASH VORTEX', valStr];
    }
    if (lower.includes('multiplier') || lower.startsWith('x')) {
      const m = s.match(/\d+(\.\d+)?/);
      const multStr = m ? `x${m[0]}` : s.toUpperCase();
      return ['MULTIPLIER', multStr];
    }
    if (lower.includes('jackpot')) {
      if (lower.includes('mini')) return ['MINI JACKPOT', '5x BET'];
      if (lower.includes('mega')) return ['MEGA JACKPOT', '50x BET'];
      return ['ULTRA JACKPOT', '500x BET'];
    }
    if (lower.includes('lock') || lower.includes('slingo')) {
      return ['LOCK & SLINGO', 'BONUS'];
    }
    if (!isNaN(parseFloat(s))) {
      return ['INSTANT CASH', `${s}x BET`];
    }
    return [s.toUpperCase(), ''];
  }

  drawWheel(slices, angle, targetIndex, isFinal) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 18;
    const sliceCount = slices.length;
    const sliceAngle = (2 * Math.PI) / sliceCount;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const colors = [
      '#1a1f38', '#0c3547', '#251b3d', '#1d302b',
      '#351b2e', '#1c2e42', '#2c1e38', '#1a3330',
      '#33271b', '#261a33'
    ];

    // Pass 1: Draw all slice backgrounds & borders
    for (let i = 0; i < sliceCount; i++) {
      const sliceStart = i * sliceAngle;
      const sliceEnd = sliceStart + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, sliceStart, sliceEnd);
      ctx.closePath();

      if (isFinal && i === targetIndex) {
        ctx.fillStyle = '#ffd700';
      } else {
        ctx.fillStyle = colors[i % colors.length];
      }
      ctx.fill();

      ctx.strokeStyle = '#e6c875';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Pass 2: Draw 2-line slice labels in the wide outer half of each slice
    const textCenterRadius = radius * 0.61;
    for (let i = 0; i < sliceCount; i++) {
      const sliceStart = i * sliceAngle;
      ctx.save();
      ctx.rotate(sliceStart + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const prize = slices[i] || {};
      const rawLabel = prize.prizeString || prize.label || '';
      const [line1, line2] = this.formatSliceLines(rawLabel);

      const isWon = isFinal && i === targetIndex;
      ctx.shadowColor = isWon ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = isWon ? 2 : 4;

      if (line2) {
        ctx.fillStyle = isWon ? '#0f1026' : '#ffffff';
        ctx.font = `800 ${isWon ? 12.5 : 11.5}px Outfit, sans-serif`;
        ctx.fillText(line1, textCenterRadius, -8);

        ctx.fillStyle = isWon ? '#8b0000' : '#ffeb3b';
        ctx.font = `900 ${isWon ? 15 : 13.5}px "JetBrains Mono", Outfit, sans-serif`;
        ctx.fillText(line2, textCenterRadius, 9);
      } else {
        ctx.fillStyle = isWon ? '#0f1026' : '#ffffff';
        ctx.font = `800 ${isWon ? 14 : 13}px Outfit, sans-serif`;
        ctx.fillText(line1, textCenterRadius, 0);
      }

      ctx.restore();
    }

    // Outer wheel ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffc83b';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 36);
    hubGrad.addColorStop(0, '#ffd700');
    hubGrad.addColorStop(1, '#946c00');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Top Pointer Arrow
    ctx.save();
    ctx.translate(centerX, centerY - radius + 10);
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fillStyle = '#ff2b56';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}
