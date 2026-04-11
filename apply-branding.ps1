# Sync branding from client to server
Copy-Item "client/src/config/branding.json" "server/src/config/branding.json" -Force
Write-Host "✅ Branding synced from Client to Server!" -ForegroundColor Green
