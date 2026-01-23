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
  templateUrl: './trading-chart.component.html',
  styleUrls: ['./trading-chart.component.css'],
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
          width: 1 as any,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1 as any,
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
