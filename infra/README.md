# FIFA Schedule 2026 AWS Deploy

This Terraform wrapper deploys the Vite build to S3 + CloudFront and maps it to:

```text
https://fifaschedule2026.rohineshram.com
```

It follows the shape of `klaus-224/terraform-modules/aws_static_web`, with one project-local adjustment: the hosted zone (`rohineshram.com`) is separate from the served site domain (`fifaschedule2026.rohineshram.com`). The upstream module currently treats `root_domain_name` as both values, which works for apex domains but not this subdomain.

## Deploy

From the project root:

```sh
npm install
npm run build
cd infra
terraform init
terraform plan
terraform apply
```

Terraform was not installed in the local shell during implementation, so these commands are intentionally left as a runbook instead of being executed here.

## Important Variables

- `hosted_zone_name`: `rohineshram.com`
- `site_domain_name`: `fifaschedule2026.rohineshram.com`
- `path_to_bundle`: `../dist`
- `bucket_name`: `fifa-schedule-2026-rohineshram-com`

If the bucket name is already taken globally, override it:

```sh
terraform plan -var 'bucket_name=fifa-schedule-2026-rohineshram-com-<unique-suffix>'
terraform apply -var 'bucket_name=fifa-schedule-2026-rohineshram-com-<unique-suffix>'
```
