# Deploy GuestPass Pro to GitHub Pages

GitHub Pages can host this **static prototype**. It cannot run the future Node.js API or securely host Google service credentials. Cloud database integration will require a separate backend deployment.

## A. Install prerequisites

Install Node.js LTS and Git on Windows. Restart VS Code after installation if the terminal cannot find `node`, `npm`, or `git`.

Verify in the VS Code terminal:

```powershell
node --version
npm --version
git --version
```

## B. Test locally

From the project folder:

```powershell
npm install
npm run build
npm run dev
```

Open the local address Vite prints. Test adding a demo guest, uploading a small photo, generating seats, assigning a seat, checking the guest in, and exporting CSV.

Stop the development server with `Ctrl+C`.

## C. Create a GitHub repository

1. Sign in to GitHub.
2. Create a new repository named `guestpass-pro`.
3. For the simplest first deployment, choose **Public**. A public repository makes source code visible to everyone. Never commit credentials, private guest data, or API keys.
4. Do not initialize it with a README if you are uploading this existing project and want to avoid a merge conflict.

## D. Push the project from VS Code

Open the terminal in the extracted project folder and run:

```powershell
git init
git add .
git commit -m "Initial GuestPass Pro prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/guestpass-pro.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. If Git asks you to sign in, complete GitHub's browser authentication flow. Do not paste passwords or access tokens into chat.

If Git reports that `origin` already exists, run:

```powershell
git remote -v
```

Then update the remote URL if needed:

```powershell
git remote set-url origin https://github.com/YOUR-USERNAME/guestpass-pro.git
```

## E. Turn on GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Create the workflow file below in your project as `.github/workflows/deploy.yml`.
5. Commit and push it. The Actions tab will show the build and deployment status.
6. After the workflow succeeds, open the Pages URL shown in Settings → Pages.

Create `.github/workflows/deploy.yml` with this content:

```yaml
name: Deploy GuestPass Pro to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

**Note:** This workflow uses GitHub's standard Pages deployment actions. If GitHub announces newer recommended action versions, review the official GitHub Pages documentation before updating.

## F. Test the deployed site

After deployment, verify:

- The homepage loads without missing assets.
- The navigation works.
- You can add and edit a synthetic guest.
- A small test photo displays.
- Seat generation works.
- A duplicate seat assignment is rejected.
- Check-in and undo check-in work.
- CSV export downloads.
- Refreshing the page preserves data in the same browser.
- The layout works on a phone.

Remember: localStorage is device/browser-specific. The deployed site does **not** synchronize data between users or devices.

## G. Install as an app

- **Android:** Open the deployed HTTPS site in a supported browser and use its install option if offered.
- **iPhone/iPad:** Open the site in Safari, tap Share, then choose **Add to Home Screen**.
- **Desktop:** Use the browser's install option if available.

PWA installation and offline behavior vary by browser and device. Test on the actual target devices.

## H. Common errors

### `npm` or `node` not recognized
Install Node.js LTS, close and reopen VS Code, then retry.

### `git` not recognized
Install Git for Windows, restart VS Code, and retry.

### `npm run build` fails
Copy the complete terminal output and share it so the error can be diagnosed.

### GitHub Pages shows a 404
Check that Pages is configured to use **GitHub Actions**, and confirm the deployment workflow succeeded.

### Page loads but styling or assets are missing
Check the browser console and verify the latest commit deployed successfully. This project uses a relative Vite base path for project-site hosting.

### Changes do not appear
Wait for the Actions workflow to finish, then hard-refresh the page or open it in a private browser window.

## I. Before production

Do not use GitHub Pages alone as the production platform for the full product. The commercial version needs a secure backend, authentication, organization-level access control, server-side plan enforcement, private file delivery, backups, monitoring, and a database that safely handles simultaneous check-ins.
