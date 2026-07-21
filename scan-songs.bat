@echo off
cd /d "%~dp0"
echo Scanning for MP3 files...
node embed-songs.js
echo Done. Refresh your browser to see new songs.
pause
