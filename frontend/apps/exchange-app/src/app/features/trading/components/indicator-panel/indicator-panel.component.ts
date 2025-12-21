import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicatorService, IndicatorType, IndicatorConfig, ActiveIndicator } from '../../services/indicator.service';

@Component({
  selector: 'app-indicator-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="indicator-panel" [class.open]="isOpen()">
      <!-- Panel Header -->
      <div class="panel-header">
        <h3 class="panel-title">Indicators</h3>
        <button class="close-btn" (click)="close.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Active Indicators -->
      <div class="section">
        <h4 class="section-title">Active</h4>
        @if (indicatorService.activeIndicators().length === 0) {
          <p class="empty-state">No indicators active</p>
        } @else {
          <div class="active-list">
            @for (indicator of indicatorService.activeIndicators(); track indicator.id) {
              <div class="active-item">
                <div class="indicator-color" [style.background-color]="indicator.color"></div>
                <div class="indicator-info">
                  <span class="indicator-name">{{ getIndicatorName(indicator.type) }}</span>
                  <span class="indicator-params">{{ formatParams(indicator) }}</span>
                </div>
                <div class="indicator-actions">
                  <button 
                    class="action-btn"
                    [class.hidden]="!indicator.visible"
                    (click)="indicatorService.toggleVisibility(indicator.id)"
                    title="Toggle visibility"
                  >
                    @if (indicator.visible) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    }
                  </button>
                  <button 
                    class="action-btn settings"
                    (click)="openSettings(indicator)"
                    title="Settings"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>
                  <button 
                    class="action-btn remove"
                    (click)="indicatorService.removeIndicator(indicator.id)"
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Available Indicators -->
      <div class="section">
        <h4 class="section-title">Add Indicator</h4>
        <div class="indicator-grid">
          @for (indicator of indicatorService.availableIndicators; track indicator.type) {
            <button 
              class="indicator-card"
              (click)="addIndicator(indicator.type)"
            >
              <div class="indicator-icon">
                {{ getIndicatorIcon(indicator.type) }}
              </div>
              <div class="indicator-details">
                <span class="card-name">{{ indicator.name }}</span>
                <span class="card-desc">{{ indicator.description }}</span>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- Settings Dialog -->
      @if (editingIndicator()) {
        <div class="settings-overlay" (click)="closeSettings()">
          <div class="settings-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h4>{{ getIndicatorName(editingIndicator()!.type) }} Settings</h4>
              <button class="close-btn" (click)="closeSettings()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="dialog-content">
              @for (param of getIndicatorConfig(editingIndicator()!.type)?.params; track param.name) {
                <div class="param-row">
                  <label class="param-label">{{ param.name }}</label>
                  <input 
                    type="number"
                    class="param-input"
                    [ngModel]="editingParams()[param.name]"
                    (ngModelChange)="updateEditingParam(param.name, $event)"
                  />
                </div>
              }
            </div>
            <div class="dialog-footer">
              <button class="btn-secondary" (click)="closeSettings()">Cancel</button>
              <button class="btn-primary" (click)="saveSettings()">Apply</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .indicator-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      height: 100%;
      background: var(--color-bg-elevated);
      border-left: 1px solid var(--color-border-primary);
      z-index: 100;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform var(--transition-base);
    }

    .indicator-panel.open {
      transform: translateX(0);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-3) var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .panel-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
    }

    .close-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--color-text-tertiary);
      cursor: pointer;
    }

    .close-btn:hover {
      color: var(--color-text-primary);
    }

    .close-btn svg {
      width: 16px;
      height: 16px;
    }

    .section {
      padding: var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .section-title {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 var(--spacing-3) 0;
    }

    .empty-state {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .active-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .active-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2);
      background: var(--color-bg-card);
      border-radius: var(--radius-md);
    }

    .indicator-color {
      width: 4px;
      height: 32px;
      border-radius: 2px;
    }

    .indicator-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .indicator-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .indicator-params {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .indicator-actions {
      display: flex;
      gap: var(--spacing-1);
    }

    .action-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--color-text-tertiary);
      cursor: pointer;
      border-radius: var(--radius-sm);
    }

    .action-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }

    .action-btn.hidden {
      color: var(--color-text-muted);
    }

    .action-btn.remove:hover {
      color: var(--color-danger);
      background: var(--color-danger-soft);
    }

    .action-btn svg {
      width: 14px;
      height: 14px;
    }

    .indicator-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .indicator-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      padding: var(--spacing-3);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all var(--transition-fast);
    }

    .indicator-card:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-border-secondary);
    }

    .indicator-icon {
      font-size: var(--font-size-xl);
    }

    .indicator-details {
      display: flex;
      flex-direction: column;
    }

    .card-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .card-desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .settings-dialog {
      width: 300px;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-3) var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .dialog-header h4 {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
    }

    .dialog-content {
      padding: var(--spacing-4);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
    }

    .param-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .param-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      text-transform: capitalize;
    }

    .param-input {
      width: 80px;
      padding: var(--spacing-2);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-md);
      text-align: center;
    }

    .param-input:focus {
      outline: none;
      border-color: var(--color-accent-500);
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-2);
      padding: var(--spacing-3) var(--spacing-4);
      border-top: 1px solid var(--color-border-primary);
    }

    .btn-secondary {
      padding: var(--spacing-2) var(--spacing-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .btn-primary {
      padding: var(--spacing-2) var(--spacing-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: white;
      background: var(--gradient-primary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
  `],
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
