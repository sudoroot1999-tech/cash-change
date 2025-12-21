import { Component, ChangeDetectionStrategy, input, output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

type InputType = 'text' | 'email' | 'password' | 'number' | 'search';
type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="input-wrapper">
      @if (label()) {
        <label [for]="inputId" class="input-label">{{ label() }}</label>
      }
      
      <div class="input-container" [class.has-prefix]="!!prefix()" [class.has-suffix]="!!suffix()">
        @if (prefix()) {
          <span class="input-prefix">{{ prefix() }}</span>
        }
        
        <input
          [id]="inputId"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [class]="inputClasses()"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onBlur()"
        />
        
        @if (suffix()) {
          <span class="input-suffix">{{ suffix() }}</span>
        }
      </div>
      
      @if (hint() && !error()) {
        <span class="input-hint">{{ hint() }}</span>
      }
      
      @if (error()) {
        <span class="input-error">{{ error() }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-1);
    }
    
    .input-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }
    
    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .input-prefix,
    .input-suffix {
      position: absolute;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      pointer-events: none;
    }
    
    .input-prefix {
      left: var(--spacing-3);
    }
    
    .input-suffix {
      right: var(--spacing-3);
    }
    
    .input-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
    
    .input-error {
      font-size: var(--font-size-xs);
      color: var(--color-danger);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent implements ControlValueAccessor {
  type = input<InputType>('text');
  size = input<InputSize>('md');
  label = input<string>('');
  placeholder = input<string>('');
  hint = input<string>('');
  error = input<string>('');
  prefix = input<string>('');
  suffix = input<string>('');
  disabled = input(false);
  readonly = input(false);

  inputChange = output<string>();

  value = '';
  inputId = `input-${Math.random().toString(36).substr(2, 9)}`;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  inputClasses(): string {
    const base = 'w-full bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20';
    
    const sizes: Record<InputSize, string> = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-4 py-3 text-base'
    };

    const prefixPadding = this.prefix() ? 'pl-10' : '';
    const suffixPadding = this.suffix() ? 'pr-10' : '';
    const errorStyle = this.error() ? 'border-danger focus:border-danger focus:ring-danger/20' : '';

    return `${base} ${sizes[this.size()]} ${prefixPadding} ${suffixPadding} ${errorStyle}`;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
    this.inputChange.emit(value);
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled by input signal
  }
}
