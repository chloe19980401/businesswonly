@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Acquire OS - deep crawl + push to GitHub + deploy domain
echo   repo:   chloe19980401/businesswonly  (branch main)
echo   domain: business.foreverdoodle.com  (GitHub Pages)
echo   folder: %CD%
echo ============================================================
echo.

echo [1/5] Checking Node.js (need v22+)...
node -v
if errorlevel 1 (
  echo   Node.js not found. Install Node 22+ first: https://nodejs.org
  pause
  exit /b 1
)
echo.

echo [2/5] Installing dependencies (includes playwright)...
call npm install
if errorlevel 1 (
  echo   npm install failed. Check the messages above.
  pause
  exit /b 1
)
echo.

echo [3/5] Downloading headless Chromium (first run only)...
call npx playwright install chromium
echo.

echo [4/5] Running the deep crawler (renders JS sites, may take minutes)...
echo   Some government portals may time out or return 403 - that is normal.
call npm run crawl
echo.
echo   Crawl output: crawler\runs\  and  crawler\live-tenders.json
echo.

echo [5/5] Commit and push to GitHub (GitHub Pages rebuilds the domain)...
git add -A
git commit -m "update: deep crawler v0.2 + frontend live tenders + country clarity"
git push origin main
if errorlevel 1 (
  echo   git push failed. Most likely you are not signed in to GitHub on this PC.
  echo   Sign in with GitHub Desktop once, then run this script again.
  pause
  exit /b 1
)
echo.

echo ============================================================
echo   DONE.
echo   - crawl result: crawler\live-tenders.json
echo   - pushed to GitHub branch main
echo   - business.foreverdoodle.com updates in about 1-2 minutes
echo   Tip: open the site and press Ctrl+F5 to bypass cache.
echo ============================================================
pause
