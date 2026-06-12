# fifa-schedule-2026

A static Vite + React + TypeScript explorer for the FIFA World Cup 2026 schedule.

The app reads the bundled CSV at `public/data/matches.csv`; there is no API or server data layer. It includes list, calendar, and map views with shared filters for team/search text, stage, group, city, and date range.

## Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm test
npm run build
```

## Deployment

Build the app, then use the Terraform wrapper in `infra/` to deploy static files to AWS S3 + CloudFront:

```sh
npm run build
cd infra
terraform init
terraform plan
terraform apply
```

Target domain:

```text
https://fifaschedule2026.rohineshram.com
```

Terraform was not installed in the implementation shell, so deployment is documented but not applied.
