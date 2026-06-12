variable "aws_profile" {
  description = "AWS CLI profile to use for deployment."
  type        = string
  default     = "default"
}

variable "region" {
  description = "AWS region for the static site resources. CloudFront certificates must be in us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project tag applied to AWS resources."
  type        = string
  default     = "fifa-schedule-2026"
}

variable "env" {
  description = "Deployment environment tag."
  type        = string
  default     = "production"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for static assets."
  type        = string
  default     = "fifa-schedule-2026-rohineshram-com"
}

variable "cf_dist_name" {
  description = "CloudFront distribution name tag."
  type        = string
  default     = "fifa-schedule-2026-cloudfront"
}

variable "hosted_zone_name" {
  description = "Existing Route53 public hosted zone name."
  type        = string
  default     = "rohineshram.com"
}

variable "site_domain_name" {
  description = "Fully qualified site domain served by CloudFront."
  type        = string
  default     = "fifaschedule2026.rohineshram.com"
}

variable "path_to_bundle" {
  description = "Path to the Vite build output from this infra directory."
  type        = string
  default     = "../dist"
}

variable "cf_price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}

variable "cf_ttl" {
  description = "Default CloudFront cache TTL in seconds."
  type        = number
  default     = 86400
}

variable "default_root_object" {
  description = "Default root object for CloudFront."
  type        = string
  default     = "index.html"
}

variable "content_types" {
  description = "Content types for uploaded static assets."
  type        = map(string)
  default = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".mjs"  = "application/javascript"
    ".json" = "application/json"
    ".csv"  = "text/csv"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain"
    ".pdf"  = "application/pdf"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
  }
}
