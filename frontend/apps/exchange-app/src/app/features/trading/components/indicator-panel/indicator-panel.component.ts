import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicatorService, IndicatorType, IndicatorConfig, ActiveIndicator } from '../../services/indicator.service';

@Component({
  selector: 'app-indicator-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './indicator-panel.component.html',
  styleUrls: ['./indicator-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorPanelComponent {
  readonly indicatorService = inject(IndicatorService);

  isOpen = signal(true);
  editingIndicator = signal<ActiveIndicator | null>(null);
  editingParams = signal<Record<string, number>>({});

  close = output<void>();

  getIndicatorName(type: IndicatorType): string {
    const names: Record<IndicatorType, string> = {
      SMA: 'SMA',
      EMA: 'EMA',
      BOLL: 'Bollinger Bands',
      RSI: 'RSI',
      MACD: 'MACD',
      VOL: 'Volume'
    };
    return names[type];
  }

  getIndicatorIcon(type: IndicatorType): string {
    const icons: Record<IndicatorType, string> = {
      SMA: '📈',
      EMA: '📉',
      BOLL: '📊',
      RSI: '⚖️',
      MACD: '📶',
      VOL: '📊'
    };
    return icons[type];
  }

  getIndicatorConfig(type: IndicatorType): IndicatorConfig | undefined {
    return this.indicatorService.availableIndicators.find(i => i.type === type);
  }

  formatParams(indicator: ActiveIndicator): string {
    const params = Object.entries(indicator.params);
    if (params.length === 0) return '';
    return params.map(([k, v]) => `${k}: ${v}`).join(', ');
  }

  addIndicator(type: IndicatorType): void {
    this.indicatorService.addIndicator(type);
  }

  openSettings(indicator: ActiveIndicator): void {
    this.editingIndicator.set(indicator);
    this.editingParams.set({ ...indicator.params });
  }

  closeSettings(): void {
    this.editingIndicator.set(null);
    this.editingParams.set({});
  }

  updateEditingParam(name: string, value: number): void {
    this.editingParams.update(params => ({ ...params, [name]: value }));
  }

  saveSettings(): void {
    const indicator = this.editingIndicator();
    if (indicator) {
      this.indicatorService.updateParams(indicator.id, this.editingParams());
    }
    this.closeSettings();
  }
}
