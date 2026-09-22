import { createBalanced955Config } from './math/config.js';
import { CashVortexSlotEngine } from './math/engine.js';
import { SoundSynth } from './audio/soundSynth.js';
import { VisualGrid } from './ui/visualGrid.js';
import { FlyingCoins } from './ui/flyingCoins.js';
import { WheelOverlay } from './ui/wheelOverlay.js';
import { BonusView } from './ui/bonusView.js';
import { DebugPanel } from './ui/debugPanel.js';

class CashVortexApp {
  constructor() {
    this.config = createBalanced955Config();
    this.engine = new CashVortexSlotEngine(this.config);
    this.soundSynth = new SoundSynth();

    // Player State
    this.balance = 1000.0;
    this.bet = 1.0;
    this.betOptions = [0.2, 0.5, 1.0, 2.0, 5.0, 10.0];
    this.betIndex = 2; // default $1.00
    this.isSpinning = false;
    this.isAutoSpinning = false;
    this.isTurbo = false;

    // Cumulative Session Stats
    this.stats = {
      spins: 0,
      totalBet: 0,
      totalWon: 0,
      rtp: 0,
      winningSpins: 0,
      hitRate: 0,
      wheel1Hits: 0,
      wheel2Hits: 0,
      wheel3Hits: 0,
      centerHits: 0,
      bonusHits: 0,
      maxWinMult: 0
    };

    // Forced feature override for debugging
    this.pendingOverride = {};

    this.initDoms();
    this.initSubsystems();
    this.bindEvents();
    this.updateHud();

    // Initial render of empty grid with center star
    this.visualGrid.render(this.engine.grid);
  }

  initDoms() {
    this.dom = {
      balance: document.getElementById('balance-display'),
      bet: document.getElementById('bet-display'),
      win: document.getElementById('win-display'),
      spinBtn: document.getElementById('spin-btn'),
      autoBtn: document.getElementById('auto-btn'),
      turboBtn: document.getElementById('turbo-btn'),
      muteBtn: document.getElementById('mute-btn'),
      debugToggleBtn: document.getElementById('debug-toggle-btn'),
      betDownBtn: document.getElementById('bet-down-btn'),
      betUpBtn: document.getElementById('bet-up-btn'),
      grid: document.getElementById('slot-grid'),
      svgLines: document.getElementById('slingo-svg-lines'),
      potElements: [
        document.getElementById('pot-1'),
        document.getElementById('pot-2'),
        document.getElementById('pot-3')
      ],
      potCounts: [
        document.getElementById('pot-1-count'),
        document.getElementById('pot-2-count'),
        document.getElementById('pot-3-count')
      ],
      wheelModal: document.getElementById('wheel-modal'),
      wheelCanvas: document.getElementById('wheel-canvas'),
      wheelTitle: document.getElementById('wheel-title'),
      bonusModal: document.getElementById('bonus-modal'),
      debugDrawer: document.getElementById('debug-drawer'),
      coinFlightContainer: document.getElementById('coin-flight-container'),
      winCelebration: document.getElementById('win-celebration-banner'),
      statusBanner: document.getElementById('status-banner')
    };
  }

  initSubsystems() {
    this.visualGrid = new VisualGrid(this.dom.grid, this.dom.svgLines);
    this.flyingCoins = new FlyingCoins(this.dom.coinFlightContainer, this.dom.potElements, this.visualGrid);
    this.wheelOverlay = new WheelOverlay(this.dom.wheelModal, this.dom.wheelCanvas, this.dom.wheelTitle, this.soundSynth);
    this.bonusView = new BonusView(this.dom.bonusModal, this.soundSynth);

    this.debugPanel = new DebugPanel(
      this.dom.debugDrawer,
      this.engine,
      feature => this.handleForceFeature(feature),
      count => this.handleRunBatch(count)
    );
  }

