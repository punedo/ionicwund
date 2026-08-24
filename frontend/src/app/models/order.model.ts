export type OrderType = 'Patientenbezogen' | 'Sammelbestellung';
export type OrderStatus = 'offen' | 'abgeschlossen' | 'storniert';

export interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  orderDate?: string;
  type: OrderType;
  facility: string;
  livingArea?: string;
  patient?: string;
  desiredDeliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt?: string;
}

export interface OrderCreateRequest {
  type: OrderType;
  facility: string;
  livingArea?: string;
  patient?: string;
  desiredDeliveryDate: string;
  status?: OrderStatus;
  items: OrderItem[];
}
