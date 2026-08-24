import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { DataTableComponent, TableColumn, TableHeaderAction, TableRowAction } from '../../components/data-table/data-table.component';
import { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DataTableComponent],
  templateUrl: './orders-list.page.html',
  styleUrls: ['./orders-list.page.scss'],
})
export class OrdersListPage implements OnInit {
  orders: Order[] = [];
  loading = false;

  columns: TableColumn<Order>[] = [
    { key: 'orderNumber', label: 'BESTELLNR.', sortable: true, width: '100px' },
    { key: 'orderDate', label: 'BESTELLDATUM', sortable: true, width: '110px', format: (o) => o.orderDate ? this.formatDate(o.orderDate) : '—' },
    { key: 'facility', label: 'EINRICHTUNG', sortable: true, width: '160px', type: 'multiline', format: (o) => this.formatFacility(o) },
    { key: 'patient', label: 'PATIENT', sortable: true, width: '150px', format: (o) => o.patient ?? '—' },
    { key: 'desiredDeliveryDate', label: 'WUNSCHTERMIN', sortable: true, width: '120px', format: (o) => this.formatDate(o.desiredDeliveryDate) },
    { key: 'type', label: 'TYP', sortable: true, width: '140px' },
    { key: 'status', label: 'STATUS', sortable: true, width: '120px', type: 'badge', cssClass: (o) => `status-${(o.status ?? '').toLowerCase()}` },
  ];

  headerActions: TableHeaderAction[] = [
    { label: 'Exportieren', icon: 'download-outline', cssClass: 'secondary' },
    { label: 'Bestellung erstellen', icon: 'add-outline', cssClass: 'primary', onClick: () => this.router.navigate(['/orders/create']) },
  ];

  rowActions: TableRowAction<Order>[] = [
    { label: 'Details', icon: 'eye-outline', onClick: (o) => console.log('Details', o) },
  ];

  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: () => {
        this.orders = [];
        this.loading = false;
      },
    });
  }

  formatFacility(order: Order): string[] {
    const lines = [order.facility];
    if (order.livingArea) {
      lines.push(order.livingArea);
    }
    return lines;
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return '—';
    }
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}`;
  }
}
