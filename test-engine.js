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
console.log('--- VERIFYING CASH VORTEX & CASH STRIKE IN WIN LINES ---');
const testEngine = new CashVortexSlotEngine(config);

// Test 1: Column 2 (Line 8: [2, 7, 12, 17, 22]) with Mini Vortex and Mega Vortex matching user screenshot
testEngine.grid[0][2].type = 2; // CashCoin
testEngine.grid[0][2].cashValue = 0.2;
testEngine.grid[1][2].type = 2; // CashCoin
testEngine.grid[1][2].cashValue = 0.6;
testEngine.grid[2][2].type = 0; // CentralWildStar
testEngine.grid[2][2].cashValue = 0.0;
testEngine.grid[3][2].type = 5; // MegaVortex
testEngine.grid[3][2].cashValue = 3.2;
testEngine.grid[4][2].type = 4; // MiniVortex
testEngine.grid[4][2].cashValue = 1.0;

const telemetry1 = { totalWinCents: 0, winningLines: [] };
testEngine.evaluateSlingoLines(telemetry1);

if (telemetry1.winningLines.length !== 1 || telemetry1.winningLines[0].lineId !== 8) {
  throw new Error('FAILED: Column 2 with Mega Vortex and Mini Vortex was not recognized as a win line!');
}
if (telemetry1.winningLines[0].payoutCents !== 500) {
  throw new Error(`FAILED: Column 2 payout expected 500 cents ($5.00), got ${telemetry1.winningLines[0].payoutCents}`);
}
console.log('✅ Test 1 PASSED: Column 2 with Mega Vortex (3.2x) and Mini Vortex (1.0x) recognized as Line 8 win with $5.00 payout!');

// Test 2: Row 0 (Line 1: [0, 1, 2, 3, 4]) with Mini Strike, Mega Strike, and Ultra Strike
testEngine.grid[0][0].type = 7; // MiniStrike
testEngine.grid[0][0].cashValue = 2.0;
testEngine.grid[0][1].type = 8; // MegaStrike
testEngine.grid[0][1].cashValue = 3.0;
testEngine.grid[0][2].type = 9; // UltraStrike
testEngine.grid[0][2].cashValue = 5.0;
testEngine.grid[0][3].type = 2; // CashCoin
testEngine.grid[0][3].cashValue = 1.0;
testEngine.grid[0][4].type = 2; // CashCoin
testEngine.grid[0][4].cashValue = 1.0;

const telemetry2 = { totalWinCents: 0, winningLines: [] };
testEngine.evaluateSlingoLines(telemetry2);

const line1Win = telemetry2.winningLines.find(l => l.lineId === 1);
if (!line1Win || line1Win.payoutCents !== 1200) {
  throw new Error('FAILED: Row 0 with Cash Strikes was not recognized as a win line!');
}
console.log('✅ Test 2 PASSED: Row 0 with Strikes (Mini, Mega, Ultra) recognized as Line 1 win with $12.00 payout!');

console.log('✅ ALL VERIFICATIONS & ISOLATION RULES PASSED SUCCESSFULLY!');

