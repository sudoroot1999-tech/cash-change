terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "crypto-exchange-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "crypto-exchange"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  database_subnets    = var.database_subnets
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = {
    general = {
      desired_capacity = var.environment == "production" ? 6 : 3
      max_capacity     = var.environment == "production" ? 20 : 10
      min_capacity     = var.environment == "production" ? 3 : 2
      instance_types   = ["t3.xlarge"]
      disk_size        = 100
    }
    
    compute = {
      desired_capacity = var.environment == "production" ? 4 : 2
      max_capacity     = var.environment == "production" ? 15 : 8
      min_capacity     = var.environment == "production" ? 2 : 1
      instance_types   = ["c6i.2xlarge"]
      disk_size        = 100
      labels = {
        workload = "compute-intensive"
      }
      taints = [{
        key    = "workload"
        value  = "compute"
        effect = "NoSchedule"
      }]
    }
  }
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  identifier          = "${var.project_name}-${var.environment}-postgres"
  engine              = "postgres"
  engine_version      = "16.1"
  instance_class      = var.environment == "production" ? "db.r6g.2xlarge" : "db.t3.large"
  allocated_storage   = var.environment == "production" ? 500 : 100
  storage_encrypted   = true
  
  db_name  = "crypto_exchange"
  username = var.db_master_username
  password = var.db_master_password

  multi_az               = var.environment == "production"
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnets
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  # Read replicas
  read_replica_count = var.environment == "production" ? 2 : 0
}

# ElastiCache Redis Module
module "redis" {
  source = "./modules/redis"

  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine_version       = "7.0"
  node_type            = var.environment == "production" ? "cache.r6g.xlarge" : "cache.t3.medium"
  num_cache_nodes      = var.environment == "production" ? 3 : 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_ids          = module.vpc.private_subnets
  vpc_id              = module.vpc.vpc_id
  automatic_failover_enabled = var.environment == "production"
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"

  environment = var.environment
  buckets = {
    documents = {
      name = "${var.project_name}-${var.environment}-documents"
      versioning = true
      lifecycle_rules = [{
        id      = "transition-old-versions"
        enabled = true
        transitions = [{
          days          = 90
          storage_class = "GLACIER"
        }]
      }]
    }
    
    backups = {
      name = "${var.project_name}-${var.environment}-backups"
      versioning = true
      lifecycle_rules = [{
        id      = "expire-old-backups"
        enabled = true
        expiration = {
          days = 90
        }
      }]
    }
    
    logs = {
      name = "${var.project_name}-${var.environment}-logs"
      versioning = false
      lifecycle_rules = [{
        id      = "expire-old-logs"
        enabled = true
        expiration = {
          days = 30
        }
      }]
    }
  }
}

# CloudFront CDN Module
module "cloudfront" {
  source = "./modules/cloudfront"

  environment     = var.environment
  domain_name     = var.domain_name
  s3_bucket_id    = module.s3.buckets["documents"].id
  acm_certificate_arn = var.acm_certificate_arn
  
  price_class = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"
}

# Route53 DNS Module
module "route53" {
  source = "./modules/route53"

  domain_name = var.domain_name
  
  records = {
    api = {
      name = "api"
      type = "A"
      alias = {
        name    = module.alb.alb_dns_name
        zone_id = module.alb.alb_zone_id
      }
    }
    
    cdn = {
      name = "cdn"
      type = "A"
      alias = {
        name    = module.cloudfront.cloudfront_domain_name
        zone_id = module.cloudfront.cloudfront_zone_id
      }
    }
  }
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  name            = "${var.project_name}-${var.environment}-alb"
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnets
  security_groups = [module.vpc.alb_security_group_id]
  
  enable_deletion_protection = var.environment == "production"
  enable_http2               = true
  enable_waf                 = var.environment == "production"
  
  certificate_arn = var.acm_certificate_arn
}

# Secrets Manager Module
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment
  
  secrets = {
    db_password = {
      name        = "${var.project_name}/${var.environment}/db/password"
      description = "Database master password"
      secret_string = var.db_master_password
    }
    
    jwt_secret = {
      name        = "${var.project_name}/${var.environment}/jwt/secret"
      description = "JWT signing secret"
      secret_string = var.jwt_secret
    }
    
    api_keys = {
      name        = "${var.project_name}/${var.environment}/api/keys"
      description = "External API keys"
      secret_string = jsonencode(var.api_keys)
    }
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/application/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 7
  
  kms_key_id = aws_kms_key.logs.arn
}

# KMS Key for encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for log encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_kms_alias" "logs" {
  name          = "alias/${var.project_name}-${var.environment}-logs"
  target_key_id = aws_kms_key.logs.key_id
}
