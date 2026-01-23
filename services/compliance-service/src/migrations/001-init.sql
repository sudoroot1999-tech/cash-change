-- Compliance Check
CREATE TABLE IF NOT EXISTS "compliance_checks" (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
type character varying NOT NULL,
status character varying NOT NULL DEFAULT 'pending',
result jsonb,
score integer,
performed_by character varying,
notes text,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_compliance_checks" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_compliance_checks_user_id" ON "compliance_checks" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_compliance_checks_status" ON "compliance_checks" (status);
CREATE INDEX IF NOT EXISTS "IDX_compliance_checks_type" ON "compliance_checks" (type);

-- Suspicious Activities
CREATE TABLE IF NOT EXISTS "suspicious_activities" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    activity_type character varying NOT NULL,
    severity character varying NOT NULL DEFAULT 'medium',
    description text NOT NULL,
    details jsonb,
    transaction_ids text,
    status character varying NOT NULL DEFAULT 'reported',
    reported_to_authorities boolean NOT NULL DEFAULT false,
    reported_at TIMESTAMP,
    resolution text,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_suspicious_activities" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_suspicious_activities_user_id" ON "suspicious_activities" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_suspicious_activities_status" ON "suspicious_activities" ("status");

-- Audit Logs
CREATE TABLE IF NOT EXISTS IF NOT EXISTS "audit_logs" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
user_id uuid,
admin_id uuid,
action character varying NOT NULL,
entity character varying NOT NULL,
entity_id character varying,
changes jsonb,
ip_address character varying,
user_agent text,
metadata jsonb,
created_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS "IDX_audit_logs_user_id" ON "audit_logs" (user_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS "IDX_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" (created_at);

-- Gdpr Requests
CREATE TABLE IF NOT EXISTS "gdpr_requests" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
request_type character varying NOT NULL,
status character varying NOT NULL DEFAULT 'pending',
request_data jsonb,
response_data jsonb,
processed_by uuid,
processed_at TIMESTAMP,
expires_at TIMESTAMP,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_gdpr_requests" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_gdpr_requests_user_id" ON "gdpr_requests" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_gdpr_requests_status" ON "gdpr_requests" (status);

-- Tax Reports
CREATE TABLE IF NOT EXISTS "tax_reports" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
report_year integer NOT NULL,
report_type character varying NOT NULL,
jurisdiction character varying NOT NULL,
status character varying NOT NULL DEFAULT 'draft',
report_data jsonb NOT NULL,
generated_at TIMESTAMP,
submitted_at TIMESTAMP,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_tax_reports" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_tax_reports_user_id" ON "tax_reports" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_tax_reports_report_year" ON "tax_reports" (report_year);

-- Policy Acceptances
CREATE TABLE IF NOT EXISTS "policy_acceptances" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
policy_type character varying NOT NULL,
policy_version character varying NOT NULL,
accepted boolean NOT NULL DEFAULT false,
ip_address character varying,
user_agent text,
accepted_at TIMESTAMP,
created_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_policy_acceptances" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_policy_acceptances_user_id" ON "policy_acceptances" (user_id);

-- Transaction Monitoring
CREATE TABLE IF NOT EXISTS "transaction_monitoring" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
transaction_id character varying NOT NULL,
user_id uuid NOT NULL,
transaction_type character varying NOT NULL,
amount numeric NOT NULL,
currency character varying NOT NULL,
risk_score integer NOT NULL DEFAULT 0,
flags text,
status character varying NOT NULL DEFAULT 'clear',
reviewed_by uuid,
reviewed_at TIMESTAMP,
notes text,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_transaction_monitoring" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_transaction_monitoring_user_id" ON "transaction_monitoring" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_transaction_monitoring_transaction_id" ON "transaction_monitoring" (transaction_id);
CREATE INDEX IF NOT EXISTS "IDX_transaction_monitoring_status" ON "transaction_monitoring" (status);

-- Geo Restrictions
CREATE TABLE IF NOT EXISTS "geo_restrictions" (
"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
country_code character varying NOT NULL,
restriction_type character varying NOT NULL,
reason text,
is_active boolean NOT NULL DEFAULT true,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "UQ_geo_restrictions_country_code" UNIQUE (country_code),
CONSTRAINT "PK_geo_restrictions" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_geo_restrictions_country_code" ON "geo_restrictions" (country_code);

-- Kyc Verification Requests
CREATE TABLE IF NOT EXISTS "kyc_verification_requests" (
"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
requested_level character varying NOT NULL,
provider character varying NOT NULL DEFAULT 'MANUAL',
provider_request_id varchar,
selfie_url varchar,
selfie_url_encrypted varchar,
liveness_score decimal(5,2),
video_url varchar,
video_url_encrypted varchar,
submitted_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
reviewed_at timestamp,
reviewed_by varchar,
approved_at timestamp,
rejected_at timestamp,
rejection_reason text,
notes text,
metadata jsonb,
level character varying NOT NULL DEFAULT '1',
status character varying NOT NULL DEFAULT 'pending',
provider_reference character varying,
document_type character varying,
document_number character varying,
document_country character varying,
verification_data jsonb,
verified_at TIMESTAMP,
expires_at TIMESTAMP,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
CONSTRAINT "PK_kyc_verification_requests" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_kyc_verification_requests_user_id" ON "kyc_verification_requests" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_kyc_verification_requests_status" ON "kyc_verification_requests" (status);
CREATE INDEX IF NOT EXISTS "IDX_kyc_verification_requests_requested_level" ON "kyc_verification_requests" (requested_level);

-- Kyc Documents
CREATE TABLE IF NOT EXISTS "kyc_documents" (
"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
verification_request_id uuid NOT NULL,
document_type document_type_enum NOT NULL,
document_number varchar,
document_front_url varchar NOT NULL,
document_back_url varchar,
document_front_url_encrypted varchar NOT NULL,
document_back_url_encrypted varchar,
is_encrypted boolean NOT NULL DEFAULT true,
expiry_date date,
issue_date date,
issuing_country varchar,
extracted_data jsonb,
created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "FK_kyc_documents_verification_request_id" 
    FOREIGN KEY (verification_request_id) 
    REFERENCES "kyc_verification_requests"("id") 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_kyc_documents_user_id" ON "kyc_documents" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_kyc_documents_verification_request_id" ON "kyc_documents" (verification_request_id);

-- Kyc Audit Logs
CREATE TABLE IF NOT EXISTS "kyc_audit_logs" (
"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id uuid NOT NULL,
verification_request_id uuid,
"action" varchar NOT NULL,
performed_by varchar NOT NULL,
performed_by_role varchar NOT NULL DEFAULT 'USER',
ip_address varchar NOT NULL,
user_agent varchar,
changes jsonb,
reason text,
timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_kyc_audit_logs_user_id" ON "kyc_audit_logs" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_kyc_audit_logs_verification_request_id" ON "kyc_audit_logs" (verification_request_id);
CREATE INDEX IF NOT EXISTS "IDX_kyc_audit_logs_timestamp" ON "kyc_audit_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "IDX_kyc_audit_logs_performed_by" ON "kyc_audit_logs" (performed_by);