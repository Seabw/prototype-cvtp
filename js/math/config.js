import { WeightTable } from './weightTable.js';

export const SymbolType = {
  CentralWildStar: 0,
  Blank: 1,
  CashCoin: 2,
  JackpotCoin: 3,
  MiniVortex: 4,
  MegaVortex: 5,
  UltraVortex: 6,
  MiniStrike: 7,
  MegaStrike: 8,
  UltraStrike: 9,
  XWheel: 10
};

export const SymbolNames = {
  0: '★ Center Star',
  1: 'Blank',
  2: 'Cash Coin',
  3: 'Jackpot Coin',
  4: 'Mini Vortex',
  5: 'Mega Vortex',
  6: 'Ultra Vortex',
  7: 'Mini Strike',
  8: 'Mega Strike',
  9: 'Ultra Strike',
  10: 'X-Wheel'
};

export const WheelPrizeType = {
  Multiplier: 'Multiplier',
  UltraStrike: 'UltraStrike',
  MiniStrike: 'MiniStrike',
  MegaStrike: 'MegaStrike',
  MiniVortex: 'MiniVortex',
  MegaVortex: 'MegaVortex',
  UltraVortex: 'UltraVortex',
  Jackpot: 'Jackpot',
  LockAndSlingo: 'LockAndSlingo',
  Upgrade: 'Upgrade',
  InstantCash: 'InstantCash'
};

export const SLINGO_LINES = [
  // 5 Horizontal
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14], // Row 2 (center)
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],

  // 5 Vertical
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22], // Col 2 (center)
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],

  // 2 Diagonal
  [0, 6, 12, 18, 24], // Main diagonal (center)
  [4, 8, 12, 16, 20]  // Anti diagonal (center)
];

function parsePrizeDef(id, prizeStr, weight) {
  const prize = {
    prizeId: id,
    prizeString: prizeStr,
    weight: weight,
    type: WheelPrizeType.InstantCash,
    parameterValue: 0.0,
    jackpotType: null
  };

  const s = prizeStr.trim();
  if (s.toLowerCase().startsWith('x')) {
    prize.type = WheelPrizeType.Multiplier;
    prize.parameterValue = parseFloat(s.slice(1)) || 2.0;
  } else if (s.toLowerCase().includes('lock') || s.toLowerCase().includes('slingo')) {
    prize.type = WheelPrizeType.LockAndSlingo;
  } else if (s.toLowerCase().includes('jackpot')) {
    prize.type = WheelPrizeType.Jackpot;
    if (s.toLowerCase().includes('mega')) prize.jackpotType = 'Mega';
    else if (s.toLowerCase().includes('ultra')) prize.jackpotType = 'Ultra';
    else prize.jackpotType = 'Mini';
  } else if (!isNaN(parseFloat(s))) {
    prize.type = WheelPrizeType.InstantCash;
    prize.parameterValue = parseFloat(s);
  }

  return prize;
}

