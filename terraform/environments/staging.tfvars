# Staging Environment Configuration

aws_region          = "us-east-1"
environment         = "staging"
project_name        = "crypto-exchange"
domain_name         = "staging.crypto-exchange.com"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"

# VPC Configuration
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
private_subnets    = ["10.1.1.0/24", "10.1.2.0/24"]
public_subnets     = ["10.1.101.0/24", "10.1.102.0/24"]
database_subnets   = ["10.1.201.0/24", "10.1.202.0/24"]

# EKS Configuration
eks_cluster_version = "1.28"

# Database Configuration
db_master_username = "dbadmin"
# db_master_password should be set via environment variable

# Monitoring Configuration
enable_enhanced_monitoring = true
alarm_email               = "staging-alerts@crypto-exchange.com"

# Backup Configuration
backup_retention_days = 30

# API Keys
api_keys = {}
