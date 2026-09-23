import { SymbolType, WheelPrizeType, SLINGO_LINES } from './config.js';
import { Rng } from './rng.js';

export class GridCell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.type = (row === 2 && col === 2) ? SymbolType.CentralWildStar : SymbolType.Blank;
    this.cashValue = 0.0;
    this.jackpotType = null;
    this.lifeRemaining = (row === 2 && col === 2) ? 999999 : 0;
    this.wonThisSpin = false;
    this.justLanded = false;
    this.targetAffectedCount = 0;
  }

  clone() {
    const copy = new GridCell(this.row, this.col);
    copy.type = this.type;
    copy.cashValue = this.cashValue;
    copy.jackpotType = this.jackpotType;
    copy.lifeRemaining = this.lifeRemaining;
    copy.wonThisSpin = this.wonThisSpin;
    copy.justLanded = this.justLanded;
    copy.targetAffectedCount = this.targetAffectedCount;
    return copy;
  }
}

export class CashVortexSlotEngine {
  constructor(config, rng = null) {
    this.config = config;
    this.rng = rng || new Rng();
    this.grid = [];
    this.spinsInCurrentStage = 0;
    this.initializeGrid();
  }

  initializeGrid() {
    this.grid = [];
    for (let r = 0; r < 5; r++) {
      this.grid[r] = [];
      for (let c = 0; c < 5; c++) {
        this.grid[r][c] = new GridCell(r, c);
      }
    }
  }

  reset() {
    this.spinsInCurrentStage = 0;
    this.initializeGrid();
  }

  isValuableTarget(type) {
    return (
      type === SymbolType.CashCoin ||
      type === SymbolType.MiniVortex ||
      type === SymbolType.MegaVortex ||
      type === SymbolType.UltraVortex ||
      type === SymbolType.XWheel ||
      type === SymbolType.MiniStrike ||
      type === SymbolType.MegaStrike ||
      type === SymbolType.UltraStrike
    );
  }