export function createBalanced955Config() {
  const strikeVals = [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const strikeW = [2500, 2000, 1500, 800, 500, 200, 100, 50, 30, 20, 15, 10, 5];

  const coinVals = [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const coinW = [2500, 2250, 1800, 900, 500, 200, 85, 40, 25, 14, 9, 6, 4];

  const config = {
    gameName: 'Cash Vortex - Triple Power (Balanced 95.5% RTP)',

    // Expired coin pot flight weights
    xWheelPotWeights: [
      { potId: 0, potName: 'Pot 1: Mini Wheel', weight: 230 },
      { potId: 1, potName: 'Pot 2: Mega Wheel', weight: 150 },
      { potId: 2, potName: 'Pot 3: Ultra Wheel', weight: 20 }
    ],

    // Dynamic single-roll trigger multipliers
    xWheelTriggerBaseWeightWheel1: 3430,
    xWheelTriggerBaseWeightWheel2: 825,
    xWheelTriggerBaseWeightWheel3: 212,
    xWheelTriggerNoTriggerWeight: 100000,

    // Base Game Table Selections (Low / Med / High)
    tableSelections: [
      { tableId: 0, description: 'Low Symbol Chance', weight: 1000 },
      { tableId: 1, description: 'Medium Symbol Chance', weight: 300 },
      { tableId: 2, description: 'High Symbol Chance', weight: 100 }
    ],

    // Special Symbol Chances per Table (Special / NoSpecial)
    specialSymbolChances: [
      { tableId: 0, specialSymbolWeight: 158, noSpecialSymbolWeight: 1000 },
      { tableId: 1, specialSymbolWeight: 208, noSpecialSymbolWeight: 1000 },
      { tableId: 2, specialSymbolWeight: 258, noSpecialSymbolWeight: 1000 }
    ],

    // Special Symbol Pool
    specialSymbolDefs: [
      { symbolId: 0, symbolName: 'Jackpot Coin', weight: 500, type: SymbolType.JackpotCoin },
      { symbolId: 1, symbolName: 'Mini Vortex', weight: 800, type: SymbolType.MiniVortex },
      { symbolId: 2, symbolName: 'Mega Vortex', weight: 250, type: SymbolType.MegaVortex },
      { symbolId: 3, symbolName: 'Ultra Vortex', weight: 80, type: SymbolType.UltraVortex },
      { symbolId: 4, symbolName: 'Mini Strike', weight: 800, type: SymbolType.MiniStrike },
      { symbolId: 5, symbolName: 'Mega Strike', weight: 250, type: SymbolType.MegaStrike },
      { symbolId: 6, symbolName: 'Ultra Strike', weight: 80, type: SymbolType.UltraStrike }
    ],

    // Jackpot Coin Types
    jackpotCoins: [
      { jackpotId: 0, jackpotName: 'Mini', multiplier: 5.0, weight: 1000 },
      { jackpotId: 1, jackpotName: 'Mega', multiplier: 50.0, weight: 25 },
      { jackpotId: 2, jackpotName: 'Ultra', multiplier: 500.0, weight: 1 }
    ],

    cashStrikeValues: strikeVals.map((val, i) => ({ multiplier: val, weight: strikeW[i] })),

    // Cash Coin Chances per Table (Coin / Blank)
    cashCoinChances: [
      { tableId: 0, coinWeight: 69, blankWeight: 1000 },
      { tableId: 1, coinWeight: 153, blankWeight: 1000 },
      { tableId: 2, coinWeight: 290, blankWeight: 1000 }
    ],

    cashCoinValues: coinVals.map((val, i) => ({ multiplier: val, weight: coinW[i] })),

    miniVortexBasePay: 1.0,
    megaVortexBasePay: 2.0,
    ultraVortexBasePay: 5.0,

    // Reel-Top Mini Wheel (9 slices)
    miniWheelPrizes: [
      parsePrizeDef(0, 'x2', 500),
      parsePrizeDef(1, '5', 210),
      parsePrizeDef(2, '1', 1200),
      parsePrizeDef(3, 'x3', 300),
      parsePrizeDef(4, 'Mini Jackpot', 460),
      parsePrizeDef(5, '3', 500),
      parsePrizeDef(6, 'x2', 500),
      parsePrizeDef(7, '2', 900),
      parsePrizeDef(8, '4', 350)
    ],

    // Reel-Top Mega Wheel (9 slices)
    megaWheelPrizes: [
      parsePrizeDef(0, 'x4', 300),
      parsePrizeDef(1, 'Lock & Slingo', 300),
      parsePrizeDef(2, '2', 500),
      parsePrizeDef(3, 'x5', 250),
      parsePrizeDef(4, 'Mini Jackpot', 350),
      parsePrizeDef(5, '3', 400),
      parsePrizeDef(6, 'x3', 400),
      parsePrizeDef(7, 'Mega Jackpot', 65),
      parsePrizeDef(8, '4', 300)
    ],

    // Reel-Top Ultra Wheel (10 slices)
    ultraWheelPrizes: [
      parsePrizeDef(0, 'x5', 300),
      parsePrizeDef(1, 'Mini Jackpot', 200),
      parsePrizeDef(2, 'x10', 200),
      parsePrizeDef(3, 'Mega Jackpot', 80),
      parsePrizeDef(4, 'x5', 300),
      parsePrizeDef(5, 'Lock & Slingo', 350),
      parsePrizeDef(6, 'x10', 200),
      parsePrizeDef(7, 'Ultra Jackpot', 12),
      parsePrizeDef(8, 'x5', 300),
      parsePrizeDef(9, 'Lock & Slingo', 350)
    ],

    // Center Wild Wheel (9 slices)
    centerWheelPrizes: [
      parsePrizeDef(0, '1', 3350),
      parsePrizeDef(1, '2', 2350),
      parsePrizeDef(2, '3', 1400),
      parsePrizeDef(3, '4', 700),
      parsePrizeDef(4, '5', 350),
      parsePrizeDef(5, 'Mini Jackpot', 685),
      parsePrizeDef(6, 'Mega Jackpot', 34),
      parsePrizeDef(7, 'Ultra Jackpot', 1),
      parsePrizeDef(8, 'Lock & Slingo', 1360)
    ],

    // Lock & Slingo Bonus Config
    bonusBaseFactor: 400,
    bonusLandingWeights: [
      [0, 0, 0, 0, 0],              // 0 lives
      [289, 249, 199, 139, 60],     // 1 life
      [329, 289, 239, 169, 85],     // 2 lives
      [369, 329, 269, 199, 109]     // 3 lives
    ],

    slingoLadderPrizes: [
      { slingoCount: 1, prizeString: 'Mini Strike 1', type: WheelPrizeType.MiniStrike, parameterValue: 1.0 },
      { slingoCount: 2, prizeString: 'Mini Vortex', type: WheelPrizeType.MiniVortex, parameterValue: 0 },
      { slingoCount: 3, prizeString: 'Mini Jackpot', type: WheelPrizeType.Jackpot, jackpotType: 'Mini', parameterValue: 5.0 },
      { slingoCount: 4, prizeString: 'Mega Vortex', type: WheelPrizeType.MegaVortex, parameterValue: 0 },
      { slingoCount: 5, prizeString: 'Mega Strike 2', type: WheelPrizeType.MegaStrike, parameterValue: 2.0 },
      { slingoCount: 6, prizeString: 'Multiplier x2', type: WheelPrizeType.Multiplier, parameterValue: 2.0 },
      { slingoCount: 7, prizeString: 'Ultra Vortex', type: WheelPrizeType.UltraVortex, parameterValue: 0 },
      { slingoCount: 8, prizeString: 'Multiplier x3', type: WheelPrizeType.Multiplier, parameterValue: 3.0 },
      { slingoCount: 9, prizeString: 'Mega Jackpot', type: WheelPrizeType.Jackpot, jackpotType: 'Mega', parameterValue: 50.0 },
      { slingoCount: 10, prizeString: 'Ultra Strike 5', type: WheelPrizeType.UltraStrike, parameterValue: 5.0 },
      { slingoCount: 12, prizeString: 'Ultra Jackpot', type: WheelPrizeType.Jackpot, jackpotType: 'Ultra', parameterValue: 500.0 }
    ],

    bonusCashStrikeTypes: [
      { symbolName: 'Mini Strike', type: SymbolType.MiniStrike, weight: 1000 },
      { symbolName: 'Mega Strike', type: SymbolType.MegaStrike, weight: 320 },
      { symbolName: 'Ultra Strike', type: SymbolType.UltraStrike, weight: 60 }
    ],

    bonusOutcomeDefs: [
      { outcomeId: 0, desc: '1 Cash Coin', weights: [1000, 1000, 1000, 1000, 1000], items: [{ type: SymbolType.CashCoin, count: 1 }] },
      { outcomeId: 1, desc: '2 Cash Coins', weights: [400, 300, 200, 100, 0], items: [{ type: SymbolType.CashCoin, count: 2 }] },
      { outcomeId: 2, desc: '3 Cash Coins', weights: [200, 100, 48, 5, 0], items: [{ type: SymbolType.CashCoin, count: 3 }] },
      { outcomeId: 3, desc: '1 Jackpot Coin', weights: [50, 40, 30, 20, 10], items: [{ type: SymbolType.JackpotCoin, count: 1 }] },
      { outcomeId: 4, desc: '1 Cash Coin + 1 Jackpot Coin', weights: [11, 5, 3, 1, 0], items: [{ type: SymbolType.CashCoin, count: 1 }, { type: SymbolType.JackpotCoin, count: 1 }] },
      { outcomeId: 5, desc: '2 Cash Coins + 1 Jackpot Coin', weights: [5, 3, 2, 1, 0], items: [{ type: SymbolType.CashCoin, count: 2 }, { type: SymbolType.JackpotCoin, count: 1 }] },
      { outcomeId: 6, desc: '1 Cash Vortex', weights: [50, 40, 25, 10, 5], items: [{ type: SymbolType.MiniVortex, count: 1 }] },
      { outcomeId: 7, desc: '1 Cash Coin + 1 Cash Vortex', weights: [10, 5, 3, 1, 0], items: [{ type: SymbolType.CashCoin, count: 1 }, { type: SymbolType.MiniVortex, count: 1 }] },
      { outcomeId: 8, desc: '2 Cash Coins + 1 Cash Vortex', weights: [5, 3, 2, 1, 0], items: [{ type: SymbolType.CashCoin, count: 2 }, { type: SymbolType.MiniVortex, count: 1 }] },
      { outcomeId: 9, desc: '1 Cash Strike', weights: [50, 40, 30, 20, 5], items: [{ type: SymbolType.MiniStrike, count: 1 }] },
      { outcomeId: 10, desc: '1 Cash Coin + 1 Cash Strike', weights: [10, 5, 3, 1, 0], items: [{ type: SymbolType.CashCoin, count: 1 }, { type: SymbolType.MiniStrike, count: 1 }] },
      { outcomeId: 11, desc: '2 Cash Coins + 1 Cash Strike', weights: [5, 3, 2, 1, 0], items: [{ type: SymbolType.CashCoin, count: 2 }, { type: SymbolType.MiniStrike, count: 1 }] }
    ],

    bonusJackpotCoins: [
      { jackpotId: 0, jackpotName: 'Mini', multiplier: 5.0, weight: 1000 },
      { jackpotId: 1, jackpotName: 'Mega', multiplier: 50.0, weight: 38 },
      { jackpotId: 2, jackpotName: 'Ultra', multiplier: 500.0, weight: 2 }
    ]
  };

  // Build weight tables
  config.tableSelectionWeights = new WeightTable(config.tableSelections.map(t => t.weight));

  config.specialSymbolChanceWeights = {};
  for (const ssc of config.specialSymbolChances) {
    config.specialSymbolChanceWeights[ssc.tableId] = new WeightTable([ssc.specialSymbolWeight, ssc.noSpecialSymbolWeight]);
  }

  config.specialSymbolTypeWeights = new WeightTable(config.specialSymbolDefs.map(s => s.weight));
  config.jackpotTypeWeights = new WeightTable(config.jackpotCoins.map(j => j.weight));
  config.cashStrikeValueWeights = new WeightTable(config.cashStrikeValues.map(c => c.weight));

  config.cashCoinChanceWeights = {};
  for (const ccc of config.cashCoinChances) {
    config.cashCoinChanceWeights[ccc.tableId] = new WeightTable([ccc.coinWeight, ccc.blankWeight]);
  }

  config.cashCoinValueWeights = new WeightTable(config.cashCoinValues.map(c => c.weight));

  config.xWheelPotWeightTable = new WeightTable(config.xWheelPotWeights.map(p => p.weight));
  config.miniWheelWeightTable = new WeightTable(config.miniWheelPrizes.map(p => p.weight));
  config.megaWheelWeightTable = new WeightTable(config.megaWheelPrizes.map(p => p.weight));
  config.ultraWheelWeightTable = new WeightTable(config.ultraWheelPrizes.map(p => p.weight));
  config.centerWheelWeightTable = new WeightTable(config.centerWheelPrizes.map(p => p.weight));

  config.bonusOutcomeWeightsByBucket = [];
  for (let b = 0; b < 5; b++) {
    const bucketWeights = config.bonusOutcomeDefs.map(o => (b < o.weights.length ? o.weights[b] : 0));
    config.bonusOutcomeWeightsByBucket[b] = new WeightTable(bucketWeights);
  }

  config.bonusJackpotWeights = new WeightTable(config.bonusJackpotCoins.map(j => j.weight));
  config.bonusCashStrikeTypeWeights = new WeightTable(config.bonusCashStrikeTypes.map(s => s.weight));
  config.bonusCashStrikeValueWeights = new WeightTable(config.cashStrikeValues.map(c => c.weight));
  config.bonusCashCoinValueWeights = new WeightTable(config.cashCoinValues.map(c => c.weight));

  return config;
}
