import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, KycSubmission } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-kyc-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kyc-page">
      <div class="page-header">
        <h1>KYC Review Queue</h1>
        <div class="stats">
          <span class="stat pending">Pending: {{ pendingCount() }}</span>
          <span class="stat approved">Approved Today: {{ approvedToday() }}</span>
          <span class="stat rejected">Rejected Today: {{ rejectedToday() }}</span>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="statusFilter" (change)="loadSubmissions()">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      
      <!-- Submissions Grid -->
      <div class="submissions-grid">
        @for (submission of submissions(); track submission.id) {
          <div class="submission-card">
            <div class="card-header">
              <span class="user-email">{{ submission.user?.email || submission.userId }}</span>
              <span class="badge" [class]="'badge-' + submission.status">{{ submission.status }}</span>
            </div>
            
            <div class="card-body">
              <div class="info-row">
                <span class="label">Document Type</span>
                <span>{{ submission.documentType }}</span>
              </div>
              <div class="info-row">
                <span class="label">Submitted</span>
                <span class="mono">{{ submission.submittedAt | date:'medium' }}</span>
              </div>
              
              <!-- Document Preview -->
              <div class="document-preview">
                <div class="doc-placeholder">📄 View Document</div>
              </div>
            </div>
            
            @if (submission.status === 'pending') {
              <div class="card-actions">
                <button class="btn-approve" (click)="approve(submission)">
                  ✓ Approve
                </button>
                <button class="btn-reject" (click)="showRejectModal(submission)">
                  ✗ Reject
                </button>
              </div>
            } @else {
              <div class="review-info">
                <span>Reviewed by {{ submission.reviewedBy }}</span>
                <span class="mono">{{ submission.reviewedAt | date:'medium' }}</span>
                @if (submission.comments) {
                  <p class="comments">{{ submission.comments }}</p>
                }
              </div>
            }
          </div>
        }
      </div>
      
      <!-- Reject Modal -->
      @if (rejectingSubmission()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Reject KYC Submission</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea 
              [(ngModel)]="rejectReason"
              placeholder="Enter rejection reason..."
              rows="4"
            ></textarea>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn-danger" (click)="confirmReject()">Reject</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .kyc-page {
      max-width: 1400px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      h1 { font-size: 24px; }
    }
    
    .stats {
      display: flex;
      gap: 16px;
    }
    
    .stat {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      
      &.pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
      &.approved { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
      &.rejected { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
    }
    
    .filters {
      margin-bottom: 24px;
      
      select {
        padding: 10px 16px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-primary);
      }
    }
    
    .submissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    
    .submission-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .card-header {
      padding: 16px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .user-email { font-weight: 600; }
    }
    
    .card-body {
      padding: 16px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
      
      .label { color: var(--color-text-secondary); }
    }
    
    .document-preview {
      margin-top: 16px;
    }
    
    .doc-placeholder {
      background: var(--color-bg-tertiary);
      border: 1px dashed var(--color-border);
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: var(--color-text-muted);
      cursor: pointer;
      
      &:hover { border-color: var(--color-accent); }
    }
    
    .card-actions {
      padding: 16px;
      border-top: 1px solid var(--color-border);
      display: flex;
      gap: 12px;
      
      button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
      }
      
      .btn-approve {
        background: var(--color-success);
        color: white;
      }
      
      .btn-reject {
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        
        &:hover { background: var(--color-error); color: white; }
      }
    }
    
    .review-info {
      padding: 16px;
      border-top: 1px solid var(--color-border);
      font-size: 12px;
      color: var(--color-text-secondary);
      
      span { display: block; }
      .comments { margin-top: 8px; color: var(--color-text-muted); }
    }
    
    .badge-pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .badge-approved { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-rejected { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      
      h3 { margin-bottom: 8px; }
      p { color: var(--color-text-secondary); margin-bottom: 16px; }
      
      textarea {
        width: 100%;
        padding: 12px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-primary);
        resize: none;
      }
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      justify-content: flex-end;
      
      button { padding: 10px 20px; border-radius: 8px; cursor: pointer; }
      .btn-secondary { background: var(--color-bg-tertiary); border: 1px solid var(--color-border); color: var(--color-text-primary); }
      .btn-danger { background: var(--color-error); border: none; color: white; }
    }
  `],
})
export class KycQueueComponent implements OnInit {
  private api = inject(AdminApiService);
  
  submissions = signal<KycSubmission[]>([]);
  statusFilter = 'pending';
  pendingCount = signal(0);
  approvedToday = signal(0);
  rejectedToday = signal(0);
  
  rejectingSubmission = signal<KycSubmission | null>(null);
  rejectReason = '';
  
  ngOnInit(): void {
    this.loadSubmissions();
  }
  
  loadSubmissions(): void {
    // Mock data
    this.submissions.set([
      { id: 'kyc-001', userId: 'usr-001', user: { email: 'john@example.com' } as any, documentType: 'Passport', status: 'pending', submittedAt: new Date().toISOString() },
      { id: 'kyc-002', userId: 'usr-002', user: { email: 'jane@example.com' } as any, documentType: 'Driver License', status: 'pending', submittedAt: new Date().toISOString() },
      { id: 'kyc-003', userId: 'usr-003', user: { email: 'bob@example.com' } as any, documentType: 'ID Card', status: 'approved', submittedAt: new Date().toISOString(), reviewedBy: 'admin', reviewedAt: new Date().toISOString() },
    ]);
    this.pendingCount.set(2);
    this.approvedToday.set(5);
    this.rejectedToday.set(1);
  }
  
  approve(submission: KycSubmission): void {
    submission.status = 'approved';
    this.pendingCount.update(c => c - 1);
  }
  
  showRejectModal(submission: KycSubmission): void {
    this.rejectingSubmission.set(submission);
  }
  
  closeModal(): void {
    this.rejectingSubmission.set(null);
    this.rejectReason = '';
  }
  
  confirmReject(): void {
    const submission = this.rejectingSubmission();
    if (submission) {
      submission.status = 'rejected';
      submission.comments = this.rejectReason;
      this.pendingCount.update(c => c - 1);
    }
    this.closeModal();
  }
}
