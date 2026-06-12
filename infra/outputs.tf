output "bucket_id" {
  description = "S3 bucket that stores the static website files."
  value       = aws_s3_bucket.web_bucket.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "cloudfront_dist_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.site.id
}

output "site_url" {
  description = "Public site URL."
  value       = "https://${var.site_domain_name}"
}
