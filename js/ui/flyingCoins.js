/**
 * Flying Coins Animator for expired coins flying into the 3 Top Wheel Pots.
 * Includes absolute timeout guarantees so animations can never hang the game loop.
 */
export class FlyingCoins {
  constructor(containerElement, potElements) {
    this.container = containerElement;
    this.potElements = potElements; // [pot1Elem, pot2Elem, pot3Elem]
  }

  animateExpiredCoins(expiredCoins, soundSynth) {
    if (!expiredCoins || expiredCoins.length === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      let completedCount = 0;
      let hasResolved = false;
      const total = expiredCoins.length;

      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          // Clear any leftover particles
          if (this.container) {
            this.container.innerHTML = '';
          }
          resolve();
        }
      };

      // Absolute safety timeout: forcibly resolve if animations take longer than expected
      const safetyTimeout = setTimeout(finish, total * 80 + 1200);

      expiredCoins.forEach((coin, idx) => {
        setTimeout(() => {
          try {
            this.flySingleCoin(coin, soundSynth, () => {
              completedCount++;
              if (completedCount >= total) {
                if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimeout);
                finish();
              }
            });
          } catch (e) {
            completedCount++;
            if (completedCount >= total) {
              if (typeof clearTimeout !== 'undefined') clearTimeout(safetyTimeout);
              finish();
            }
          }

        }, idx * 60);
      });
    });
  }

  flySingleCoin(coin, soundSynth, onComplete) {
    try {
      const originCell = document.getElementById(`cell-${coin.row}-${coin.col}`);
      const targetPot = this.potElements ? this.potElements[coin.potIndex] : null;

      if (!originCell || !targetPot || !this.container) {
        onComplete();
        return;
      }

      const startRect = originCell.getBoundingClientRect();
      const endRect = targetPot.getBoundingClientRect();

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;

      const endX = endRect.left + endRect.width / 2;
      const endY = endRect.top + endRect.height / 2;

      const particle = document.createElement('div');
      particle.className = `flying-coin-particle pot-${coin.potIndex}`;
      particle.innerHTML = `<span class="particle-spark">$</span>`;

      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;

      this.container.appendChild(particle);

      if (soundSynth) {
        soundSynth.playFlightToPot();
      }

      const duration = 500;
      const startTime = performance.now();

      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 60;
      const midY = Math.min(startY, endY) - 90 - Math.random() * 30;

      let frameId = null;

      const animate = currentTime => {
        try {
          const elapsed = (currentTime || performance.now()) - startTime;
          const t = Math.min(1, Math.max(0, elapsed / duration));

          const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
          const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
          const scale = 1 - t * 0.35;
          const rotate = t * 720;

          particle.style.transform = `translate(${x - startX}px, ${y - startY}px) scale(${scale}) rotate(${rotate}deg)`;

          if (t < 1) {
            frameId = requestAnimationFrame(animate);
          } else {
            particle.remove();

            if (targetPot) {
              targetPot.classList.add('pot-pulse-hit');
              if (soundSynth) soundSynth.playPotDing();
              setTimeout(() => {
                targetPot.classList.remove('pot-pulse-hit');
              }, 300);
            }

            onComplete();
          }
        } catch (e) {
          particle.remove();
          onComplete();
        }
      };

      frameId = requestAnimationFrame(animate);
    } catch (e) {
      onComplete();
    }
  }
}
