# Objective
Create a downloadable zip file containing all the necessary project files for the Life Compass application.

# Tasks

### T001: Create Downloadable Zip
- **Blocked By**: []
- **Details**:
  - Run a shell command to zip all project source files (excluding `node_modules`, `.git`, `.local`, and other non-essential directories)
  - Place the zip file in a location accessible for download (e.g., `client/public/` so it's served statically)
  - Files to include: `client/`, `server/`, `shared/`, `package.json`, `tsconfig.json`, `vite.config.ts`, `drizzle.config.ts`, `tailwind.config.ts`, `replit.md`, and any other config files at root
  - Exclude: `node_modules/`, `.git/`, `.local/`, `dist/`, `/tmp/`, attached_assets
  - Acceptance: A zip file is created and accessible via a direct URL from the running app
