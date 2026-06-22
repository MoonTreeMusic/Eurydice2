# Development Workflow

## Branch Strategy

- **All work** goes on the `dev` branch
- **Never commit directly to `main`**
- Create a PR from `dev` → `main` to merge

## Workflow

1. Ensure you're on `dev` branch (or main if starting fresh):
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. Make your changes

3. Commit to `dev`:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin dev
   ```

4. Create a Pull Request on GitHub from `dev` → `main`

5. Review and merge the PR manually

## Azure Resources Checklist

When setting up Azure resources for the first time:

- [ ] Entra ID App Registration (`eurydice-api`)
  - Supported account types: "Accounts in this organizational directory only"
  - API permissions: Azure Storage → `user_impersonation`, Microsoft Graph → `User.Read`

- [ ] Storage Account (`eurydice` or similar)
  - Container: `users`
  - "Allow enabling anonymous access on individual containers" = **unchecked**

- [ ] App Service Plan - Basic B1

- [ ] App Service Web App (`eurydice-api`)
  - Runtime: Node 22 LTS
  - Basic authentication: **disabled**
  - Public access: **enabled** (API gated by Entra ID auth)

## Environment Configuration

See `api/.env.example` for required environment variables.

Required Azure secrets for GitHub Actions:
- `AZURE_STAGING_PUBLISH_PROFILE`
- `AZURE_PRODUCTION_PUBLISH_PROFILE`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SECRET`