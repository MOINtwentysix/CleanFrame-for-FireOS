@echo off
setlocal
echo ============================================================
echo   CleanFrame FireOS - APK Build Script
echo ============================================================
echo.
where gradle >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] System Gradle found. Starting build...
    call gradle assembleDebug
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [SUCCESS] APK built successfully!
        echo Location: app\build\outputs\apk\debug\app-debug.apk
    ) else (
        echo.
        echo [ERROR] Build failed. See output above.
    )
    goto end
)

echo [INFO] Gradle is not installed locally.
echo You have two options:
echo   1. Push this branch to GitHub - GitHub Actions will build
echo      the APK in the cloud and provide the download under Actions.
echo   2. Install OpenJDK 17 and Android Studio / Command-line Tools locally.
echo.

:end
pause
