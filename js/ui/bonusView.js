import { SymbolType, SLINGO_LINES } from '../math/config.js';

export class BonusView {
  constructor(overlayElement, soundSynth) {
    this.overlay = overlayElement;
    this.soundSynth = soundSynth;
    this.gridElement = overlayElement.querySelector('.bonus-grid');
    this.ladderElement = overlayElement.querySelector('.slingo-ladder');
    this.livesElement = overlayElement.querySelector('.bonus-lives');
    this.winDisplay = overlayElement.querySelector('.bonus-win-amount');
    this.linesCountDisplay = overlayElement.querySelector('.bonus-lines-count');
    this.statusText = overlayElement.querySelector('.bonus-status-text');
    this.exitBtn = overlayElement.querySelector('.bonus-exit-btn');

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
        cell.className = 'bonus-cell blank-cell';
        cell.id = `bonus-cell-${r}-${c}`;
        cell.innerHTML = `<div class="bonus-cell-content">·</div>`;
        this.gridElement.appendChild(cell);
        this.cellElements[r][c] = cell;
      }
    }
  }

  renderLadder(activeSlingos = 0) {
    const ladderRanks = [
      { lines: 12, label: 'FULL HOUSE: ULTRA JACKPOT (500x)', prize: '500x', type: 'jackpot' },
      { lines: 11, label: '11 Lines: (Skipped - Geometry Rule)', prize: '-', type: 'skip' },
      { lines: 10, label: '10 Lines: Ultra Strike 5 (+5.0x All)', prize: '+5x', type: 'strike' },
      { lines: 9, label: '9 Lines: Mega Jackpot (50x)', prize: '50x', type: 'jackpot' },
      { lines: 8, label: '8 Lines: Multiplier x3', prize: 'x3', type: 'multiplier' },
      { lines: 7, label: '7 Lines: Ultra Vortex (Board Gather)', prize: '5.0x+', type: 'vortex' },
      { lines: 6, label: '6 Lines: Multiplier x2', prize: 'x2', type: 'multiplier' },
      { lines: 5, label: '5 Lines: Mega Strike 2 (+2.0x Line)', prize: '+2x', type: 'strike' },
      { lines: 4, label: '4 Lines: Mega Vortex (Line Gather)', prize: '2.0x+', type: 'vortex' },
      { lines: 3, label: '3 Lines: Mini Jackpot (5x)', prize: '5x', type: 'jackpot' },
      { lines: 2, label: '2 Lines: Mini Vortex (Ortho Gather)', prize: '1.0x+', type: 'vortex' },
      { lines: 1, label: '1 Line: Mini Strike 1 (+1.0x Ortho)', prize: '+1x', type: 'strike' }
    ];

    this.ladderElement.innerHTML = ladderRanks
      .map(r => {
        const isActive = activeSlingos >= r.lines && r.lines > 0 && r.lines !== 11;
        const isCurrent = activeSlingos === r.lines;
        const cls = [
          'ladder-step',
          r.type,
          isActive ? 'achieved' : '',
          isCurrent ? 'current-step' : ''
        ].join(' ');

        return `
          <div class="${cls}">
            <span class="step-lines">${r.lines}</span>
            <span class="step-label">${r.label}</span>
          </div>
        `;
      })
      .join('');
  }

  renderLives(lives) {
    let hearts = '';
    for (let i = 1; i <= 3; i++) {
      hearts += `<span class="life-heart ${i <= lives ? 'alive' : 'lost'}">♥</span>`;
    }
    this.livesElement.innerHTML = hearts;
  }

  playBonusSequence(bonusResult, onFinish) {
    this.overlay.classList.remove('hidden');
    this.exitBtn.classList.add('hidden');
    this.createDomGrid();
    this.renderLadder(0);
    this.renderLives(3);
    this.winDisplay.innerText = '$0.00';
    this.linesCountDisplay.innerText = '0 / 12';
    this.statusText.innerText = 'LOCK & SLINGO™ STARTED! 3 RESPINS REMAINING';

    const records = bonusResult.spinRecords;
    let stepIndex = 0;

    const playNextStep = () => {
      if (stepIndex >= records.length) {
        this.finishBonus(bonusResult, onFinish);
        return;
      }

      const step = records[stepIndex];
      this.statusText.innerText = `RESPIN #${step.spinIndex}...`;
      this.renderLives(step.livesBefore);

      setTimeout(() => {
        if (step.lands) {
          this.renderLives(3);
          this.statusText.innerText = `LANDED ${step.landedItems.length} SYMBOL(S)! RESPINS RESET TO 3`;
          if (this.soundSynth) this.soundSynth.playCoinLand();

          // Render landed items
          step.landedItems.forEach(item => {
            const cellElem = this.cellElements[item.row][item.col];
            cellElem.className = 'bonus-cell landed-pop';

            if (item.type === SymbolType.JackpotCoin) {
              cellElem.classList.add(`symbol-jackpot-coin jp-${(item.jackpotType || 'mini').toLowerCase()}`);
              cellElem.innerHTML = `
                <div class="bonus-cell-content">
                  <div class="jp-badge">${item.jackpotType?.toUpperCase()}</div>
                  <div class="coin-value">${item.cashValue.toFixed(0)}x</div>
                </div>
              `;
            } else if (item.type === SymbolType.MiniStrike || item.type === SymbolType.MegaStrike || item.type === SymbolType.UltraStrike) {
              const tier = item.type === SymbolType.MiniStrike ? 'mini' : item.type === SymbolType.MegaStrike ? 'mega' : 'ultra';
              cellElem.classList.add(`symbol-strike strike-${tier}`);
              cellElem.innerHTML = `
                <div class="bonus-cell-content">
                  <div class="strike-bolt">⚡</div>
                  <div class="coin-value">+${item.cashValue.toFixed(1)}x</div>
                </div>
              `;
            } else if (item.type === SymbolType.MiniVortex) {
              cellElem.classList.add('symbol-vortex vortex-mini');
              cellElem.innerHTML = `
                <div class="bonus-cell-content">
                  <div class="vortex-core">🌀</div>
                  <div class="coin-value">${item.cashValue.toFixed(1)}x</div>
                </div>
              `;
            } else {
              cellElem.classList.add('symbol-cash-coin');
              cellElem.innerHTML = `
                <div class="bonus-cell-content">
                  <div class="coin-disc">$</div>
                  <div class="coin-value">${item.cashValue.toFixed(1)}x</div>
                </div>
              `;
            }
          });

          // Update grid values after strike / vortex
          this.syncGridValues(step.gridSnapshot);

          // Count active slingos
          const slingos = this.countSlingos(step.gridSnapshot);
          this.linesCountDisplay.innerText = `${slingos} / 12`;
          this.renderLadder(slingos);

          // Update running total
          let currentBoardSum = 0;
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              if (step.gridSnapshot[r][c].type !== SymbolType.Blank) {
                currentBoardSum += step.gridSnapshot[r][c].cashValue;
              }
            }
          }
          this.winDisplay.innerText = `$${currentBoardSum.toFixed(2)}`;
        } else {
          this.renderLives(step.livesAfter);
          this.statusText.innerText = `NO LANDING. ${step.livesAfter} RESPIN(S) LEFT`;
        }

        stepIndex++;
        setTimeout(playNextStep, step.lands ? 900 : 500);
      }, 400);
    };

    setTimeout(playNextStep, 800);
  }

  syncGridValues(gridSnapshot) {
    if (!gridSnapshot) return;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellData = gridSnapshot[r][c];
        if (cellData.type !== SymbolType.Blank) {
          const valElem = this.cellElements[r][c].querySelector('.coin-value');
          if (valElem) {
            valElem.innerText = `${cellData.cashValue.toFixed(1)}x`;
          }
        }
      }
    }
  }

  countSlingos(grid) {
    let count = 0;
    for (const line of SLINGO_LINES) {
      let complete = true;
      for (const idx of line) {
        const r = Math.floor(idx / 5);
        const c = idx % 5;
        if (grid[r][c].type === SymbolType.Blank) {
          complete = false;
          break;
        }
      }
      if (complete) count++;
    }
    return count;
  }

  finishBonus(bonusResult, onFinish) {
    this.renderLadder(bonusResult.completedSlingos);
    this.linesCountDisplay.innerText = `${bonusResult.completedSlingos} / 12`;
    this.syncGridValues(bonusResult.finalGrid);

    let ladderMsg = 'NO LADDER PRIZE';
    if (bonusResult.ladderPrize) {
      ladderMsg = `AWARDED LADDER PRIZE: ${bonusResult.ladderPrize.prizeString}!`;
    }

    if (bonusResult.isFullHouse) {
      this.statusText.innerText = `★ FULL HOUSE! 500x ULTRA JACKPOT + BOARD CASH! ★`;
      if (this.soundSynth) this.soundSynth.playJackpotFanfare();
    } else {
      this.statusText.innerText = `BONUS COMPLETE! ${bonusResult.completedSlingos} SLINGOS ACHIEVED. ${ladderMsg}`;
      if (this.soundSynth) this.soundSynth.playLineWin();
    }

    const finalWinDollars = (bonusResult.totalBonusWinCents / 100).toFixed(2);
    this.winDisplay.innerText = `$${finalWinDollars}`;

    this.exitBtn.classList.remove('hidden');
    this.exitBtn.onclick = () => {
      this.overlay.classList.add('hidden');
      if (onFinish) onFinish(bonusResult);
    };
  }
}
