import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService, User, PaginatedResponse } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="users-page">
      <div class="page-header">
        <h1>User Management</h1>
        <button class="btn-primary">Add User</button>
      </div>
      
      <!-- Filters -->
      <div class="filters">
        <input 
          type="text" 
          placeholder="Search by email, username..."
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
        />
        <select [(ngModel)]="statusFilter" (change)="loadUsers()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>
      
      <!-- Users Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>KYC Level</th>
              <th>Tier</th>
              <th>Registered</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ user.email[0].toUpperCase() }}</div>
                    <div class="user-info">
                      <span class="email">{{ user.email }}</span>
                      <span class="id mono">{{ user.id }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" [class]="'badge-' + user.status">
                    {{ user.status }}
                  </span>
                </td>
                <td>
                  <span class="kyc-level">Level {{ user.kycLevel }}</span>
                </td>
                <td>{{ user.tier }}</td>
                <td class="mono">{{ user.createdAt | date:'shortDate' }}</td>
                <td class="mono">{{ user.lastLoginAt | date:'short' }}</td>
                <td>
                  <div class="actions">
                    <a [routerLink]="['/users', user.id]" class="action-link">View</a>
                    <button class="action-btn" (click)="toggleStatus(user)">
                      {{ user.status === 'active' ? 'Suspend' : 'Activate' }}
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="pagination">
        <span>Showing {{ users().length }} of {{ totalUsers() }}</span>
        <div class="pagination-controls">
          <button [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">
            Previous
          </button>
          <span>Page {{ currentPage() }}</span>
          <button [disabled]="currentPage() * 20 >= totalUsers()" (click)="goToPage(currentPage() + 1)">
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-page {
      max-width: 1400px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      h1 {
        font-size: 24px;
      }
    }
    
    .btn-primary {
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      cursor: pointer;
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
        font-size: 14px;
        
        &:focus {
          outline: none;
          border-color: var(--color-accent);
        }
      }
      
      input {
        flex: 1;
        max-width: 400px;
      }
    }
    
    .table-container {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 14px 16px;
      text-align: left;
    }
    
    th {
      background: var(--color-bg-tertiary);
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }
    
    td {
      border-top: 1px solid var(--color-border);
      font-size: 14px;
    }
    
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
    
    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
    }
    
    .email {
      font-weight: 500;
    }
    
    .id {
      font-size: 12px;
      color: var(--color-text-muted);
    }
    
    .badge-active { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-suspended { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .badge-banned { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
    
    .kyc-level {
      padding: 4px 8px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      font-size: 12px;
    }
    
    .actions {
      display: flex;
      gap: 12px;
    }
    
    .action-link {
      color: var(--color-accent);
      font-size: 13px;
    }
    
    .action-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      font-size: 13px;
      cursor: pointer;
      
      &:hover {
        color: var(--color-warning);
      }
    }
    
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      font-size: 14px;
      color: var(--color-text-secondary);
    }
    
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      
      button {
        padding: 8px 16px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        color: var(--color-text-primary);
        cursor: pointer;
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        &:hover:not(:disabled) {
          border-color: var(--color-accent);
        }
      }
    }
  `],
})
export class UsersListComponent implements OnInit {
  private api = inject(AdminApiService);
  
  users = signal<User[]>([]);
  totalUsers = signal(0);
  currentPage = signal(1);
  searchQuery = '';
  statusFilter = '';
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  loadUsers(): void {
    // Mock data
    this.users.set([
      { id: 'usr-001', email: 'john@example.com', status: 'active', kycLevel: 2, tier: 'VIP', createdAt: '2024-01-15', lastLoginAt: '2024-12-28' },
      { id: 'usr-002', email: 'jane@example.com', status: 'active', kycLevel: 1, tier: 'Standard', createdAt: '2024-02-20', lastLoginAt: '2024-12-27' },
      { id: 'usr-003', email: 'bob@example.com', status: 'suspended', kycLevel: 0, tier: 'Standard', createdAt: '2024-03-10' },
      { id: 'usr-004', email: 'alice@example.com', status: 'active', kycLevel: 3, tier: 'Enterprise', createdAt: '2024-01-05', lastLoginAt: '2024-12-28' },
    ]);
    this.totalUsers.set(4);
  }
  
  onSearch(): void {
    // Debounced search
    this.loadUsers();
  }
  
  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }
  
  toggleStatus(user: User): void {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    // this.api.updateUserStatus(user.id, newStatus).subscribe();
    user.status = newStatus as any;
  }
}
