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
          setTimeout(() => {
            if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimer);
            finish();
          }, 1200);
        }
      } catch (e) {
        if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimer);
        finish();
      }

    };

    requestAnimationFrame(renderFrame);
  }

  drawWheel(slices, angle, targetIndex, isFinal) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 20;
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

      ctx.save();
      ctx.rotate(sliceStart + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const prize = slices[i] || {};
      let label = prize.prizeString || prize.label || '';

      if (isFinal && i === targetIndex) {
        ctx.fillStyle = '#0f1026';
        ctx.font = 'bold 22px Outfit, sans-serif';
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Outfit, sans-serif';
      }

      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(label, radius - 24, 0);
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
