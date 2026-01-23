# Production Environment Configuration

aws_region          = "us-east-1"
environment         = "production"
project_name        = "crypto-exchange"
domain_name         = "crypto-exchange.com"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnets   = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# EKS Configuration
eks_cluster_version = "1.28"

# Database Configuration
db_master_username = "dbadmin"
# db_master_password should be set via environment variable or AWS Secrets Manager

# Monitoring Configuration
enable_enhanced_monitoring = true
alarm_email               = "alerts@crypto-exchange.com"

# Backup Configuration
backup_retention_days = 90

# API Keys (store in AWS Secrets Manager)
api_keys = {
  # "exchange_api" = "secret-key"
  # "payment_gateway" = "secret-key"
}
