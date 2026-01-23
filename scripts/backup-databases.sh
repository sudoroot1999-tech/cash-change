#!/bin/bash

###############################################################################
# Database Backup Script
# Description: Automated backup script for PostgreSQL and MongoDB
# Usage: ./backup-databases.sh [environment]
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENVIRONMENT="${1:-production}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-crypto-exchange-backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check required commands
check_requirements() {
    local missing_cmds=()
    
    for cmd in pg_dump mongodump aws kubectl; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_cmds+=("$cmd")
        fi
    done
    
    if [ ${#missing_cmds[@]} -ne 0 ]; then
        log_error "Missing required commands: ${missing_cmds[*]}"
        exit 1
    fi
}

# Create backup directory
create_backup_dir() {
    local backup_path="$BACKUP_DIR/$ENVIRONMENT/$TIMESTAMP"
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Backup PostgreSQL databases
backup_postgresql() {
    log_info "Starting PostgreSQL backup..."
    
    local backup_path="$1"
    local namespace="${ENVIRONMENT}"
    
    # Get PostgreSQL pod
    local pg_pod=$(kubectl get pods -n "$namespace" -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$pg_pod" ]; then
        log_error "PostgreSQL pod not found"
        return 1
    fi
    
    # Get database credentials from secret
    local pg_password=$(kubectl get secret -n "$namespace" postgresql-secret -o jsonpath='{.data.postgres-password}' | base64 -d)
    
    # List of databases to backup
    local databases=("auth_db" "user_db" "wallet_db" "trading_db" "market_data_db" "notification_db" "kyc_db" "admin_db" "analytics_db" "gamification_db" "referral_db" "launchpad_db")
    
    for db in "${databases[@]}"; do
        log_info "Backing up database: $db"
        
        kubectl exec -n "$namespace" "$pg_pod" -- bash -c "PGPASSWORD='$pg_password' pg_dump -U postgres -Fc $db" > "$backup_path/${db}_${TIMESTAMP}.dump"
        
        if [ $? -eq 0 ]; then
            log_info "Successfully backed up $db"
            
            # Compress backup
            gzip "$backup_path/${db}_${TIMESTAMP}.dump"
        else
            log_error "Failed to backup $db"
        fi
    done
}

# Backup MongoDB databases
backup_mongodb() {
    log_info "Starting MongoDB backup..."
    
    local backup_path="$1"
    local namespace="${ENVIRONMENT}"
    
    # Get MongoDB pod
    local mongo_pod=$(kubectl get pods -n "$namespace" -l app.kubernetes.io/name=mongodb -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$mongo_pod" ]; then
        log_error "MongoDB pod not found"
        return 1
    fi
    
    # Get MongoDB credentials from secret
    local mongo_password=$(kubectl get secret -n "$namespace" mongodb-secret -o jsonpath='{.data.mongodb-root-password}' | base64 -d)
    
    log_info "Creating MongoDB backup"
    
    kubectl exec -n "$namespace" "$mongo_pod" -- bash -c "mongodump --username root --password '$mongo_password' --authenticationDatabase admin --gzip --archive" > "$backup_path/mongodb_${TIMESTAMP}.archive.gz"
    
    if [ $? -eq 0 ]; then
        log_info "Successfully backed up MongoDB"
    else
        log_error "Failed to backup MongoDB"
    fi
}

# Backup Redis snapshot
backup_redis() {
    log_info "Starting Redis backup..."
    
    local backup_path="$1"
    local namespace="${ENVIRONMENT}"
    
    # Get Redis pod
    local redis_pod=$(kubectl get pods -n "$namespace" -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$redis_pod" ]; then
        log_error "Redis pod not found"
        return 1
    fi
    
    # Trigger Redis save
    kubectl exec -n "$namespace" "$redis_pod" -- redis-cli BGSAVE
    
    # Wait for save to complete
    sleep 5
    
    # Copy RDB file
    kubectl cp "$namespace/$redis_pod:/data/dump.rdb" "$backup_path/redis_${TIMESTAMP}.rdb"
    
    if [ $? -eq 0 ]; then
        log_info "Successfully backed up Redis"
        gzip "$backup_path/redis_${TIMESTAMP}.rdb"
    else
        log_error "Failed to backup Redis"
    fi
}

# Upload to S3
upload_to_s3() {
    log_info "Uploading backups to S3..."
    
    local backup_path="$1"
    local s3_path="s3://$S3_BUCKET/$ENVIRONMENT/$TIMESTAMP/"
    
    aws s3 sync "$backup_path" "$s3_path" --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        log_info "Successfully uploaded backups to S3: $s3_path"
    else
        log_error "Failed to upload backups to S3"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Clean local backups
    find "$BACKUP_DIR/$ENVIRONMENT" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    # Clean S3 backups older than retention period
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://$S3_BUCKET/$ENVIRONMENT/" | while read -r line; do
        local backup_date=$(echo "$line" | awk '{print $2}' | cut -d'_' -f1 | tr -d '/')
        
        if [ -n "$backup_date" ] && [ "$backup_date" -lt "$cutoff_date" ]; then
            local backup_prefix=$(echo "$line" | awk '{print $2}')
            log_info "Deleting old backup: $backup_prefix"
            aws s3 rm "s3://$S3_BUCKET/$ENVIRONMENT/$backup_prefix" --recursive
        fi
    done
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    local backup_path="$1"
    local failed=0
    
    # Check if backup files exist and are not empty
    for file in "$backup_path"/*; do
        if [ -f "$file" ]; then
            if [ ! -s "$file" ]; then
                log_error "Backup file is empty: $file"
                ((failed++))
            fi
        fi
    done
    
    if [ $failed -eq 0 ]; then
        log_info "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed for $failed files"
        return 1
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send Slack notification if webhook is configured
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local color="good"
        [ "$status" = "error" ] && color="danger"
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "attachments": [{
                    "color": "'"$color"'",
                    "title": "Database Backup - '"$ENVIRONMENT"'",
                    "text": "'"$message"'",
                    "ts": '"$(date +%s)"'
                }]
            }' 2>/dev/null || true
    fi
}

# Main execution
main() {
    log_info "Starting backup process for environment: $ENVIRONMENT"
    
    # Check requirements
    check_requirements
    
    # Create backup directory
    local backup_path=$(create_backup_dir)
    log_info "Backup directory: $backup_path"
    
    # Perform backups
    backup_postgresql "$backup_path" || log_warn "PostgreSQL backup failed"
    backup_mongodb "$backup_path" || log_warn "MongoDB backup failed"
    backup_redis "$backup_path" || log_warn "Redis backup failed"
    
    # Verify backup
    if verify_backup "$backup_path"; then
        # Upload to S3
        if upload_to_s3 "$backup_path"; then
            # Clean old backups
            cleanup_old_backups
            
            log_info "Backup completed successfully"
            send_notification "success" "Backup completed successfully at $(date)"
            exit 0
        else
            log_error "Failed to upload backups to S3"
            send_notification "error" "Failed to upload backups to S3"
            exit 1
        fi
    else
        log_error "Backup verification failed"
        send_notification "error" "Backup verification failed"
        exit 1
    fi
}

# Run main function
main "$@"
