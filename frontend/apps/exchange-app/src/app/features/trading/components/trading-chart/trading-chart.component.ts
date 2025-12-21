import { 
  Component, 
  ChangeDetectionStrategy, 
  ElementRef, 
  ViewChild, 
  AfterViewInit, 
  OnDestroy,
  input,
  effect,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  CandlestickData,
  Time,
  ColorType,
  CrosshairMode
} from 'lightweight-charts';

export interface OHLCData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

@Component({
  selector: 'app-trading-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrapper">
      <!-- Chart Toolbar -->
      <div class="chart-toolbar">
        <div class="timeframe-selector">
          @for (tf of timeframes; track tf.value) {
            <button 
              class="timeframe-btn" 
              [class.active]="selectedTimeframe() === tf.value"
              (click)="onTimeframeChange(tf.value)"
            >
              {{ tf.label }}
            </button>
          }
        </div>
        
        <div class="chart-type-selector">
          <button 
            class="chart-type-btn"
            [class.active]="chartType() === 'candlestick'"
            (click)="setChartType('candlestick')"
            title="Candlestick"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="2" width="6" height="20" rx="1"/>
              <line x1="12" y1="6" x2="12" y2="18"/>
            </svg>
          </button>
          <button 
            class="chart-type-btn"
            [class.active]="chartType() === 'line'"
            (click)="setChartType('line')"
            title="Line"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4,18 8,12 12,15 16,8 20,12"/>
            </svg>
          </button>
          <button 
            class="chart-type-btn"
            [class.active]="chartType() === 'area'"
            (click)="setChartType('area')"
            title="Area"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4,18 L8,12 L12,15 L16,8 L20,12 L20,20 L4,20 Z" fill="currentColor" opacity="0.2"/>
              <polyline points="4,18 8,12 12,15 16,8 20,12"/>
            </svg>
          </button>
        </div>

        <div class="chart-tools">
          <button class="tool-btn" (click)="toggleIndicators()">
            📊 Indicators
          </button>
          <button class="tool-btn" (click)="resetZoom()">
            🔍 Reset
          </button>
        </div>
      </div>

      <!-- Chart Container -->
      <div #chartContainer class="chart-container"></div>

      <!-- Volume Chart -->
      <div #volumeContainer class="volume-container"></div>

      <!-- Price Crosshair Info -->
      @if (crosshairData()) {
        <div class="crosshair-info">
          <span class="info-label">O:</span>
          <span class="info-value">{{ crosshairData()!.open | number:'1.2-2' }}</span>
          <span class="info-label">H:</span>
          <span class="info-value">{{ crosshairData()!.high | number:'1.2-2' }}</span>
          <span class="info-label">L:</span>
          <span class="info-value">{{ crosshairData()!.low | number:'1.2-2' }}</span>
          <span class="info-label">C:</span>
          <span class="info-value" [class.positive]="crosshairData()!.close >= crosshairData()!.open" [class.negative]="crosshairData()!.close < crosshairData()!.open">
            {{ crosshairData()!.close | number:'1.2-2' }}
          </span>
        </div>
      }

      <!-- TradingView Attribution -->
      <div class="tv-attribution">
        Powered by <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView</a>
      </div>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--color-bg-secondary);
      position: relative;
    }

    .chart-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-2) var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
      flex-wrap: wrap;
      gap: var(--spacing-2);
    }

    .timeframe-selector {
      display: flex;
      gap: 2px;
      background: var(--color-bg-card);
      padding: 2px;
      border-radius: var(--radius-md);
    }

    .timeframe-btn {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .timeframe-btn:hover {
      color: var(--color-text-secondary);
    }

    .timeframe-btn.active {
      color: var(--color-text-primary);
      background: var(--color-bg-elevated);
    }

    .chart-type-selector {
      display: flex;
      gap: 2px;
      background: var(--color-bg-card);
      padding: 2px;
      border-radius: var(--radius-md);
    }

    .chart-type-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .chart-type-btn:hover {
      color: var(--color-text-secondary);
    }

    .chart-type-btn.active {
      color: var(--color-accent-400);
      background: var(--color-bg-elevated);
    }

    .chart-type-btn svg {
      width: 16px;
      height: 16px;
    }

    .chart-tools {
      display: flex;
      gap: var(--spacing-2);
    }

    .tool-btn {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .tool-btn:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-border-secondary);
    }

    .chart-container {
      flex: 1;
      min-height: 300px;
    }

    .volume-container {
      height: 80px;
      border-top: 1px solid var(--color-border-primary);
    }

    .crosshair-info {
      position: absolute;
      top: 52px;
      left: var(--spacing-3);
      display: flex;
      gap: var(--spacing-2);
      font-size: var(--font-size-xs);
      font-family: var(--font-family-mono);
      z-index: 10;
    }

    .info-label {
      color: var(--color-text-tertiary);
    }

    .info-value {
      color: var(--color-text-primary);
    }

    .info-value.positive {
      color: var(--color-success);
    }

    .info-value.negative {
      color: var(--color-danger);
    }

    .tv-attribution {
      position: absolute;
      bottom: 90px;
      right: var(--spacing-3);
      font-size: 10px;
      color: var(--color-text-muted);
      z-index: 10;
    }

    .tv-attribution a {
      color: var(--color-accent-400);
      text-decoration: none;
    }

    .tv-attribution a:hover {
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer') volumeContainer!: ElementRef<HTMLDivElement>;

  // Inputs
  symbol = input<string>('BTCUSDT');
  data = input<OHLCData[]>([]);

  // State
  selectedTimeframe = signal('1H');
  chartType = signal<'candlestick' | 'line' | 'area'>('candlestick');
  crosshairData = signal<OHLCData | null>(null);

  // Chart references
  private chart: IChartApi | null = null;
  private volumeChart: IChartApi | null = null;
  private mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null = null;
  private volumeSeries: ISeriesApi<'Histogram'> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1H', label: '1H' },
    { value: '4H', label: '4H' },
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
  ];

  constructor() {
    // React to data changes
    effect(() => {
      const newData = this.data();
      if (newData.length > 0 && this.mainSeries) {
        this.updateChartData(newData);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeChart();
    this.setupResizeObserver();
    
    // Load initial mock data
    if (this.data().length === 0) {
      this.loadMockData();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.remove();
    this.volumeChart?.remove();
  }

  private initializeChart(): void {
    const container = this.chartContainer.nativeElement;
    const volumeContainer = this.volumeContainer.nativeElement;

    // Main chart configuration
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    };

    // Create main chart
    this.chart = createChart(container, {
      ...chartOptions,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    // Create volume chart
    this.volumeChart = createChart(volumeContainer, {
      ...chartOptions,
      width: volumeContainer.clientWidth,
      height: volumeContainer.clientHeight,
      rightPriceScale: {
        ...chartOptions.rightPriceScale,
        scaleMargins: { top: 0.1, bottom: 0 },
      },
      timeScale: {
        visible: false,
      },
    });

    // Initialize series
    this.createSeries();

    // Sync time scales
    this.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        this.volumeChart?.timeScale().setVisibleLogicalRange(range);
      }
    });

    // Subscribe to crosshair move
    this.chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const data = param.seriesData.get(this.mainSeries!) as CandlestickData<Time>;
        if (data && 'open' in data) {
          this.crosshairData.set({
            time: data.time as string,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
          });
        }
      }
    });
  }

  private createSeries(): void {
    if (!this.chart || !this.volumeChart) return;

    // Remove existing series
    if (this.mainSeries) {
      this.chart.removeSeries(this.mainSeries);
    }

    // Create main series based on chart type
    switch (this.chartType()) {
      case 'candlestick':
        this.mainSeries = this.chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
        break;
      case 'line':
        this.mainSeries = this.chart.addLineSeries({
          color: '#6366f1',
          lineWidth: 2,
        });
        break;
      case 'area':
        this.mainSeries = this.chart.addAreaSeries({
          topColor: 'rgba(99, 102, 241, 0.4)',
          bottomColor: 'rgba(99, 102, 241, 0.0)',
          lineColor: '#6366f1',
          lineWidth: 2,
        });
        break;
    }

    // Create volume series
    if (!this.volumeSeries) {
      this.volumeSeries = this.volumeChart.addHistogramSeries({
        color: '#6366f1',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
    }
  }

  private updateChartData(data: OHLCData[]): void {
    if (!this.mainSeries || !this.volumeSeries) return;

    const candleData = data.map(d => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = data.map(d => ({
      time: d.time as Time,
      value: d.volume || 0,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));

    if (this.chartType() === 'candlestick') {
      (this.mainSeries as ISeriesApi<'Candlestick'>).setData(candleData);
    } else {
      const lineData = data.map(d => ({
        time: d.time as Time,
        value: d.close,
      }));
      (this.mainSeries as ISeriesApi<'Line'> | ISeriesApi<'Area'>).setData(lineData);
    }

    this.volumeSeries.setData(volumeData);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      const container = this.chartContainer.nativeElement;
      const volumeContainer = this.volumeContainer.nativeElement;
      
      this.chart?.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });

      this.volumeChart?.applyOptions({
        width: volumeContainer.clientWidth,
        height: volumeContainer.clientHeight,
      });
    });

    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  setChartType(type: 'candlestick' | 'line' | 'area'): void {
    this.chartType.set(type);
    this.createSeries();
    
    // Re-apply data
    const currentData = this.data();
    if (currentData.length > 0) {
      this.updateChartData(currentData);
    } else {
      this.loadMockData();
    }
  }

  onTimeframeChange(timeframe: string): void {
    this.selectedTimeframe.set(timeframe);
    // In a real app, this would fetch new data from the API
    console.log('Timeframe changed to:', timeframe);
  }

  toggleIndicators(): void {
    // Future: Open indicators panel
    console.log('Toggle indicators');
  }

  resetZoom(): void {
    this.chart?.timeScale().resetTimeScale();
    this.volumeChart?.timeScale().resetTimeScale();
  }

  private loadMockData(): void {
    // Generate mock OHLC data
    const now = new Date();
    const data: OHLCData[] = [];
    let price = 43000;

    for (let i = 200; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      const change = (Math.random() - 0.5) * 500;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 200;
      const low = Math.min(open, close) - Math.random() * 200;
      const volume = Math.random() * 1000 + 500;

      data.push({
        time: Math.floor(date.getTime() / 1000),
        open,
        high,
        low,
        close,
        volume,
      });

      price = close;
    }

    this.updateChartData(data);
    this.chart?.timeScale().fitContent();
  }
}
