@echo off
REM Build script for MTG Board State Manager
REM Copies all necessary files to the dist folder

echo Building project...

REM Clean and create dist directory
if exist dist (
    rmdir /s /q dist
)
mkdir dist
mkdir dist\functions

REM Copy static files
echo Copying static files...
copy index.html dist\
copy style.css dist\
copy script.js dist\
copy card-names-data.js dist\
copy card-names.json dist\

REM Copy serverless function
echo Copying serverless function...
copy functions\fetch-deck.js dist\functions\

echo.
echo ✓ Build complete! Files are ready in the dist folder.
echo.
