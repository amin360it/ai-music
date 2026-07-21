@echo off
cd /d "%~dp0"
echo Generating song manifest...
node embed-songs.js
echo Starting Vue SPA via Node %NODE_VER%...
node server.js

