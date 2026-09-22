export class DebugPanel {
  constructor(panelElement, engine, onTriggerForce, onRunBatch) {
    this.panel = panelElement;
    this.engine = engine;
    this.onTriggerForce = onTriggerForce;
    this.onRunBatch = onRunBatch;
    this.logContent = panelElement.querySelector('.debug-log-content');
    this.statsElement = panelElement.querySelector('.debug-stats-content');
    this.isOpen = false;

    this.bindEvents();
  }

  bindEvents() {
    const toggleBtn = document.getElementById('debug-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('open', this.isOpen);
      });
    }

    const closeBtn = this.panel.querySelector('.debug-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.isOpen = false;
        this.panel.classList.remove('open');
      });
    }

    // Feature force buttons
    this.panel.querySelectorAll('[data-force-feature]').forEach(btn => {
      btn.addEventListener('click', e => {
        const feature = e.target.dataset.forceFeature;
        this.onTriggerForce(feature);
      });
    });

    // Batch run buttons
    this.panel.querySelectorAll('[data-batch-spins]').forEach(btn => {
      btn.addEventListener('click', e => {
        const count = parseInt(e.target.dataset.batchSpins, 10);
        this.onRunBatch(count);
      });
    });

    // Clear log button
    const clearBtn = this.panel.querySelector('#debug-clear-log');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.logContent.innerHTML = '';
      });
    }
  }

  logSpin(telemetry, betDollars) {
    const item = document.createElement('div');
    item.className = 'log-item';

    const winDollars = (telemetry.totalWinCents / 100 * betDollars).toFixed(2);
    const winMult = (telemetry.totalWinCents / 100).toFixed(2);

    const weights = telemetry.dynamicWeights || {};
    const p1Prob = weights.totalTriggerWeight ? ((weights.w1 / weights.totalTriggerWeight) * 100).toFixed(2) : 0;
    const p2Prob = weights.totalTriggerWeight ? ((weights.w2 / weights.totalTriggerWeight) * 100).toFixed(2) : 0;
    const p3Prob = weights.totalTriggerWeight ? ((weights.w3 / weights.totalTriggerWeight) * 100).toFixed(2) : 0;

    let wheelStr = 'None';
    if (telemetry.triggeredWheel === 1) wheelStr = 'Pot 1 (Mini Wheel)';
    else if (telemetry.triggeredWheel === 2) wheelStr = 'Pot 2 (Mega Wheel)';
    else if (telemetry.triggeredWheel === 3) wheelStr = 'Pot 3 (Ultra Wheel)';

    let specialLandedStr = 'None';
    const specials = telemetry.newlyLanded.filter(c => c.type >= 3);
    if (specials.length > 0) {
      specialLandedStr = specials.map(s => `[Type ${s.type} Val ${s.cashValue}x]`).join(', ');
    }

    item.innerHTML = `
      <div class="log-header">
        <span class="log-spin">Spin #${telemetry.spinNumber}</span>
        <span class="log-win ${telemetry.totalWinCents > 0 ? 'win' : ''}">Win: $${winDollars} (${winMult}x)</span>
      </div>
      <div class="log-details">
        <div><strong>Table:</strong> ${telemetry.tableIndex} (0: Low, 1: Med, 2: High)</div>
        <div><strong>Expired Coins:</strong> Mini: ${telemetry.n1}, Mega: ${telemetry.n2}, Ultra: ${telemetry.n3}</div>
        <div><strong>Dynamic Roll:</strong> ${weights.roll || 0} / ${weights.totalTriggerWeight || 100000} (P1: ${p1Prob}%, P2: ${p2Prob}%, P3: ${p3Prob}%)</div>
        <div><strong>Triggered Wheel:</strong> ${wheelStr}</div>
        <div><strong>Special Landed:</strong> ${specialLandedStr}</div>
        <div><strong>Winning Lines:</strong> ${telemetry.winningLines.length} (${telemetry.winningLines.map(l => `L${l.lineId}:$${(l.payoutCents/100*betDollars).toFixed(2)}`).join(', ') || '0'})</div>
        ${telemetry.centerWildTriggered ? `<div class="log-alert">★ Center Wild Wheel Triggered: ${telemetry.centerWildPrize?.prize.prizeString}!</div>` : ''}
        ${telemetry.lockAndSlingoResult ? `<div class="log-alert">★ Lock & Slingo Played: ${telemetry.lockAndSlingoResult.completedSlingos} Slingos, Win: $${(telemetry.lockAndSlingoResult.totalBonusWinCents/100*betDollars).toFixed(2)}</div>` : ''}
      </div>
    `;

    this.logContent.prepend(item);
    if (this.logContent.children.length > 50) {
      this.logContent.removeChild(this.logContent.lastChild);
    }
  }

  updateBatchStats(stats) {
    if (!this.statsElement) return;
    this.statsElement.innerHTML = `
      <div class="stat-row"><span>Total Spins:</span> <strong>${stats.spins.toLocaleString()}</strong></div>
      <div class="stat-row"><span>Total Bet:</span> <strong>$${stats.totalBet.toFixed(2)}</strong></div>
      <div class="stat-row"><span>Total Won:</span> <strong>$${stats.totalWon.toFixed(2)}</strong></div>
      <div class="stat-row"><span>Observed RTP:</span> <strong class="${stats.rtp >= 90 ? 'text-green' : 'text-gold'}">${stats.rtp.toFixed(2)}%</strong></div>
      <div class="stat-row"><span>Hit Rate:</span> <strong>${stats.hitRate.toFixed(2)}%</strong></div>
      <div class="stat-row"><span>Wheel 1 (Mini) Hits:</span> <strong>${stats.wheel1Hits}</strong></div>
      <div class="stat-row"><span>Wheel 2 (Mega) Hits:</span> <strong>${stats.wheel2Hits}</strong></div>
      <div class="stat-row"><span>Wheel 3 (Ultra) Hits:</span> <strong>${stats.wheel3Hits}</strong></div>
      <div class="stat-row"><span>Center Wild Hits:</span> <strong>${stats.centerHits}</strong></div>
      <div class="stat-row"><span>Lock & Slingo Hits:</span> <strong>${stats.bonusHits}</strong></div>
      <div class="stat-row"><span>Max Single Win:</span> <strong>${stats.maxWinMult.toFixed(1)}x</strong></div>
    `;
  }
}
