@echo off
REM Deploy script for MTG Board State Manager
REM Builds and deploys to Cloudflare Pages

echo ========================================
echo   MTG Board State - Cloudflare Deploy
echo ========================================
echo.

REM Build the project
call build.bat

REM Deploy to Cloudflare Pages
echo Deploying to Cloudflare Pages...
echo.
npx wrangler pages deploy dist --project-name=mtg-board-state

echo.
echo ========================================
echo   Deployment complete!
echo ========================================
pause
