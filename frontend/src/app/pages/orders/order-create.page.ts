import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { OrderCreateRequest, OrderItem, OrderType } from '../../models/order.model';
import { OrderService, ProductOption } from '../../services/order.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AdminShellComponent],
  templateUrl: './order-create.page.html',
  styleUrls: ['./order-create.page.scss'],
})
export class OrderCreatePage implements OnInit {
  order: OrderCreateRequest = {
    type: 'Patientenbezogen',
    facility: '',
    patient: '',
    desiredDeliveryDate: '',
    status: 'offen',
    items: [],
  };

  orderTypes: OrderType[] = ['Patientenbezogen', 'Sammelbestellung'];
  facilities: string[] = [];
  patients: string[] = [];
  products: ProductOption[] = [];
  selectedProduct = '';
  selectedProductUnit = 'Stück';

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private orderService: OrderService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orderService.getFacilities().subscribe((data) => (this.facilities = data));
    this.orderService.getPatients().subscribe((data) => (this.patients = data));
    this.orderService.getProducts().subscribe((data) => (this.products = data));
  }

  onTypeChange(): void {
    if (this.order.type === 'Sammelbestellung') {
      this.order.patient = '';
    }
  }

  onProductChange(): void {
    const product = this.products.find((p) => p.name === this.selectedProduct);
    this.selectedProductUnit = product?.unit ?? 'Stück';
  }

  addItem(): void {
    if (!this.selectedProduct) {
      return;
    }
    const product = this.products.find((p) => p.name === this.selectedProduct);
    this.order.items.push({
      name: this.selectedProduct,
      quantity: 1,
      unit: product?.unit ?? 'Stück',
    });
    this.selectedProduct = '';
    this.selectedProductUnit = 'Stück';
  }

  removeItem(index: number): void {
    this.order.items.splice(index, 1);
  }

  updateQuantity(index: number, value: number): void {
    if (value > 0) {
      this.order.items[index].quantity = value;
    }
  }

  onCancel(): void {
    this.router.navigate(['/orders']);
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!form.valid || this.order.items.length === 0) {
      this.errorMessage = 'Bitte füllen Sie alle Pflichtfelder aus und fügen Sie mindestens ein Produkt hinzu.';
      return;
    }

    this.saving = true;
    this.loadingService.show('Bestellung wird angelegt...');

    this.orderService.createOrder(this.order).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = 'Fehler beim Anlegen der Bestellung. Bitte versuchen Sie es erneut.';
      },
    });
  }
}
