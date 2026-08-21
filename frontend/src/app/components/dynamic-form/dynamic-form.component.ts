import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonIcon } from '@ionic/angular';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'tel' | 'email';
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  width?: 'full' | 'half';
  hint?: string;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface FormConfig {
  sections: FormSection[];
  submitLabel: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss'],
})
export class DynamicFormComponent {
  @Input() config!: FormConfig;
  @Input() model: Record<string, any> = {};
  @Input() saving = false;
  @Input() errorMessage = '';
  @Input() submitted = false;

  @Output() formSubmit = new EventEmitter<Record<string, any>>();
  @Output() formCancel = new EventEmitter<void>();

  onSubmit(form: NgForm): void {
    this.formSubmit.emit({ ...this.model, ...form.value });
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  isRequired(field: FormField): boolean {
    return !!field.required;
  }

  getFieldWidth(field: FormField): string {
    return field.width === 'full' ? 'full' : 'half';
  }
}
