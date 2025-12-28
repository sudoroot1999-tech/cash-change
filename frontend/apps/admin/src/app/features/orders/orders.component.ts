import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, Order } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="orders-page">
      <div class="page-header">
        <h1>Order Monitoring</h1>
      </div>
      
      <!-- Filters -->
      <div class="filters">
        <input type="text" placeholder="Search by Order ID, User..." [(ngModel)]="searchQuery" />
        <select [(ngModel)]="symbolFilter" (change)="loadOrders()">
          <option value="">All Pairs</option>
          <option value="BTCUSDT">BTC/USDT</option>
          <option value="ETHUSDT">ETH/USDT</option>
          <option value="ETHBTC">ETH/BTC</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="loadOrders()">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="filled">Filled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      
      <!-- Orders Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User</th>
              <th>Pair</th>
              <th>Side</th>
              <th>Type</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Filled</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
              <tr>
                <td class="mono">{{ order.id }}</td>
                <td class="mono">{{ order.userId }}</td>
                <td>{{ order.symbol }}</td>
                <td [class]="order.side">{{ order.side }}</td>
                <td>{{ order.type }}</td>
                <td class="mono">{{ order.price }}</td>
                <td class="mono">{{ order.quantity }}</td>
                <td class="mono">{{ order.filledQuantity }}</td>
                <td>
                  <span class="badge badge-{{ order.status }}">{{ order.status }}</span>
                </td>
                <td class="mono">{{ order.createdAt | date:'short' }}</td>
                <td>
                  @if (order.status === 'open') {
                    <button class="cancel-btn" (click)="cancelOrder(order)">Cancel</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .orders-page { max-width: 1600px; }
    
    .page-header {
      margin-bottom: 24px;
      h1 { font-size: 24px; }
    }
    
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      
      input, select {
        padding: 10px 16px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-primary);
        
        &:focus { outline: none; border-color: var(--color-accent); }
      }
      
      input { flex: 1; max-width: 400px; }
    }
    
    .table-container {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow-x: auto;
    }
    
    table { width: 100%; border-collapse: collapse; min-width: 1200px; }
    
    th, td { padding: 14px 16px; text-align: left; }
    
    th {
      background: var(--color-bg-tertiary);
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }
    
    td {
      border-top: 1px solid var(--color-border);
      font-size: 13px;
    }
    
    tr:hover td { background: var(--color-bg-tertiary); }
    
    .buy { color: var(--color-success); font-weight: 600; }
    .sell { color: var(--color-error); font-weight: 600; }
    
    .badge-open { background: rgba(59, 130, 246, 0.15); color: var(--color-info); }
    .badge-filled { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-partial { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .badge-cancelled { background: rgba(113, 113, 122, 0.15); color: var(--color-text-muted); }
    
    .cancel-btn {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text-secondary);
      font-size: 12px;
      cursor: pointer;
      
      &:hover { background: var(--color-error); border-color: var(--color-error); color: white; }
    }
  `],
})
export class OrdersComponent implements OnInit {
  private api = inject(AdminApiService);
  
  orders = signal<Order[]>([]);
  searchQuery = '';
  symbolFilter = '';
  statusFilter = '';
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.orders.set([
      { id: 'ord-001', userId: 'usr-001', symbol: 'BTCUSDT', side: 'buy', type: 'limit', status: 'open', price: '45000.00', quantity: '0.5', filledQuantity: '0', createdAt: new Date().toISOString() },
      { id: 'ord-002', userId: 'usr-002', symbol: 'ETHUSDT', side: 'sell', type: 'market', status: 'filled', price: '2500.00', quantity: '2.0', filledQuantity: '2.0', createdAt: new Date().toISOString() },
      { id: 'ord-003', userId: 'usr-001', symbol: 'BTCUSDT', side: 'sell', type: 'limit', status: 'partial', price: '46000.00', quantity: '1.0', filledQuantity: '0.4', createdAt: new Date().toISOString() },
    ]);
  }
  
  cancelOrder(order: Order): void {
    order.status = 'cancelled';
  }
}
