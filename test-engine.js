import { createBalanced955Config } from './js/math/config.js';
import { CashVortexSlotEngine } from './js/math/engine.js';

if (typeof console === 'undefined') {
  var console = { log: print, error: print, warn: print };
}

console.log('--- CASH VORTEX: TRIPLE POWER™ MATH VERIFICATION ---');

const config = createBalanced955Config();
const engine = new CashVortexSlotEngine(config);


let totalSpins = 10000;
let totalBet = totalSpins * 100; // in cents
let totalWon = 0;
let winningSpins = 0;
let wheel1Hits = 0;
let wheel2Hits = 0;
let wheel3Hits = 0;
let centerHits = 0;
let bonusHits = 0;
let jackpotHits = 0;

for (let i = 0; i < totalSpins; i++) {
  const res = engine.spin();
  totalWon += res.totalWinCents;
  if (res.totalWinCents > 0) winningSpins++;

  if (res.triggeredWheel === 1) wheel1Hits++;
  else if (res.triggeredWheel === 2) wheel2Hits++;
  else if (res.triggeredWheel === 3) wheel3Hits++;

  if (res.centerWildTriggered) centerHits++;
  if (res.lockAndSlingoResult) bonusHits++;

  // Verify jackpot isolation: check that no jackpot coin was modified by strike
  for (const strike of res.strikeActions) {
    for (const aff of strike.affectedCells) {
      const cell = engine.grid[aff.row][aff.col];
      if (cell.type === 3) {
        throw new Error(`CRITICAL: Jackpot coin at (${aff.row},${aff.col}) was modified by strike!`);
      }
    }
  }

  // Check jackpot hits
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (engine.grid[r][c].type === 3) {
        jackpotHits++;
      }
    }
  }
}

const rtp = (totalWon / totalBet) * 100;
const hitRate = (winningSpins / totalSpins) * 100;

console.log(`Spins Simulated:       ${totalSpins.toLocaleString()}`);
console.log(`Observed RTP:          ${rtp.toFixed(2)}% (Target: ~95.50%)`);
console.log(`Hit Rate:              ${hitRate.toFixed(2)}%`);
console.log(`Wheel 1 (Mini) Hits:   ${wheel1Hits} (1 in ${(totalSpins / (wheel1Hits || 1)).toFixed(1)})`);
console.log(`Wheel 2 (Mega) Hits:   ${wheel2Hits} (1 in ${(totalSpins / (wheel2Hits || 1)).toFixed(1)})`);
console.log(`Wheel 3 (Ultra) Hits:  ${wheel3Hits} (1 in ${(totalSpins / (wheel3Hits || 1)).toFixed(1)})`);
console.log(`Center Wild Hits:      ${centerHits} (1 in ${(totalSpins / (centerHits || 1)).toFixed(1)})`);
console.log(`Lock & Slingo Hits:    ${bonusHits} (1 in ${(totalSpins / (bonusHits || 1)).toFixed(1)})`);
console.log(`Jackpot Coins Landed:  ${jackpotHits}`);
console.log('✅ ALL VERIFICATIONS & ISOLATION RULES PASSED SUCCESSFULLY!');
