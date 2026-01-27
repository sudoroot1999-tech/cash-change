import { Injectable, signal } from '@angular/core';

export type IndicatorType = 'SMA' | 'EMA' | 'BOLL' | 'RSI' | 'MACD' | 'VOL';

export interface IndicatorConfig {
  type: IndicatorType;
  name: string;
  description: string;
  params: { name: string; default: number }[];
  overlay: boolean; // true = on main chart, false = separate panel
}

export interface ActiveIndicator {
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  visible: boolean;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class IndicatorService {
  // Available indicators
  readonly availableIndicators: IndicatorConfig[] = [
    {
      type: 'SMA',
      name: 'Simple Moving Average',
      description: 'Average price over a specific period',
      params: [{ name: 'period', default: 20 }],
      overlay: true
    },
    {
      type: 'EMA',
      name: 'Exponential Moving Average',
      description: 'Weighted average giving more weight to recent prices',
      params: [{ name: 'period', default: 20 }],
      overlay: true
    },
    {
      type: 'BOLL',
      name: 'Bollinger Bands',
      description: 'Volatility bands above and below a moving average',
      params: [
        { name: 'period', default: 20 },
        { name: 'stdDev', default: 2 }
      ],
      overlay: true
    },
    {
      type: 'RSI',
      name: 'Relative Strength Index',
      description: 'Momentum oscillator measuring speed of price changes',
      params: [{ name: 'period', default: 14 }],
      overlay: false
    },
    {
      type: 'MACD',
      name: 'Moving Average Convergence Divergence',
      description: 'Trend-following momentum indicator',
      params: [
        { name: 'fastPeriod', default: 12 },
        { name: 'slowPeriod', default: 26 },
        { name: 'signalPeriod', default: 9 }
      ],
      overlay: false
    },
    {
      type: 'VOL',
      name: 'Volume',
      description: 'Trading volume histogram',
      params: [],
      overlay: false
    }
  ];

  // Active indicators
  private readonly _activeIndicators = signal<ActiveIndicator[]>([
    // Volume is active by default
    {
      id: 'vol-1',
      type: 'VOL',
      params: {},
      visible: true,
      color: '#6366f1'
    }
  ]);

  readonly activeIndicators = this._activeIndicators.asReadonly();

  // Color palette for indicators
  private colorPalette = [
    '#6366f1', // Indigo
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
  ];
  private colorIndex = 0;

  /**
   * Add a new indicator to the chart
   */
  addIndicator(type: IndicatorType, params?: Record<string, number>): void {
    const config = this.availableIndicators.find(i => i.type === type);
    if (!config) return;

    const defaultParams: Record<string, number> = {};
    config.params.forEach(p => {
      defaultParams[p.name] = params?.[p.name] ?? p.default;
    });

    const newIndicator: ActiveIndicator = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      params: defaultParams,
      visible: true,
      color: this.getNextColor()
    };

    this._activeIndicators.update(indicators => [...indicators, newIndicator]);
  }

  /**
   * Remove an indicator
   */
  removeIndicator(id: string): void {
    this._activeIndicators.update(indicators => 
      indicators.filter(i => i.id !== id)
    );
  }

  /**
   * Toggle indicator visibility
   */
  toggleVisibility(id: string): void {
    this._activeIndicators.update(indicators =>
      indicators.map(i => 
        i.id === id ? { ...i, visible: !i.visible } : i
      )
    );
  }

  /**
   * Update indicator parameters
   */
  updateParams(id: string, params: Record<string, number>): void {
    this._activeIndicators.update(indicators =>
      indicators.map(i =>
        i.id === id ? { ...i, params: { ...i.params, ...params } } : i
      )
    );
  }

  /**
   * Calculate SMA
   */
  calculateSMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    
    return result;
  }

  /**
   * Calculate EMA
   */
  calculateEMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        result.push(ema);
      } else {
        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
      }
    }
    
    return result;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(
    data: number[], 
    period: number, 
    stdDev: number
  ): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const middle = this.calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1 || middle[i] === null) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = middle[i]!;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Calculate RSI
   */
  calculateRSI(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    result.push(null); // First value has no RSI

    for (let i = 0; i < gains.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) {
          result.push(100);
        } else {
          const rs = avgGain / avgLoss;
          result.push(100 - (100 / (1 + rs)));
        }
      }
    }

    return result;
  }

  /**
   * Calculate MACD
   */
  calculateMACD(
    data: number[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    const macd: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEMA[i] === null || slowEMA[i] === null) {
        macd.push(null);
      } else {
        macd.push(fastEMA[i]! - slowEMA[i]!);
      }
    }

    // Calculate signal line (EMA of MACD)
    const macdValues = macd.filter(v => v !== null) as number[];
    const signalEMA = this.calculateEMA(macdValues, signalPeriod);
    
    const signal: (number | null)[] = [];
    const histogram: (number | null)[] = [];
    let signalIndex = 0;

    for (let i = 0; i < macd.length; i++) {
      if (macd[i] === null) {
        signal.push(null);
        histogram.push(null);
      } else {
        const signalValue = signalEMA[signalIndex] ?? null;
        signal.push(signalValue);
        histogram.push(signalValue !== null ? macd[i]! - signalValue : null);
        signalIndex++;
      }
    }

    return { macd, signal, histogram };
  }

  private getNextColor(): string {
    const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
    this.colorIndex++;
    return color;
  }
}
