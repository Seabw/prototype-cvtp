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

  render(grid, options = {}) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellData = grid[r][c];
        const cellElem = this.cellElements[r][c];
        const inner = cellElem.querySelector('.cell-content');

        // Reset base classes
        cellElem.className = 'grid-cell';

        if (cellData.wonThisSpin) {
          cellElem.classList.add('won-spin');
        }

        if (r === 2 && c === 2 && cellData.type === SymbolType.CentralWildStar) {
          cellElem.classList.add('center-star-cell');
          inner.innerHTML = `
            <div class="symbol-icon star-icon">★</div>
            <div class="symbol-label center-label">CENTRAL WILD</div>
            <div class="symbol-sub">PERMANENT</div>
          `;
          continue;
        }

        if (cellData.type === SymbolType.Blank) {
          cellElem.classList.add('blank-cell');
          inner.innerHTML = `<div class="empty-marker">·</div>`;
          continue;
        }

        // Active valuable symbol
        let typeClass = '';
        let iconHtml = '';
        let labelHtml = '';
        let badgeHtml = '';

        // Life badge
        if (cellData.lifeRemaining > 0 && cellData.lifeRemaining <= 3) {
          const dots = Array.from({ length: 3 }, (_, i) => {
            const active = i < cellData.lifeRemaining ? 'active' : 'spent';
            return `<span class="life-dot ${active}"></span>`;
          }).join('');
          badgeHtml = `<div class="life-badge" title="${cellData.lifeRemaining} spin life remaining">${dots}</div>`;
        }

        switch (cellData.type) {
          case SymbolType.CashCoin:
            typeClass = 'symbol-cash-coin';
            iconHtml = `<div class="coin-disc"><span class="coin-symbol">$</span></div>`;
            labelHtml = `<div class="coin-value">${cellData.cashValue.toFixed(1)}x</div>`;
            break;

          case SymbolType.JackpotCoin:
            typeClass = `symbol-jackpot-coin jp-${(cellData.jackpotType || 'mini').toLowerCase()}`;
            iconHtml = `<div class="jp-badge">${cellData.jackpotType?.toUpperCase()}</div>`;
            labelHtml = `<div class="coin-value">${cellData.cashValue.toFixed(0)}x</div>`;
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
              <div class="coin-value">+${cellData.cashValue.toFixed(1)}x</div>
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
              <div class="coin-value">${cellData.cashValue.toFixed(1)}x</div>
            `;
            break;
          }

          default:
            typeClass = 'symbol-generic';
            labelHtml = `<div class="coin-value">${cellData.cashValue.toFixed(1)}x</div>`;
        }

        cellElem.classList.add(typeClass);
        if (cellData.justLanded) cellElem.classList.add('landed-pop');

        inner.innerHTML = `
          ${badgeHtml}
          ${iconHtml}
          ${labelHtml}
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
    const fromElem = this.cellElements[fromR][fromC];
    fromElem.classList.add('strike-firing');

    targets.forEach(t => {
      const targetElem = this.cellElements[t.row][t.col];
      targetElem.classList.add('strike-hit');
      setTimeout(() => {
        targetElem.classList.remove('strike-hit');
      }, 700);
    });

    setTimeout(() => {
      fromElem.classList.remove('strike-firing');
    }, 700);
  }

  showVortexSuction(fromR, fromC, sources) {
    const vortexElem = this.cellElements[fromR][fromC];
    vortexElem.classList.add('vortex-sucking');

    sources.forEach(s => {
      const sourceElem = this.cellElements[s.row][s.col];
      sourceElem.classList.add('vortex-absorbed');
      setTimeout(() => {
        sourceElem.classList.remove('vortex-absorbed');
      }, 700);
    });

    setTimeout(() => {
      vortexElem.classList.remove('vortex-sucking');
    }, 700);
  }

  showLifeReset(resets) {
    resets.forEach(r => {
      const elem = this.cellElements[r.row][r.col];
      elem.classList.add('life-reset-glow');
      setTimeout(() => {
        elem.classList.remove('life-reset-glow');
      }, 800);
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
}
