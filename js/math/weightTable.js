/**
 * Cumulative discrete weight table for fast weighted random sampling.
 * Matches SlotFramework.Utilities.WeightTable.
 */
export class WeightTable {
  constructor(weights = []) {
    this._cumulative = [];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      this._cumulative.push(sum);
    }
    this.totalWeight = sum;
  }

  get length() {
    return this._cumulative.length;
  }

  sample(rng) {
    if (this.totalWeight <= 0 || this._cumulative.length === 0) return 0;
    const r = rng.next(this.totalWeight);
    for (let i = 0; i < this._cumulative.length; i++) {
      if (r < this._cumulative[i]) return i;
    }
    return 0;
  }
}
