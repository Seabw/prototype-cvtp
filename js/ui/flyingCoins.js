/**
 * Flying Coins Animator for expired coins flying into the 3 Top Wheel Pots.
 * Includes absolute timeout guarantees so animations can never hang the game loop.
 */
export class FlyingCoins {
  constructor(containerElement, potElements, visualGrid = null) {
    this.container = containerElement;
    this.potElements = potElements; // [pot1Elem, pot2Elem, pot3Elem]
    this.visualGrid = visualGrid;
    this.activeTimers = new Set();
    this.activeFrames = new Set();
  }

  setVisualGrid(visualGrid) {
    this.visualGrid = visualGrid;
  }

  clearAll() {
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers.clear();

    this.activeFrames.forEach(f => cancelAnimationFrame(f));
    this.activeFrames.clear();

    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  animateExpiredCoins(expiredCoins, soundSynth, isTurbo = false) {
    this.clearAll();

    if (!expiredCoins || expiredCoins.length === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      let completedCount = 0;
      let hasResolved = false;
      const total = expiredCoins.length;
      const staggerDelay = isTurbo ? 25 : 50;
      const duration = isTurbo ? 260 : 440;

      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          this.clearAll();
          resolve();
        }
      };

      // Absolute safety timeout: forcibly resolve if animations take longer than expected
      const safetyTimer = setTimeout(finish, total * staggerDelay + duration + 500);
      this.activeTimers.add(safetyTimer);

      expiredCoins.forEach((coin, idx) => {
        const timer = setTimeout(() => {
          this.activeTimers.delete(timer);
          try {
            this.flySingleCoin(coin, soundSynth, duration, () => {
              completedCount++;
              if (completedCount >= total) {
                if (safetyTimer) {
                  clearTimeout(safetyTimer);
                  this.activeTimers.delete(safetyTimer);
                }
                finish();
              }
            });
          } catch (e) {
            completedCount++;
            if (completedCount >= total) {
              if (safetyTimer) {
                clearTimeout(safetyTimer);
                this.activeTimers.delete(safetyTimer);
              }
              finish();
            }
          }
        }, idx * staggerDelay);

        this.activeTimers.add(timer);
      });
    });
  }

  flySingleCoin(coin, soundSynth, duration = 440, onComplete = () => {}) {
    try {
      const originCell = document.getElementById(`cell-${coin.row}-${coin.col}`);
      const targetPot = this.potElements ? this.potElements[coin.potIndex] : null;

      if (!originCell || !targetPot || !this.container) {
        if (this.visualGrid) this.visualGrid.setCellBlank(coin.row, coin.col);
        onComplete();
        return;
      }

      const startRect = originCell.getBoundingClientRect();
      const endRect = targetPot.getBoundingClientRect();

      // Immediately turn origin cell to blank on grid as coin starts flying
      if (this.visualGrid) {
        this.visualGrid.setCellBlank(coin.row, coin.col);
      } else {
        originCell.className = 'grid-cell blank-cell';
        const inner = originCell.querySelector('.cell-content');
        if (inner) inner.innerHTML = '<div class="empty-marker">·</div>';
      }

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;

      const endX = endRect.left + endRect.width / 2;
      const endY = endRect.top + endRect.height / 2;

      const particle = document.createElement('div');
      particle.className = `flying-coin-particle pot-${coin.potIndex}`;
      
      const symbolText = coin.jackpotType ? coin.jackpotType.slice(0, 3).toUpperCase() : '$';
      particle.innerHTML = `<span class="particle-spark">${symbolText}</span>`;

      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;

      this.container.appendChild(particle);

      if (soundSynth) {
        soundSynth.playFlightToPot();
      }

      const startTime = performance.now();
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 50;
      const midY = Math.min(startY, endY) - 80 - Math.random() * 25;

      let frameId = null;

      const animate = currentTime => {
        try {
          const elapsed = (currentTime || performance.now()) - startTime;
          const t = Math.min(1, Math.max(0, elapsed / duration));

          const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
          const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
          const scale = 1.1 - t * 0.45;
          const rotate = t * 720;

          particle.style.transform = `translate(-50%, -50%) translate(${x - startX}px, ${y - startY}px) scale(${scale}) rotate(${rotate}deg)`;

          if (t < 1) {
            frameId = requestAnimationFrame(animate);
            this.activeFrames.add(frameId);
          } else {
            if (frameId) this.activeFrames.delete(frameId);
            particle.remove();

            if (targetPot) {
              targetPot.classList.add('pot-pulse-hit');
              if (soundSynth) soundSynth.playPotDing();
              const potTimer = setTimeout(() => {
                targetPot.classList.remove('pot-pulse-hit');
                this.activeTimers.delete(potTimer);
              }, 250);
              this.activeTimers.add(potTimer);
            }

            onComplete();
          }
        } catch (e) {
          if (frameId) this.activeFrames.delete(frameId);
          particle.remove();
          onComplete();
        }
      };

      frameId = requestAnimationFrame(animate);
      this.activeFrames.add(frameId);
    } catch (e) {
      onComplete();
    }
  }
}