  bindEvents() {
    this.dom.spinBtn.addEventListener('click', () => this.handleSpinClick());

    this.dom.autoBtn.addEventListener('click', () => {
      this.isAutoSpinning = !this.isAutoSpinning;
      this.dom.autoBtn.classList.toggle('active', this.isAutoSpinning);
      this.dom.autoBtn.innerText = this.isAutoSpinning ? 'STOP AUTO' : 'AUTO SPIN';
      if (this.isAutoSpinning && !this.isSpinning) {
        this.handleSpinClick();
      }
    });

    this.dom.turboBtn.addEventListener('click', () => {
      this.isTurbo = !this.isTurbo;
      this.dom.turboBtn.classList.toggle('active', this.isTurbo);
    });

    this.dom.muteBtn.addEventListener('click', () => {
      const isMuted = this.soundSynth.toggleMute();
      this.dom.muteBtn.classList.toggle('active', !isMuted);
      this.dom.muteBtn.innerText = isMuted ? '🔇 MUTED' : '🔊 SOUND';
    });

    this.dom.debugToggleBtn.addEventListener('click', () => {
      const isOpen = this.debugPanel.toggle();
      this.dom.debugToggleBtn.classList.toggle('active', isOpen);
    });

    if (this.dom.betDownBtn) {
      this.dom.betDownBtn.addEventListener('click', () => {
        if (this.isSpinning) return;
        if (this.betIndex > 0) {
          this.betIndex--;
          this.bet = this.betOptions[this.betIndex];
          this.updateHud();
        }
      });
    }

    if (this.dom.betUpBtn) {
      this.dom.betUpBtn.addEventListener('click', () => {
        if (this.isSpinning) return;
        if (this.betIndex < this.betOptions.length - 1) {
          this.betIndex++;
          this.bet = this.betOptions[this.betIndex];
          this.updateHud();
        }
      });
    }

    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !this.isSpinning && !this.wheelOverlay.isSpinning) {
        e.preventDefault();
        this.handleSpinClick();
      }
    });
  }

  updateHud() {
    if (this.dom.balance) this.dom.balance.innerText = `$${this.balance.toFixed(2)}`;
    if (this.dom.bet) this.dom.bet.innerText = `$${this.bet.toFixed(2)}`;
  }

  setStatus(msg) {
    if (this.dom.statusBanner) {
      this.dom.statusBanner.innerText = msg;
    }
  }

  handleForceFeature(feature) {
    if (feature === 'wheel1') this.pendingOverride = { forceWheel: 1 };
    else if (feature === 'wheel2') this.pendingOverride = { forceWheel: 2 };
    else if (feature === 'wheel3') this.pendingOverride = { forceWheel: 3 };
    else if (feature === 'center') this.pendingOverride = { forceCenterWild: true };
    else if (feature === 'bonus') this.pendingOverride = { forceWheel: 2 };
    else if (feature === 'mini_strike') this.pendingOverride = { forceSpecialType: 4 };
    else if (feature === 'mega_strike') this.pendingOverride = { forceSpecialType: 5 };
    else if (feature === 'ultra_strike') this.pendingOverride = { forceSpecialType: 6 };
    else if (feature === 'mini_vortex') this.pendingOverride = { forceSpecialType: 1 };
    else if (feature === 'mega_vortex') this.pendingOverride = { forceSpecialType: 2 };
    else if (feature === 'ultra_vortex') this.pendingOverride = { forceSpecialType: 3 };
    else if (feature === 'jackpot') this.pendingOverride = { forceSpecialType: 0 };

    this.setStatus(`FORCED NEXT FEATURE: ${feature.toUpperCase()}`);
  }

  async handleSpinClick() {
    if (this.isSpinning) return;

    if (this.balance < this.bet) {
      this.setStatus('INSUFFICIENT BALANCE! PLEASE ADD FUNDS');
      this.isAutoSpinning = false;
      this.dom.autoBtn.classList.remove('active');
      this.dom.autoBtn.innerText = 'AUTO SPIN';
      return;
    }

    this.isSpinning = true;
    this.dom.spinBtn.disabled = true;
    this.flyingCoins.clearAll();
    this.visualGrid.clearWinningLines();
    this.visualGrid.clearWonCoins();
    this.dom.win.innerText = '$0.00';

    try {
      // Deduct bet
      this.balance -= this.bet;
      this.stats.spins++;
      this.stats.totalBet += this.bet;
      this.updateHud();

      this.soundSynth.playSpin();
      this.setStatus('SPINNING...');

      // Run mathematical spin model
      const override = { ...this.pendingOverride };
      this.pendingOverride = {};
      const telemetry = this.engine.spin(override);

      const speedMult = this.isTurbo ? 0.35 : 1.0;

      // Step 1: Expired Coins Flight to Pots
      if (telemetry.expiredCoins && telemetry.expiredCoins.length > 0) {
        this.setStatus(`EXPIRED COINS FLYING TO POTS (${telemetry.expiredCoins.length} COINS)...`);
        await this.flyingCoins.animateExpiredCoins(telemetry.expiredCoins, this.soundSynth, this.isTurbo);

        if (this.dom.potCounts[0]) this.dom.potCounts[0].innerText = telemetry.n1;
        if (this.dom.potCounts[1]) this.dom.potCounts[1].innerText = telemetry.n2;
        if (this.dom.potCounts[2]) this.dom.potCounts[2].innerText = telemetry.n3;

        [0, 1, 2].forEach(p => {
          const count = [telemetry.n1, telemetry.n2, telemetry.n3][p];
          const scale = 1 + Math.min(count * 0.08, 0.4);
          if (this.dom.potElements[p]) this.dom.potElements[p].style.transform = `scale(${scale})`;
        });

        await new Promise(r => setTimeout(r, 200 * speedMult));
      }

      // Step 2: Reel-Top Wheel Bonus (if triggered)
      if (telemetry.triggeredWheel > 0 && telemetry.potWheelPrize) {
        const potIdx = telemetry.triggeredWheel;
        const wheelName = potIdx === 1 ? 'Mini Wheel' : potIdx === 2 ? 'Mega Wheel' : 'Ultra Wheel';
        const slices =
          potIdx === 1
            ? this.config.miniWheelPrizes
            : potIdx === 2
            ? this.config.megaWheelPrizes
            : this.config.ultraWheelPrizes;

        this.setStatus(`★ ${wheelName.toUpperCase()} BONUS TRIGGERED! ★`);
        if (potIdx === 1) this.stats.wheel1Hits++;
        else if (potIdx === 2) this.stats.wheel2Hits++;
        else if (potIdx === 3) this.stats.wheel3Hits++;

        await new Promise(resolve => {
          this.wheelOverlay.spinWheel({
            wheelName,
            slices,
            targetIndex: telemetry.potWheelPrize.prizeIndex,
            onComplete: resolve
          });
        });
      }

      // Step 3: Render Landed Symbols on Grid
      this.visualGrid.render(this.engine.grid);
      this.soundSynth.playCoinLand();
      await new Promise(r => setTimeout(r, 300 * speedMult));

      // Step 4: Strikes Execution
      if (telemetry.strikeActions && telemetry.strikeActions.length > 0) {
        for (const strike of telemetry.strikeActions) {
          this.setStatus(`STRIKE ACTIVATED! ADDING CASH...`);
          this.soundSynth.playStrikeZap();
          this.visualGrid.showStrikeBeam(strike.strikeCell.row, strike.strikeCell.col, strike.affectedCells);
          this.visualGrid.render(this.engine.grid);
          await new Promise(r => setTimeout(r, 450 * speedMult));
        }
      }

      // Step 5: Vortexes Execution
      if (telemetry.vortexActions && telemetry.vortexActions.length > 0) {
        for (const vortex of telemetry.vortexActions) {
          this.setStatus(`VORTEX ACTIVATED! GATHERING VALUES...`);
          this.soundSynth.playVortexWhoosh();
          this.visualGrid.showVortexSuction(vortex.vortexCell.row, vortex.vortexCell.col, vortex.collectedCells);
          this.visualGrid.render(this.engine.grid);
          await new Promise(r => setTimeout(r, 500 * speedMult));
        }
      }

      // Step 6: Life Cycle Resets
      if (telemetry.resets && telemetry.resets.length > 0) {
        this.visualGrid.showLifeReset(telemetry.resets);
        this.visualGrid.render(this.engine.grid);
        await new Promise(r => setTimeout(r, 250 * speedMult));
      }

      // Step 7: Slingo Lines Evaluation
      if (telemetry.winningLines && telemetry.winningLines.length > 0) {
        this.setStatus(`CONGRATULATIONS! ${telemetry.winningLines.length} SLINGO LINE(S) WON!`);
        this.visualGrid.drawWinningLines(telemetry.winningLines);
        this.soundSynth.playLineWin();
        await new Promise(r => setTimeout(r, 500 * speedMult));
      }

      // Step 8: Center Wild Wheel Bonus (if triggered)
      if (telemetry.centerWildTriggered && telemetry.centerWildPrize) {
        this.setStatus(`★ CENTER WILD WHEEL BONUS TRIGGERED! ★`);
        this.stats.centerHits++;
        await new Promise(resolve => {
          this.wheelOverlay.spinWheel({
            wheelName: 'Center Wild Wheel',
            slices: this.config.centerWheelPrizes,
            targetIndex: telemetry.centerWildPrize.prizeIndex,
            onComplete: resolve
          });
        });
      }

      // Step 9: Lock & Slingo Bonus Game (if launched from Top Wheel or Center Wild Wheel)
      if (telemetry.lockAndSlingoResult) {
        this.setStatus(`★ LAUNCHING LOCK & SLINGO™ BONUS GAME! ★`);
        this.stats.bonusHits++;
        await new Promise(resolve => {
          this.bonusView.playBonusSequence(telemetry.lockAndSlingoResult, resolve);
        });
        this.visualGrid.render(this.engine.grid);
      }

      // Step 10: Final Win Settlement & Logging
      const winDollars = (telemetry.totalWinCents / 100) * this.bet;
      const winMult = telemetry.totalWinCents / 100;

      if (winDollars > 0) {
        this.balance += winDollars;
        this.stats.winningSpins++;
        this.stats.totalWon += winDollars;
        if (winMult > this.stats.maxWinMult) this.stats.maxWinMult = winMult;

        this.dom.win.innerText = `$${winDollars.toFixed(2)}`;
        this.setStatus(`TOTAL WIN: $${winDollars.toFixed(2)} (${winMult.toFixed(1)}x BET)`);

        if (winMult >= 20.0) {
          this.showBigWinCelebration(winDollars, winMult);
        }
      } else {
        this.setStatus('READY. PRESS SPIN TO PLAY!');
      }

      // Update cumulative session stats
      this.stats.rtp = this.stats.totalBet > 0 ? (this.stats.totalWon / this.stats.totalBet) * 100 : 0;
      this.stats.hitRate = this.stats.spins > 0 ? (this.stats.winningSpins / this.stats.spins) * 100 : 0;

      this.updateHud();
      if (this.debugPanel) {
        this.debugPanel.logSpin(telemetry, this.bet);
        this.debugPanel.updateBatchStats(this.stats);
      }

    } catch (err) {
      console.error('Spin Execution Error:', err);
      this.setStatus('READY. PRESS SPIN TO PLAY!');
    } finally {
      // Guarantees spin button is NEVER permanently disabled
      this.isSpinning = false;
      this.dom.spinBtn.disabled = false;
    }

    // Handle auto-spin loop
    if (this.isAutoSpinning) {
      const speedMult = this.isTurbo ? 0.35 : 1.0;
      setTimeout(() => {
        if (this.isAutoSpinning) this.handleSpinClick();
      }, 600 * speedMult);
    }
  }

  showBigWinCelebration(winDollars, winMult) {
    try {
      this.soundSynth.playJackpotFanfare();
      const banner = this.dom.winCelebration;
      if (!banner) return;

      banner.classList.remove('hidden');
      banner.querySelector('.win-amount-text').innerText = `$${winDollars.toFixed(2)}`;
      banner.querySelector('.win-mult-text').innerText = `${winMult.toFixed(1)}x BIG WIN!`;

      setTimeout(() => {
        banner.classList.add('hidden');
      }, 2500);
    } catch (e) {}
  }

  handleRunBatch(spinsCount) {
    this.setStatus(`RUNNING FAST BATCH OF ${spinsCount.toLocaleString()} SPINS...`);
    const startTime = performance.now();

    for (let i = 0; i < spinsCount; i++) {
      this.stats.spins++;
      this.stats.totalBet += this.bet;
      const telemetry = this.engine.spin({});

      if (telemetry.triggeredWheel === 1) this.stats.wheel1Hits++;
      else if (telemetry.triggeredWheel === 2) this.stats.wheel2Hits++;
      else if (telemetry.triggeredWheel === 3) this.stats.wheel3Hits++;

      if (telemetry.centerWildTriggered) this.stats.centerHits++;
      if (telemetry.lockAndSlingoResult) this.stats.bonusHits++;

      const winDollars = (telemetry.totalWinCents / 100) * this.bet;
      const winMult = telemetry.totalWinCents / 100;

      if (winDollars > 0) {
        this.stats.winningSpins++;
        this.stats.totalWon += winDollars;
        if (winMult > this.stats.maxWinMult) this.stats.maxWinMult = winMult;
      }
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    this.stats.rtp = (this.stats.totalWon / this.stats.totalBet) * 100;
    this.stats.hitRate = (this.stats.winningSpins / this.stats.spins) * 100;

    this.balance += this.stats.totalWon - spinsCount * this.bet;
    this.updateHud();
    if (this.debugPanel) this.debugPanel.updateBatchStats(this.stats);
    this.visualGrid.render(this.engine.grid);

    this.setStatus(`BATCH OF ${spinsCount.toLocaleString()} SPINS COMPLETED IN ${elapsed}s! RTP: ${this.stats.rtp.toFixed(2)}%`);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.cashVortexApp = new CashVortexApp();
});
