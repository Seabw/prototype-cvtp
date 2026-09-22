import { SymbolType, SLINGO_LINES } from '../math/config.js';

export class VisualGrid {
  constructor(gridElement, svgLinesElement) {
    this.gridElement = gridElement;
    this.svgLinesElement = svgLinesElement;
    this.cellElements = [];
    this.createDomGrid();
  }

  createDomGrid() {
    this.gridElement.innerHTML = '';
    this.cellElements = [];

    for (let r = 0; r < 5; r++) {
      this.cellElements[r] = [];
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `cell-${r}-${c}`;

        const inner = document.createElement('div');
        inner.className = 'cell-content';
        cell.appendChild(inner);

        this.gridElement.appendChild(cell);
        this.cellElements[r][c] = cell;
      }
    }
  }

  setCellBlank(r, c) {
    const cellElem = this.cellElements[r]?.[c];
    if (!cellElem) return;
    cellElem.className = 'grid-cell blank-cell';
    const inner = cellElem.querySelector('.cell-content');
    if (inner) {
      inner.innerHTML = '<div class="empty-marker">·</div>';
    }
  }

  render(grid, options = {}) {
    if (!grid) return;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellData = grid[r]?.[c];
        const cellElem = this.cellElements[r]?.[c];
        if (!cellElem) continue;
        const inner = cellElem.querySelector('.cell-content');
        if (!inner) continue;

        // Reset base classes
        cellElem.className = 'grid-cell';

        // 1. Central Wild Star
        if (r === 2 && c === 2 && (!cellData || cellData.type === SymbolType.CentralWildStar)) {
          cellElem.classList.add('center-star-cell');
          inner.innerHTML = `
            <div class="symbol-icon star-icon">★</div>
            <div class="symbol-label center-label">CENTRAL WILD</div>
            <div class="symbol-sub">PERMANENT</div>
          `;
          continue;
        }

        // 2. Blank Cell
        if (!cellData || cellData.type === SymbolType.Blank) {
          cellElem.classList.add('blank-cell');
          inner.innerHTML = `<div class="empty-marker">·</div>`;
          continue;
        }

        // 3. Active valuable coin / modifier
        const isExpiringToPot = Boolean(!cellData.wonThisSpin && cellData.lifeRemaining <= 1);
        if (isExpiringToPot) {
          cellElem.classList.add('about-to-expire', 'expiring-last-life');
        }

        if (cellData.wonThisSpin) {
          cellElem.classList.add('won-spin');
        }

        let typeClass = 'symbol-cash-coin';
        let iconHtml = '';
        let labelHtml = '';
        let badgeHtml = '';
        let expiryTagHtml = '';

        if (cellData.wonThisSpin) {
          expiryTagHtml = `<div class="expiry-pill won-pill">WINNER</div>`;
        } else if (cellData.lifeRemaining === 1) {
          expiryTagHtml = `<div class="expiry-pill last-life-pill">1 LIFE ➔ POT</div>`;
        }

        // Life badge
        if (cellData.lifeRemaining > 0 && cellData.lifeRemaining <= 3) {
          const dots = Array.from({ length: 3 }, (_, i) => {
            let dotClass = 'spent';
            if (i < cellData.lifeRemaining) {
              dotClass = (cellData.lifeRemaining === 1) ? 'active last-life' : 'active';
            }
            return `<span class="life-dot ${dotClass}"></span>`;
          }).join('');
          badgeHtml = `<div class="life-badge ${cellData.lifeRemaining === 1 ? 'last-life-badge' : ''}" title="${cellData.lifeRemaining} spin life remaining">${dots}</div>`;
        }

        const val = typeof cellData.cashValue === 'number' && !isNaN(cellData.cashValue) ? cellData.cashValue : 0.4;

        switch (cellData.type) {
          case SymbolType.CashCoin:
            typeClass = 'symbol-cash-coin';
            iconHtml = `<div class="coin-disc"><span class="coin-symbol">$</span></div>`;
            labelHtml = `<div class="coin-value">${val.toFixed(1)}x</div>`;
            break;

          case SymbolType.JackpotCoin:
            typeClass = `symbol-jackpot-coin jp-${(cellData.jackpotType || 'mini').toLowerCase()}`;
            iconHtml = `<div class="jp-badge">${(cellData.jackpotType || 'MINI').toUpperCase()}</div>`;
            labelHtml = `<div class="coin-value">${val.toFixed(0)}x</div>`;
            badgeHtml += `<div class="isolation-shield" title="Jackpot Isolation: Immune to modifiers">🛡️</div>`;
            break;

          case SymbolType.MiniStrike:
          case SymbolType.MegaStrike:
          case SymbolType.UltraStrike: {
            const tier = cellData.type === SymbolType.MiniStrike ? 'mini' : cellData.type === SymbolType.MegaStrike ? 'mega' : 'ultra';
            typeClass = `symbol-strike strike-${tier}`;
            iconHtml = `<div class="strike-bolt">⚡</div>`;
            labelHtml = `
              <div class="strike-title">${tier.toUpperCase()} STRIKE</div>
              <div class="coin-value">+${val.toFixed(1)}x</div>
            `;
            break;
          }

          case SymbolType.MiniVortex:
          case SymbolType.MegaVortex:
          case SymbolType.UltraVortex: {
            const tier = cellData.type === SymbolType.MiniVortex ? 'mini' : cellData.type === SymbolType.MegaVortex ? 'mega' : 'ultra';
            typeClass = `symbol-vortex vortex-${tier}`;
            iconHtml = `<div class="vortex-core">🌀</div>`;
            labelHtml = `
              <div class="vortex-title">${tier.toUpperCase()} VORTEX</div>
              <div class="coin-value">${val.toFixed(1)}x</div>
            `;
            break;
          }

          default:
            typeClass = 'symbol-cash-coin';
            iconHtml = `<div class="coin-disc"><span class="coin-symbol">$</span></div>`;
            labelHtml = `<div class="coin-value">${val.toFixed(1)}x</div>`;
        }

        typeClass.split(' ').filter(Boolean).forEach(cls => cellElem.classList.add(cls));
        if (cellData.justLanded) cellElem.classList.add('landed-pop');

        inner.innerHTML = `
          ${badgeHtml}
          ${iconHtml}
          ${labelHtml}
          ${expiryTagHtml}
        `;
      }
    }
  }

  highlightCell(r, c, cssClass, duration = 800) {
    const elem = this.cellElements[r][c];
    if (!elem) return;
    elem.classList.add(cssClass);
    setTimeout(() => {
      elem.classList.remove(cssClass);
    }, duration);
  }

  showStrikeBeam(fromR, fromC, targets) {
    const fromElem = this.cellElements[fromR]?.[fromC];
    if (!fromElem) return;
    fromElem.classList.add('strike-firing');

    targets.forEach(t => {
      const targetElem = this.cellElements[t.row]?.[t.col];
      if (targetElem) {
        targetElem.classList.add('strike-hit');
        setTimeout(() => {
          targetElem.classList.remove('strike-hit');
        }, 700);
      }
    });

    setTimeout(() => {
      fromElem.classList.remove('strike-firing');
    }, 700);
  }

  showVortexSuction(fromR, fromC, sources) {
    const vortexElem = this.cellElements[fromR]?.[fromC];
    if (!vortexElem) return;
    vortexElem.classList.add('vortex-sucking');

    sources.forEach(s => {
      const sourceElem = this.cellElements[s.row]?.[s.col];
      if (sourceElem) {
        sourceElem.classList.add('vortex-absorbed');
        setTimeout(() => {
          sourceElem.classList.remove('vortex-absorbed');
        }, 700);
      }
    });

    setTimeout(() => {
      vortexElem.classList.remove('vortex-sucking');
    }, 700);
  }

  async animateStrikeFlyAndCountUp(strikeAction, containerElement, soundSynth, speedMult = 1.0) {
    if (!strikeAction || !strikeAction.strikeCell) return;
    const { strikeCell, affectedCells } = strikeAction;
    const fromElem = this.cellElements[strikeCell.row]?.[strikeCell.col];
    if (!fromElem) return;

    fromElem.classList.add('strike-firing');

    if (!affectedCells || affectedCells.length === 0) {
      if (soundSynth) soundSynth.playStrikeZap();
      await new Promise(r => setTimeout(r, 450 * speedMult));
      fromElem.classList.remove('strike-firing');
      return;
    }

    if (soundSynth) soundSynth.playStrikeZap();

    const startRect = fromElem.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

    const tier = strikeCell.type === SymbolType.MiniStrike
      ? 'mini'
      : strikeCell.type === SymbolType.MegaStrike
      ? 'mega'
      : 'ultra';

    const flightDuration = Math.max(220, 600 * speedMult);
    const countUpDuration = Math.max(200, 450 * speedMult);
    const staggerDelay = Math.max(40, 90 * speedMult);

    const promises = affectedCells.map((target, idx) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const targetElem = this.cellElements[target.row]?.[target.col];
          if (!targetElem || !containerElement) {
            resolve();
            return;
          }

          const endRect = targetElem.getBoundingClientRect();
          const endX = endRect.left + endRect.width / 2;
          const endY = endRect.top + endRect.height / 2;

          const particle = document.createElement('div');
          particle.className = `flying-strike-particle strike-${tier}`;
          particle.innerHTML = `
            <span class="strike-spark-bolt">⚡</span>
            <span class="strike-val-tag">+${strikeCell.value.toFixed(1)}x</span>
          `;
          particle.style.position = 'fixed';
          particle.style.left = '0px';
          particle.style.top = '0px';
          particle.style.transform = `translate3d(${startX}px, ${startY}px, 0) translate(-50%, -50%) scale(0.9)`;
          containerElement.appendChild(particle);

          const startTime = performance.now();
          const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 40;
          const midY = (startY + endY) / 2 - 50;

          const animate = currentTime => {
            try {
              const elapsed = (currentTime || performance.now()) - startTime;
              const t = Math.min(1, Math.max(0, elapsed / flightDuration));

              const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
              const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
              const scale = 0.9 + Math.sin(t * Math.PI) * 0.45;

              particle.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;

              if (t < 1) {
                requestAnimationFrame(animate);
              } else {
                particle.remove();

                // Target impact zap & pop
                targetElem.classList.add('strike-hit', 'val-countup-pop');
                if (soundSynth) {
                  soundSynth.playCoinLand();
                }

                // Smooth numeric count-up with ticker sound
                const valElem = targetElem.querySelector('.coin-value');
                if (valElem) {
                  const startVal = target.prevVal;
                  const endVal = target.newVal;
                  const countStartTime = performance.now();
                  let lastTickTime = 0;

                  const countStep = nowTime => {
                    const countElapsed = (nowTime || performance.now()) - countStartTime;
                    const progress = Math.min(1, Math.max(0, countElapsed / countUpDuration));
                    const currentVal = startVal + (endVal - startVal) * progress;
                    valElem.innerText = `${currentVal.toFixed(1)}x`;

                    if (nowTime - lastTickTime > 70 && soundSynth) {
                      soundSynth.playCountUpTick();
                      lastTickTime = nowTime;
                    }

                    if (progress < 1) {
                      requestAnimationFrame(countStep);
                    } else {
                      valElem.innerText = `${endVal.toFixed(1)}x`;
                      setTimeout(() => {
                        targetElem.classList.remove('strike-hit', 'val-countup-pop');
                        resolve();
                      }, 160 * speedMult);
                    }
                  };
                  requestAnimationFrame(countStep);
                } else {
                  setTimeout(() => {
                    targetElem.classList.remove('strike-hit', 'val-countup-pop');
                    resolve();
                  }, 160 * speedMult);
                }
              }
            } catch (e) {
              particle.remove();
              resolve();
            }
          };

          requestAnimationFrame(animate);
        }, idx * staggerDelay);
      });
    });

    // Safety timeout in case of any animation frame edge case
    const safetyPromise = new Promise(resolve => setTimeout(resolve, flightDuration + affectedCells.length * staggerDelay + countUpDuration + 600));
    await Promise.race([Promise.all(promises), safetyPromise]);

    fromElem.classList.remove('strike-firing');
  }

  async animateVortexSuctionAndCountUp(vortexAction, containerElement, soundSynth, speedMult = 1.0) {
    if (!vortexAction || !vortexAction.vortexCell) return;
    const { vortexCell, collectedCells, finalValue } = vortexAction;
    const vortexElem = this.cellElements[vortexCell.row]?.[vortexCell.col];
    if (!vortexElem) return;

    vortexElem.classList.add('vortex-sucking');

    // Ensure vortex cell is initially showing its basePay
    const vortexValElem = vortexElem.querySelector('.coin-value');
    if (vortexValElem) {
      vortexValElem.innerText = `${vortexCell.basePay.toFixed(1)}x`;
    }

    if (!collectedCells || collectedCells.length === 0) {
      if (soundSynth) soundSynth.playVortexWhoosh();
      await new Promise(r => setTimeout(r, 450 * speedMult));
      vortexElem.classList.remove('vortex-sucking');
      return;
    }

    if (soundSynth) soundSynth.playVortexWhoosh();

    const destRect = vortexElem.getBoundingClientRect();
    const endX = destRect.left + destRect.width / 2;
    const endY = destRect.top + destRect.height / 2;

    const tier = vortexCell.type === SymbolType.MiniVortex
      ? 'mini'
      : vortexCell.type === SymbolType.MegaVortex
      ? 'mega'
      : 'ultra';

    const flightDuration = Math.max(240, 650 * speedMult);
    const countUpDuration = Math.max(220, 550 * speedMult);
    const staggerDelay = Math.max(45, 110 * speedMult);

    // Source coins pulse with absorption glow while staying fully intact on board
    collectedCells.forEach(source => {
      const sourceElem = this.cellElements[source.row]?.[source.col];
      if (sourceElem) {
        sourceElem.classList.add('vortex-absorbed');
      }
    });

    // Launch flying cash particles from each collected cell into vortex center
    const flightPromises = collectedCells.map((source, idx) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const sourceElem = this.cellElements[source.row]?.[source.col];
          if (!sourceElem || !containerElement) {
            resolve();
            return;
          }

          const startRect = sourceElem.getBoundingClientRect();
          const startX = startRect.left + startRect.width / 2;
          const startY = startRect.top + startRect.height / 2;

          const particle = document.createElement('div');
          particle.className = `flying-vortex-particle vortex-${tier}`;
          particle.innerHTML = `
            <span class="vortex-spark-swirl">🌀</span>
            <span class="vortex-val-tag">${source.val.toFixed(1)}x</span>
          `;
          particle.style.position = 'fixed';
          particle.style.left = '0px';
          particle.style.top = '0px';
          particle.style.transform = `translate3d(${startX}px, ${startY}px, 0) translate(-50%, -50%) scale(1.0)`;
          containerElement.appendChild(particle);

          const startTime = performance.now();
          const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 50;
          const midY = (startY + endY) / 2 - 40;

          const animate = currentTime => {
            try {
              const elapsed = (currentTime || performance.now()) - startTime;
              const t = Math.min(1, Math.max(0, elapsed / flightDuration));

              const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
              const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
              const scale = 1.15 - t * 0.35;
              const rotate = t * 720;

              particle.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;

              if (t < 1) {
                requestAnimationFrame(animate);
              } else {
                particle.remove();
                if (soundSynth) soundSynth.playPotDing();
                vortexElem.classList.add('vortex-pulse-hit');
                setTimeout(() => vortexElem.classList.remove('vortex-pulse-hit'), 200);
                resolve();
              }
            } catch (e) {
              particle.remove();
              resolve();
            }
          };

          requestAnimationFrame(animate);
        }, idx * staggerDelay);
      });
    });

    const flightSafety = new Promise(resolve => setTimeout(resolve, flightDuration + collectedCells.length * staggerDelay + 500));
    await Promise.race([Promise.all(flightPromises), flightSafety]);

    // Clean up source cell highlights (coins remain on grid!)
    collectedCells.forEach(source => {
      const sourceElem = this.cellElements[source.row]?.[source.col];
      if (sourceElem) {
        sourceElem.classList.remove('vortex-absorbed');
      }
    });

    // Vortex absorption impact and count-up
    vortexElem.classList.add('vortex-pulse-hit', 'val-countup-pop');

    if (vortexValElem) {
      const startVal = vortexCell.basePay;
      const endVal = finalValue;
      const countStartTime = performance.now();
      let lastTickTime = 0;

      await new Promise(resolve => {
        const countStep = nowTime => {
          const countElapsed = (nowTime || performance.now()) - countStartTime;
          const progress = Math.min(1, Math.max(0, countElapsed / countUpDuration));
          const currentVal = startVal + (endVal - startVal) * progress;
          vortexValElem.innerText = `${currentVal.toFixed(1)}x`;

          if (nowTime - lastTickTime > 65 && soundSynth) {
            soundSynth.playCountUpTick();
            lastTickTime = nowTime;
          }

          if (progress < 1) {
            requestAnimationFrame(countStep);
          } else {
            vortexValElem.innerText = `${endVal.toFixed(1)}x`;
            resolve();
          }
        };
        requestAnimationFrame(countStep);
      });
    }

    await new Promise(r => setTimeout(r, 220 * speedMult));
    vortexElem.classList.remove('vortex-sucking', 'vortex-pulse-hit', 'val-countup-pop');
  }

  showLifeReset(resets) {
    resets.forEach(r => {
      const elem = this.cellElements[r.row]?.[r.col];
      if (elem) {
        elem.classList.add('life-reset-glow');
        setTimeout(() => {
          elem.classList.remove('life-reset-glow');
        }, 800);
      }
    });
  }

  drawWinningLines(winningLines) {
    if (!this.svgLinesElement) return;
    this.svgLinesElement.innerHTML = '';

    if (!winningLines || winningLines.length === 0) return;

    const gridRect = this.gridElement.getBoundingClientRect();
    this.svgLinesElement.setAttribute('viewBox', `0 0 ${gridRect.width} ${gridRect.height}`);

    winningLines.forEach((winLine, idx) => {
      const firstIdx = winLine.indices[0];
      const lastIdx = winLine.indices[winLine.indices.length - 1];

      const r1 = Math.floor(firstIdx / 5);
      const c1 = firstIdx % 5;
      const r2 = Math.floor(lastIdx / 5);
      const c2 = lastIdx % 5;

      const cell1 = this.cellElements[r1][c1].getBoundingClientRect();
      const cell2 = this.cellElements[r2][c2].getBoundingClientRect();

      const x1 = cell1.left + cell1.width / 2 - gridRect.left;
      const y1 = cell1.top + cell1.height / 2 - gridRect.top;
      const x2 = cell2.left + cell2.width / 2 - gridRect.left;
      const y2 = cell2.top + cell2.height / 2 - gridRect.top;

      const lineElem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineElem.setAttribute('x1', x1);
      lineElem.setAttribute('y1', y1);
      lineElem.setAttribute('x2', x2);
      lineElem.setAttribute('y2', y2);
      lineElem.setAttribute('class', 'winning-slingo-line');
      lineElem.style.animationDelay = `${idx * 0.1}s`;

      this.svgLinesElement.appendChild(lineElem);

      // Highlight winning cells
      winLine.indices.forEach(i => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        this.cellElements[r][c].classList.add('line-win-cell');
      });
    });
  }

  clearWinningLines() {
    if (this.svgLinesElement) this.svgLinesElement.innerHTML = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        this.cellElements[r][c].classList.remove('line-win-cell');
      }
    }
  }

  clearWonCoins() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) continue;
        const elem = this.cellElements[r]?.[c];
        if (elem && elem.classList.contains('won-spin')) {
          this.setCellBlank(r, c);
        }
      }
    }
  }
}
