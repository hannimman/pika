@echo off
rem FolioMD installer: gets the latest from npm (registry.npmjs.org), installs it quietly, opens it.
rem Put it on a shared folder or USB: a .bat downloaded from the web shows a warning.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue';[Net.ServicePointManager]::SecurityProtocol='Tls12';$d=Join-Path $env:TEMP ('foliomd-'+[guid]::NewGuid());md $d >$null;try{$p=irm https://registry.npmjs.org/foliomd-setup/latest;iwr -useb $p.dist.tarball -OutFile $d\s.tgz;tar -xzf $d\s.tgz -C $d;$env:FOLIOMD_SETUP=\"$d\package\foliomd-setup.exe\";& \"$d\package\install.ps1\";exit $LASTEXITCODE}finally{rd $d -r -fo -ea 0}"
if errorlevel 1 pause
