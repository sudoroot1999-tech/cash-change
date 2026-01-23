#!/bin/bash

###############################################################################
# Database Restore Script
# Description: Restore PostgreSQL and MongoDB from backups
# Usage: ./restore-databases.sh [environment] [backup_timestamp]
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTORE_DIR="${RESTORE_DIR:-/tmp/restore}"
ENVIRONMENT="${1:-production}"
BACKUP_TIMESTAMP="${2:-latest}"
S3_BUCKET="${S3_BACKUP_BUCKET:-crypto-exchange-backups}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Get latest backup timestamp
get_latest_backup() {
    aws s3 ls "s3://$S3_BUCKET/$ENVIRONMENT/" | sort -r | head -n 1 | awk '{print $2}' | tr -d '/'
}

# Download backup from S3
download_backup() {
    log_info "Downloading backup from S3..."
    
    local timestamp="$1"
    local restore_path="$RESTORE_DIR/$timestamp"
    
    mkdir -p "$restore_path"
    
    aws s3 sync "s3://$S3_BUCKET/$ENVIRONMENT/$timestamp/" "$restore_path"
    
    if [ $? -eq 0 ]; then
        log_info "Successfully downloaded backup"
        echo "$restore_path"
    else
        log_error "Failed to download backup"
        exit 1
    fi
}

# Restore PostgreSQL database
restore_postgresql() {
    log_info "Starting PostgreSQL restore..."
    
    local restore_path="$1"
    local namespace="$ENVIRONMENT"
    
    local pg_pod=$(kubectl get pods -n "$namespace" -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')
    local pg_password=$(kubectl get secret -n "$namespace" postgresql-secret -o jsonpath='{.data.postgres-password}' | base64 -d)
    
    for dump_file in "$restore_path"/*_db_*.dump.gz; do
        if [ -f "$dump_file" ]; then
            local db_name=$(basename "$dump_file" | cut -d'_' -f1-2)
            log_info "Restoring database: $db_name"
            
            # Decompress
            gunzip -c "$dump_file" > "${dump_file%.gz}"
            
            # Drop existing database
            kubectl exec -n "$namespace" "$pg_pod" -- bash -c "PGPASSWORD='$pg_password' psql -U postgres -c 'DROP DATABASE IF EXISTS $db_name;'"
            
            # Create database
            kubectl exec -n "$namespace" "$pg_pod" -- bash -c "PGPASSWORD='$pg_password' psql -U postgres -c 'CREATE DATABASE $db_name;'"
            
            # Restore
            kubectl exec -i -n "$namespace" "$pg_pod" -- bash -c "PGPASSWORD='$pg_password' pg_restore -U postgres -d $db_name" < "${dump_file%.gz}"
            
            if [ $? -eq 0 ]; then
                log_info "Successfully restored $db_name"
            else
                log_error "Failed to restore $db_name"
            fi
            
            rm "${dump_file%.gz}"
        fi
    done
}

# Restore MongoDB
restore_mongodb() {
    log_info "Starting MongoDB restore..."
    
    local restore_path="$1"
    local namespace="$ENVIRONMENT"
    
    local mongo_pod=$(kubectl get pods -n "$namespace" -l app.kubernetes.io/name=mongodb -o jsonpath='{.items[0].metadata.name}')
    local mongo_password=$(kubectl get secret -n "$namespace" mongodb-secret -o jsonpath='{.data.mongodb-root-password}' | base64 -d)
    
    local archive_file="$restore_path/mongodb_*.archive.gz"
    
    if [ -f "$archive_file" ]; then
        log_info "Restoring MongoDB"
        
        kubectl exec -i -n "$namespace" "$mongo_pod" -- bash -c "mongorestore --username root --password '$mongo_password' --authenticationDatabase admin --gzip --archive --drop" < "$archive_file"
        
        if [ $? -eq 0 ]; then
            log_info "Successfully restored MongoDB"
        else
            log_error "Failed to restore MongoDB"
        fi
    fi
}

# Main execution
main() {
    log_warn "WARNING: This will restore databases and may overwrite existing data!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    # Get backup timestamp
    if [ "$BACKUP_TIMESTAMP" = "latest" ]; then
        BACKUP_TIMESTAMP=$(get_latest_backup)
        log_info "Using latest backup: $BACKUP_TIMESTAMP"
    fi
    
    # Download backup
    local restore_path=$(download_backup "$BACKUP_TIMESTAMP")
    
    # Restore databases
    restore_postgresql "$restore_path"
    restore_mongodb "$restore_path"
    
    # Cleanup
    rm -rf "$restore_path"
    
    log_info "Restore completed"
}

main "$@"