  getOrthogonalNeighbors(grid, row, col) {
    const neighbors = [];
    const dr = [-1, 1, 0, 0];
    const dc = [0, 0, -1, 1];
    for (let i = 0; i < 4; i++) {
      const nr = row + dr[i];
      const nc = col + dc[i];
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        neighbors.push(grid[nr][nc]);
      }
    }
    return neighbors;
  }

  getSameLineCells(grid, row, col) {
    const cellIndex = row * 5 + col;
    const matching = new Map();
    for (const line of SLINGO_LINES) {
      if (line.includes(cellIndex)) {
        for (const idx of line) {
          const r = Math.floor(idx / 5);
          const c = idx % 5;
          matching.set(idx, grid[r][c]);
        }
      }
    }
    return Array.from(matching.values());
  }

  getEmptyPositions(grid) {
    const empty = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2 && grid[r][c].type === SymbolType.CentralWildStar) continue;
        if (grid[r][c].type === SymbolType.Blank) {
          empty.push({ r, c });
        }
      }
    }
    return empty;
  }

  sampleCashStrikeValue() {
    const idx = this.config.cashStrikeValueWeights.sample(this.rng);
    return this.config.cashStrikeValues[idx].multiplier;
  }

  sampleCashCoinValue() {
    const idx = this.config.cashCoinValueWeights.sample(this.rng);
    return this.config.cashCoinValues[idx].multiplier;
  }

  sampleBonusCashStrikeValue() {
    const idx = this.config.bonusCashStrikeValueWeights.sample(this.rng);
    return this.config.cashStrikeValues[idx].multiplier;
  }

  sampleBonusCashCoinValue() {
    const idx = this.config.bonusCashCoinValueWeights.sample(this.rng);
    return this.config.cashCoinValues[idx].multiplier;
  }

  /**
   * Main Base Game Spin resolving all chronological steps
   * @param {Object} forcedOverrides Optional override parameters for debugging/testing
   */
  spin(forcedOverrides = {}) {
    this.spinsInCurrentStage++;

    const telemetry = {
      spinNumber: this.spinsInCurrentStage,
      expiredCoins: [],
      n1: 0,
      n2: 0,
      n3: 0,
      dynamicWeights: null,
      triggeredWheel: 0,
      potWheelPrize: null,
      tableIndex: 0,
      newlyLanded: [],
      strikeActions: [],
      vortexActions: [],
      resets: [],
      winningLines: [],
      centerWildTriggered: false,
      centerWildPrize: null,
      lockAndSlingoResult: null,
      totalWinCents: 0
    };

    // Step 1: Identify Expired Coins and Sample Pot Destinations
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) continue; // Center Star never expires

        const cell = this.grid[r][c];
        // Only coins that expired after 3 lives (not involved in a win) fly to the pots
        if (cell.type !== SymbolType.Blank && !cell.wonThisSpin && cell.lifeRemaining <= 1) {
          let potIdx = 0;
          if (this.config.xWheelPotWeightTable.totalWeight > 0) {
            potIdx = this.config.xWheelPotWeightTable.sample(this.rng);
          } else {
            potIdx = this.rng.next(3);
          }

          if (potIdx === 0) telemetry.n1++;
          else if (potIdx === 1) telemetry.n2++;
          else if (potIdx === 2) telemetry.n3++;

          telemetry.expiredCoins.push({
            row: r,
            col: c,
            type: cell.type,
            cashValue: cell.cashValue,
            jackpotType: cell.jackpotType,
            potIndex: potIdx
          });
        }
      }
    }

    // Step 2: Dynamic Trigger Weights & Single Random Roll
    const w1 = telemetry.n1 * this.config.xWheelTriggerBaseWeightWheel1;
    const w2 = telemetry.n2 * this.config.xWheelTriggerBaseWeightWheel2;
    const w3 = telemetry.n3 * this.config.xWheelTriggerBaseWeightWheel3;
    const wNoTrigger = this.config.xWheelTriggerNoTriggerWeight;
    const totalTriggerWeight = w1 + w2 + w3 + wNoTrigger;

    let triggeredWheel = 0; // 0: None, 1: Mini, 2: Mega, 3: Ultra
    const roll = this.rng.next(totalTriggerWeight);

    if (roll < w1) triggeredWheel = 1;
    else if (roll < w1 + w2) triggeredWheel = 2;
    else if (roll < w1 + w2 + w3) triggeredWheel = 3;
    else triggeredWheel = 0;

    // Apply forced wheel override if debugging
    if (forcedOverrides.forceWheel) {
      triggeredWheel = forcedOverrides.forceWheel;
    }

    telemetry.dynamicWeights = { w1, w2, w3, wNoTrigger, totalTriggerWeight, roll };
    telemetry.triggeredWheel = triggeredWheel;

    // Step 3: Prepare Grid for New Spin (Clear expired coins, decrement active coins)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) continue;

        const cell = this.grid[r][c];
        cell.justLanded = false;

        if (cell.wonThisSpin || cell.lifeRemaining <= 1) {
          cell.type = SymbolType.Blank;
          cell.cashValue = 0.0;
          cell.lifeRemaining = 0;
          cell.jackpotType = null;
          cell.wonThisSpin = false;
        } else {
          cell.lifeRemaining--;
        }
      }
    }

    // Step 4: Active Table Selection (0: Low, 1: Med, 2: High)
    const tableIndex = this.config.tableSelectionWeights.sample(this.rng);
    telemetry.tableIndex = tableIndex;

    const newlyLandedCells = [];
    const emptyPositions = this.getEmptyPositions(this.grid);

    if (triggeredWheel > 0) {
      // Wheel Bonus Triggered: No special symbols, land cash coins / blanks
      const coinChanceWeights = this.config.cashCoinChanceWeights[tableIndex];
      let cashCoinsLandedCount = 0;

      for (const pos of emptyPositions) {
        const outcome = coinChanceWeights.sample(this.rng); // 0: Cash Coin, 1: Blank
        const cell = this.grid[pos.r][pos.c];

        if (outcome === 0) {
          cell.type = SymbolType.CashCoin;
          cell.cashValue = this.sampleCashCoinValue();
          cell.lifeRemaining = 3;
          cell.justLanded = true;
          cell.wonThisSpin = false;
          newlyLandedCells.push(cell);
          cashCoinsLandedCount++;
        } else {
          cell.type = SymbolType.Blank;
          cell.cashValue = 0.0;
          cell.lifeRemaining = 0;
          cell.wonThisSpin = false;
        }
      }

      // Guaranteed 1 coin if 0 landed
      if (cashCoinsLandedCount === 0 && emptyPositions.length > 0) {
        const forcedIdx = this.rng.next(emptyPositions.length);
        const pos = emptyPositions[forcedIdx];
        const cell = this.grid[pos.r][pos.c];
        cell.type = SymbolType.CashCoin;
        cell.cashValue = this.sampleCashCoinValue();
        cell.lifeRemaining = 3;
        cell.justLanded = true;
        newlyLandedCells.push(cell);
      }

      // Snapshot grid before Wheel bonus modifiers
      telemetry.preActionGrid = this.grid.map(row => row.map(c => c.clone()));

      // Play out triggered wheel bonus
      this.executePotWheelBonus(triggeredWheel, telemetry);
    } else {
      // Normal Spin (No Wheel Bonus Triggered)
      let specialSymbolLanded = false;
      const specialChanceWeights = this.config.specialSymbolChanceWeights[tableIndex];
      let specialRoll = specialChanceWeights.sample(this.rng); // 0: Special, 1: No Special

      if (forcedOverrides.forceSpecialType !== undefined) {
        specialRoll = 0;
      }

      if (specialRoll === 0 && emptyPositions.length > 0 && this.config.specialSymbolDefs.length > 0) {
        specialSymbolLanded = true;
        let specialTypeIdx = this.config.specialSymbolTypeWeights.sample(this.rng);
        if (forcedOverrides.forceSpecialType !== undefined) {
          specialTypeIdx = forcedOverrides.forceSpecialType;
        }

        const posIdx = this.rng.next(emptyPositions.length);
        const targetPos = emptyPositions.splice(posIdx, 1)[0];
        const cell = this.grid[targetPos.r][targetPos.c];

        cell.justLanded = true;
        cell.lifeRemaining = 3;
        cell.wonThisSpin = false;

        const specDef = this.config.specialSymbolDefs[specialTypeIdx];
        const sName = specDef.symbolName;

        if (sName.toLowerCase().includes('jackpot')) {
          cell.type = SymbolType.JackpotCoin;
          const jpIdx = this.config.jackpotTypeWeights.sample(this.rng);
          const jpDef = this.config.jackpotCoins[jpIdx];
          cell.jackpotType = jpDef.jackpotName;
          cell.cashValue = jpDef.multiplier;
        } else if (sName.toLowerCase().includes('mini vortex')) {
          cell.type = SymbolType.MiniVortex;
          cell.cashValue = this.config.miniVortexBasePay;
        } else if (sName.toLowerCase().includes('mega vortex')) {
          cell.type = SymbolType.MegaVortex;
          cell.cashValue = this.config.megaVortexBasePay;
        } else if (sName.toLowerCase().includes('ultra vortex')) {
          cell.type = SymbolType.UltraVortex;
          cell.cashValue = this.config.ultraVortexBasePay;
        } else if (sName.toLowerCase().includes('mini strike')) {
          cell.type = SymbolType.MiniStrike;
          cell.cashValue = this.sampleCashStrikeValue();
        } else if (sName.toLowerCase().includes('mega strike')) {
          cell.type = SymbolType.MegaStrike;
          cell.cashValue = this.sampleCashStrikeValue();
        } else if (sName.toLowerCase().includes('ultra strike')) {
          cell.type = SymbolType.UltraStrike;
          cell.cashValue = this.sampleCashStrikeValue();
        } else {
          cell.type = SymbolType.CashCoin;
          cell.cashValue = this.sampleCashCoinValue();
        }

        newlyLandedCells.push(cell);
      }

      // Fill remaining empty positions with Cash Coins or Blanks
      const coinChanceWeights = this.config.cashCoinChanceWeights[tableIndex];
      let cashCoinsLandedCount = 0;

      for (const pos of emptyPositions) {
        const outcome = coinChanceWeights.sample(this.rng);
        const cell = this.grid[pos.r][pos.c];

        if (outcome === 0) {
          cell.type = SymbolType.CashCoin;
          cell.cashValue = this.sampleCashCoinValue();
          cell.lifeRemaining = 3;
          cell.justLanded = true;
          cell.wonThisSpin = false;
          newlyLandedCells.push(cell);
          cashCoinsLandedCount++;
        } else {
          cell.type = SymbolType.Blank;
          cell.cashValue = 0.0;
          cell.lifeRemaining = 0;
          cell.wonThisSpin = false;
        }
      }

      // Edge case: Guaranteed 1 coin if 0 special symbols and 0 coins landed
      if (!specialSymbolLanded && cashCoinsLandedCount === 0 && emptyPositions.length > 0) {
        const forcedIdx = this.rng.next(emptyPositions.length);
        const pos = emptyPositions[forcedIdx];
        const cell = this.grid[pos.r][pos.c];
        cell.type = SymbolType.CashCoin;
        cell.cashValue = this.sampleCashCoinValue();
        cell.lifeRemaining = 3;
        cell.justLanded = true;
        newlyLandedCells.push(cell);
      }

      // Snapshot grid before Strikes & Vortexes modify values
      telemetry.preActionGrid = this.grid.map(row => row.map(c => c.clone()));

      // Execute Strikes & Vortexes
      this.executeSpecialSymbolActions(this.grid, newlyLandedCells, telemetry);
    }

    // Step 5: Symbol Life Cycle Reset for Line-Sharing Existing Symbols
    this.applyLifeCycleResets(this.grid, newlyLandedCells, telemetry);

    // Step 6: 12 Slingo Lines Evaluation & Center Wild Wheel Bonus
    this.evaluateSlingoLines(telemetry, forcedOverrides);

    // Snapshot newly landed for UI telemetry
    telemetry.newlyLanded = newlyLandedCells.map(c => ({
      row: c.row,
      col: c.col,
      type: c.type,
      cashValue: c.cashValue,
      jackpotType: c.jackpotType,
      lifeRemaining: c.lifeRemaining
    }));

    return telemetry;
  }

  executeSpecialSymbolActions(targetGrid, newlyLanded, telemetry) {
    // 1. Process Cash Strikes FIRST (distribute cash boost)
    for (const cell of newlyLanded) {
      if (cell.type === SymbolType.MiniStrike || cell.type === SymbolType.MegaStrike || cell.type === SymbolType.UltraStrike) {
        let targets = [];
        if (cell.type === SymbolType.MiniStrike) {
          targets = this.getOrthogonalNeighbors(targetGrid, cell.row, cell.col);
        } else if (cell.type === SymbolType.MegaStrike) {
          targets = this.getSameLineCells(targetGrid, cell.row, cell.col).filter(t => t !== cell);
        } else if (cell.type === SymbolType.UltraStrike) {
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              if (targetGrid[r][c] !== cell) targets.push(targetGrid[r][c]);
            }
          }
        }

        const strikeRecord = {
          strikeCell: { row: cell.row, col: cell.col, type: cell.type, value: cell.cashValue },
          affectedCells: []
        };

        for (const t of targets) {
          if (this.isValuableTarget(t.type)) {
            const prev = t.cashValue;
            t.cashValue = Math.round((t.cashValue + cell.cashValue) * 100) / 100;
            strikeRecord.affectedCells.push({
              row: t.row,
              col: t.col,
              prevVal: prev,
              addedVal: cell.cashValue,
              newVal: t.cashValue
            });
          }
        }

        cell.targetAffectedCount = strikeRecord.affectedCells.length;
        telemetry.strikeActions.push(strikeRecord);
      }
    }

    // 2. Process Cash Vortexes SECOND (gather cash values)
    for (const cell of newlyLanded) {
      if (cell.type === SymbolType.MiniVortex || cell.type === SymbolType.MegaVortex || cell.type === SymbolType.UltraVortex) {
        let targets = [];
        let basePay = this.config.miniVortexBasePay;

        if (cell.type === SymbolType.MiniVortex) {
          targets = this.getOrthogonalNeighbors(targetGrid, cell.row, cell.col);
          basePay = this.config.miniVortexBasePay;
        } else if (cell.type === SymbolType.MegaVortex) {
          targets = this.getSameLineCells(targetGrid, cell.row, cell.col).filter(t => t !== cell);
          basePay = this.config.megaVortexBasePay;
        } else if (cell.type === SymbolType.UltraVortex) {
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              if (targetGrid[r][c] !== cell) targets.push(targetGrid[r][c]);
            }
          }
          basePay = this.config.ultraVortexBasePay;
        }

        let gatheredSum = 0.0;
        const vortexRecord = {
          vortexCell: { row: cell.row, col: cell.col, type: cell.type, basePay },
          collectedCells: [],
          finalValue: 0.0
        };

        for (const t of targets) {
          if (this.isValuableTarget(t.type)) {
            gatheredSum += t.cashValue;
            vortexRecord.collectedCells.push({
              row: t.row,
              col: t.col,
              val: t.cashValue
            });
          }
        }

        cell.cashValue = Math.round((basePay + gatheredSum) * 100) / 100;
        cell.targetAffectedCount = vortexRecord.collectedCells.length;
        vortexRecord.finalValue = cell.cashValue;
        telemetry.vortexActions.push(vortexRecord);
      }
    }
  }

  applyLifeCycleResets(targetGrid, newlyLanded, telemetry) {
    for (const cell of newlyLanded) {
      const lineCells = this.getSameLineCells(targetGrid, cell.row, cell.col);
      for (const existing of lineCells) {
        if (existing !== cell && existing.type !== SymbolType.Blank && existing.type !== SymbolType.CentralWildStar) {
          if (existing.lifeRemaining < 3) {
            telemetry.resets.push({
              row: existing.row,
              col: existing.col,
              prevLife: existing.lifeRemaining,
              newLife: 3
            });
            existing.lifeRemaining = 3;
          }
        }
      }
    }
  }

  evaluateSlingoLines(telemetry, forcedOverrides = {}) {
    let triggeredCenterWild = false;

    for (let lineId = 0; lineId < SLINGO_LINES.length; lineId++) {
      const line = SLINGO_LINES[lineId];
      let lineComplete = true;
      let lineCashSum = 0.0;
      const passesThroughCenter = line.includes(12);

      for (const idx of line) {
        const r = Math.floor(idx / 5);
        const c = idx % 5;
        const cell = this.grid[r][c];

        if (!cell || cell.type === SymbolType.Blank) {
          lineComplete = false;
          break;
        }
        lineCashSum += Number(cell.cashValue) || 0.0;
      }

      if (lineComplete) {
        const linePayoutCents = Math.round(lineCashSum * 100);
        telemetry.totalWinCents += linePayoutCents;

        telemetry.winningLines.push({
          lineId: lineId + 1,
          indices: line,
          lineCashSum: Math.round(lineCashSum * 100) / 100,
          payoutCents: linePayoutCents,
          passesThroughCenter
        });

        if (passesThroughCenter) {
          triggeredCenterWild = true;
        }

        // Mark symbols on winning line as won to be cleared at next spin
        for (const idx of line) {
          const r = Math.floor(idx / 5);
          const c = idx % 5;
          if (r !== 2 || c !== 2) {
            this.grid[r][c].wonThisSpin = true;
          }
        }
      }
    }

    if (forcedOverrides.forceCenterWild) {
      triggeredCenterWild = true;
    }

    // Center Wild Wheel Bonus triggered at most once per spin
    if (triggeredCenterWild) {
      this.executeCenterWildWheelBonus(telemetry);
    }
  }

  executePotWheelBonus(triggeredWheel, telemetry) {
    const weightTable =
      triggeredWheel === 1
        ? this.config.miniWheelWeightTable
        : triggeredWheel === 2
        ? this.config.megaWheelWeightTable
        : this.config.ultraWheelWeightTable;

    const prizeList =
      triggeredWheel === 1
        ? this.config.miniWheelPrizes
        : triggeredWheel === 2
        ? this.config.megaWheelPrizes
        : this.config.ultraWheelPrizes;

    if (!weightTable || !prizeList || prizeList.length === 0) return;

    const prizeIdx = weightTable.sample(this.rng);
    const prize = prizeList[prizeIdx];

    let featureWinCents = 0;
    const affectedCells = [];

    switch (prize.type) {
      case WheelPrizeType.Multiplier: {
        const mult = prize.parameterValue > 0 ? prize.parameterValue : 2.0;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const cell = this.grid[r][c];
            if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.CentralWildStar && cell.type !== SymbolType.JackpotCoin) {
              const prev = cell.cashValue;
              cell.cashValue = Math.round(cell.cashValue * mult * 100) / 100;
              affectedCells.push({ row: r, col: c, prev, newVal: cell.cashValue });
            }
          }
        }
        break;
      }
      case WheelPrizeType.UltraStrike: {
        const strike = prize.parameterValue;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const cell = this.grid[r][c];
            if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.CentralWildStar && cell.type !== SymbolType.JackpotCoin) {
              const prev = cell.cashValue;
              cell.cashValue = Math.round((cell.cashValue + strike) * 100) / 100;
              affectedCells.push({ row: r, col: c, prev, newVal: cell.cashValue });
            }
          }
        }
        break;
      }
      case WheelPrizeType.Jackpot: {
        let jpMult = 5.0;
        if (prize.jackpotType === 'Mega') jpMult = 50.0;
        else if (prize.jackpotType === 'Ultra') jpMult = 500.0;
        featureWinCents = Math.round(jpMult * 100);
        telemetry.totalWinCents += featureWinCents;
        break;
      }
      case WheelPrizeType.InstantCash: {
        const cashMult = prize.parameterValue > 0 ? prize.parameterValue : 1.0;
        featureWinCents = Math.round(cashMult * 100);
        telemetry.totalWinCents += featureWinCents;
        break;
      }
      case WheelPrizeType.LockAndSlingo: {
        telemetry.lockAndSlingoResult = this.playLockAndSlingoBonus();
        telemetry.totalWinCents += telemetry.lockAndSlingoResult.totalBonusWinCents;
        break;
      }
    }

    telemetry.potWheelPrize = {
      potIndex: triggeredWheel,
      prizeIndex: prizeIdx,
      prize,
      featureWinCents,
      affectedCells
    };
  }

  executeCenterWildWheelBonus(telemetry) {
    const weightTable = this.config.centerWheelWeightTable;
    const prizeList = this.config.centerWheelPrizes;

    if (!weightTable || !prizeList || prizeList.length === 0) return;

    const prizeIdx = weightTable.sample(this.rng);
    const prize = prizeList[prizeIdx];
    let prizeWinCents = 0;

    switch (prize.type) {
      case WheelPrizeType.InstantCash: {
        const cashMult = prize.parameterValue > 0 ? prize.parameterValue : 1.0;
        prizeWinCents = Math.round(cashMult * 100);
        telemetry.totalWinCents += prizeWinCents;
        break;
      }
      case WheelPrizeType.Jackpot: {
        let jpMult = 5.0;
        if (prize.jackpotType === 'Mega') jpMult = 50.0;
        else if (prize.jackpotType === 'Ultra') jpMult = 500.0;
        prizeWinCents = Math.round(jpMult * 100);
        telemetry.totalWinCents += prizeWinCents;
        break;
      }
      case WheelPrizeType.LockAndSlingo: {
        telemetry.lockAndSlingoResult = this.playLockAndSlingoBonus();
        telemetry.totalWinCents += telemetry.lockAndSlingoResult.totalBonusWinCents;
        break;
      }
    }

    telemetry.centerWildTriggered = true;
    telemetry.centerWildPrize = {
      prizeIndex: prizeIdx,
      prize,
      prizeWinCents
    };
  }

  /**
   * 5x5 Lock & Slingo Respin Bonus Game
   */
  playLockAndSlingoBonus() {
    // 5x5 grid without central star (starts with 25 empty cells)
    const bonusGrid = [];
    for (let r = 0; r < 5; r++) {
      bonusGrid[r] = [];
      for (let c = 0; c < 5; c++) {
        bonusGrid[r][c] = new GridCell(r, c);
        bonusGrid[r][c].type = SymbolType.Blank;
        bonusGrid[r][c].lifeRemaining = 0;
      }
    }

    let currentLives = 3;
    let bonusSpinsCount = 0;
    const spinRecords = [];

    while (currentLives > 0) {
      const emptyPositions = this.getEmptyPositions(bonusGrid);
      const emptyCount = emptyPositions.length;

      if (emptyCount === 0) break; // Full House

      bonusSpinsCount++;
      const bucket = emptyCount > 20 ? 0 : emptyCount > 15 ? 1 : emptyCount > 10 ? 2 : emptyCount > 5 ? 3 : 4;
      let landingWeight = this.config.bonusLandingWeights[currentLives][bucket];
      if (!landingWeight || landingWeight <= 0) landingWeight = 50;

      const lands = this.rng.next(this.config.bonusBaseFactor) < landingWeight;
      const spinStep = {
        spinIndex: bonusSpinsCount,
        livesBefore: currentLives,
        bucket,
        lands,
        landedItems: [],
        strikeActions: [],
        vortexActions: [],
        livesAfter: 0,
        gridSnapshot: null
      };

      if (lands) {
        currentLives = 3;
        const weightTable = this.config.bonusOutcomeWeightsByBucket[bucket];
        const newlyLandedBonus = [];

        if (weightTable && weightTable.totalWeight > 0) {
          const outcomeIdx = weightTable.sample(this.rng);
          const outcomeDef = this.config.bonusOutcomeDefs[outcomeIdx];

          if (outcomeDef && outcomeDef.items.length > 0) {
            for (const item of outcomeDef.items) {
              for (let i = 0; i < item.count; i++) {
                if (emptyPositions.length === 0) break;
                const posIdx = this.rng.next(emptyPositions.length);
                const pos = emptyPositions.splice(posIdx, 1)[0];
                const cell = bonusGrid[pos.r][pos.c];

                cell.type = item.type;
                cell.justLanded = true;
                cell.lifeRemaining = 999999; // Permanent lock in bonus

                if (item.type === SymbolType.CashCoin) {
                  cell.cashValue = this.sampleBonusCashCoinValue();
                } else if (item.type === SymbolType.JackpotCoin) {
                  const jpIdx = this.config.bonusJackpotWeights.sample(this.rng);
                  const jpDef = this.config.bonusJackpotCoins[jpIdx];
                  cell.jackpotType = jpDef.jackpotName;
                  cell.cashValue = jpDef.multiplier;
                } else if (item.type === SymbolType.MiniStrike) {
                  const strTypeIdx = this.config.bonusCashStrikeTypeWeights.sample(this.rng);
                  cell.type = strTypeIdx === 1 ? SymbolType.MegaStrike : strTypeIdx === 2 ? SymbolType.UltraStrike : SymbolType.MiniStrike;
                  cell.cashValue = this.sampleBonusCashStrikeValue();
                } else if (item.type === SymbolType.MiniVortex) {
                  cell.cashValue = this.config.miniVortexBasePay;
                }

                newlyLandedBonus.push(cell);
                spinStep.landedItems.push({
                  row: pos.r,
                  col: pos.c,
                  type: cell.type,
                  cashValue: cell.cashValue,
                  jackpotType: cell.jackpotType
                });
              }
            }
          }
        }

        // Execute bonus strikes and vortexes
        this.executeSpecialSymbolActions(bonusGrid, newlyLandedBonus, spinStep);
      } else {
        currentLives--;
      }

      spinStep.livesAfter = currentLives;
      spinStep.gridSnapshot = bonusGrid.map(row => row.map(c => c.clone()));
      spinRecords.push(spinStep);
    }

    // Count completed Slingo lines on bonus grid
    let completedSlingos = 0;
    const completedLinesList = [];
    for (let i = 0; i < SLINGO_LINES.length; i++) {
      const line = SLINGO_LINES[i];
      let complete = true;
      for (const idx of line) {
        const r = Math.floor(idx / 5);
        const c = idx % 5;
        if (bonusGrid[r][c].type === SymbolType.Blank) {
          complete = false;
          break;
        }
      }
      if (complete) {
        completedSlingos++;
        completedLinesList.push(i + 1);
      }
    }

    // Calculate base board cash values sum before ladder prize
    let initialBoardCashSum = 0.0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (bonusGrid[r][c].type !== SymbolType.Blank) {
          initialBoardCashSum += bonusGrid[r][c].cashValue;
        }
      }
    }
    const baseBoardWinCents = Math.round(initialBoardCashSum * 100);

    // Highest achieved Slingo Ladder prize
    const eligiblePrizes = this.config.slingoLadderPrizes
      .filter(p => p.slingoCount <= completedSlingos)
      .sort((a, b) => b.slingoCount - a.slingoCount);
    const ladderPrize = eligiblePrizes.length > 0 ? eligiblePrizes[0] : null;

    let bonusDirectJackpotWinCents = 0;
    let ladderMultiplierVal = 0.0;

    if (ladderPrize) {
      ladderMultiplierVal = ladderPrize.parameterValue;
      switch (ladderPrize.type) {
        case WheelPrizeType.MiniStrike: {
          const mOrtho = [[1, 2], [3, 2], [2, 1], [2, 3]];
          for (const [r, c] of mOrtho) {
            const cell = bonusGrid[r][c];
            if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.JackpotCoin) {
              cell.cashValue = Math.round((cell.cashValue + ladderPrize.parameterValue) * 100) / 100;
            }
          }
          break;
        }
        case WheelPrizeType.MegaStrike: {
          for (let c = 0; c < 5; c++) {
            const cell = bonusGrid[2][c];
            if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.JackpotCoin) {
              cell.cashValue = Math.round((cell.cashValue + ladderPrize.parameterValue) * 100) / 100;
            }
          }
          for (let r = 0; r < 5; r++) {
            if (r === 2) continue;
            const cell = bonusGrid[r][2];
            if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.JackpotCoin) {
              cell.cashValue = Math.round((cell.cashValue + ladderPrize.parameterValue) * 100) / 100;
            }
          }
          break;
        }
        case WheelPrizeType.UltraStrike: {
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              const cell = bonusGrid[r][c];
              if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.JackpotCoin) {
                cell.cashValue = Math.round((cell.cashValue + ladderPrize.parameterValue) * 100) / 100;
              }
            }
          }
          break;
        }
        case WheelPrizeType.MiniVortex: {
          const mvOrtho = [[1, 2], [3, 2], [2, 1], [2, 3]];
          let mvSum = this.config.miniVortexBasePay;
          for (const [r, c] of mvOrtho) {
            const cell = bonusGrid[r][c];
            if (cell.type !== SymbolType.Blank) mvSum += cell.cashValue;
          }
          ladderMultiplierVal = Math.round(mvSum * 100) / 100;
          bonusDirectJackpotWinCents += Math.round(mvSum * 100);
          break;
        }
        case WheelPrizeType.MegaVortex: {
          let megaVSum = this.config.megaVortexBasePay;
          for (let c = 0; c < 5; c++) {
            const cell = bonusGrid[2][c];
            if (cell.type !== SymbolType.Blank) megaVSum += cell.cashValue;
          }
          for (let r = 0; r < 5; r++) {
            if (r === 2) continue;
            const cell = bonusGrid[r][2];
            if (cell.type !== SymbolType.Blank) megaVSum += cell.cashValue;
          }
          ladderMultiplierVal = Math.round(megaVSum * 100) / 100;
          bonusDirectJackpotWinCents += Math.round(megaVSum * 100);
          break;
        }
        case WheelPrizeType.UltraVortex: {
          let uvSum = this.config.ultraVortexBasePay;
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              const cell = bonusGrid[r][c];
              if (cell.type !== SymbolType.Blank) uvSum += cell.cashValue;
            }
          }
          ladderMultiplierVal = Math.round(uvSum * 100) / 100;
          bonusDirectJackpotWinCents += Math.round(uvSum * 100);
          break;
        }
        case WheelPrizeType.Multiplier: {
          const mult = ladderPrize.parameterValue > 0 ? ladderPrize.parameterValue : 2.0;
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              const cell = bonusGrid[r][c];
              if (cell.type !== SymbolType.Blank && cell.type !== SymbolType.JackpotCoin) {
                cell.cashValue = Math.round(cell.cashValue * mult * 100) / 100;
              }
            }
          }
          break;
        }
        case WheelPrizeType.Jackpot: {
          let jpVal = 5.0;
          if (ladderPrize.jackpotType === 'Mega') jpVal = 50.0;
          else if (ladderPrize.jackpotType === 'Ultra') jpVal = 500.0;
          ladderMultiplierVal = jpVal;
          bonusDirectJackpotWinCents += Math.round(jpVal * 100);
          break;
        }
      }
    }

    // Final board cash sum
    let finalBoardCashSum = 0.0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (bonusGrid[r][c].type !== SymbolType.Blank) {
          finalBoardCashSum += bonusGrid[r][c].cashValue;
        }
      }
    }

    const boardPayoutCents = Math.round(finalBoardCashSum * 100);
    const totalBonusWinCents = boardPayoutCents + bonusDirectJackpotWinCents;
    const isFullHouse = completedSlingos >= 12;

    return {
      spinsPlayed: bonusSpinsCount,
      completedSlingos,
      completedLinesList,
      ladderPrize,
      ladderMultiplierVal,
      baseBoardWinCents,
      finalBoardCashSum: Math.round(finalBoardCashSum * 100) / 100,
      boardPayoutCents,
      bonusDirectJackpotWinCents,
      totalBonusWinCents,
      isFullHouse,
      spinRecords,
      finalGrid: bonusGrid.map(row => row.map(c => c.clone()))
    };
  }
}
