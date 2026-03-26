
@echo off
cd /d %~dp0backend
node tools/daily-backup.js
