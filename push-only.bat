@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Push to GitHub only (NO crawl) - deploys the site fast
echo   repo:   chloe19980401/businesswonly  (branch main)
echo   domain: business.foreverdoodle.com
echo   folder: %CD%
echo ============================================================
echo.

git add -A
git commit -m "deploy: frontend update (leads library + synced analytics/contacts)"
if errorlevel 1 (
  echo   Nothing new to commit, or commit failed - will still try to push.
)
git push origin main
if errorlevel 1 (
  echo.
  echo   git push FAILED. Most likely you are not signed in to GitHub on this PC.
  echo   Open GitHub Desktop, sign in to account chloe19980401, then run this again.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo   DONE - pushed to GitHub.
echo   Wait 1-2 minutes, open business.foreverdoodle.com and press Ctrl+F5.
echo ============================================================
pause
