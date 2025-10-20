#!/bin/bash
# 
# PythonAnywhere Server Fix Deployment Script
# Fixes CORS and error handling issues on the server
# Dependencies: None (bash script)
#

echo "======================================"
echo "PythonAnywhere Server Fix Deployment"
echo "======================================"
echo ""

# Configuration
REMOTE_USER="wsmontes"
REMOTE_HOST="ssh.pythonanywhere.com"
REMOTE_PATH="/home/wsmontes/Concierge-Analyzer/mysql_api"

echo "This script will:"
echo "1. Upload fixed server files to PythonAnywhere"
echo "2. Run diagnostics on the server"
echo "3. Reload the web app"
echo ""

# Check if we have the necessary files
if [ ! -f "mysql_api/app.py" ]; then
    echo "Error: mysql_api/app.py not found"
    exit 1
fi

if [ ! -f "mysql_api/wsgi_enhanced.py" ]; then
    echo "Error: mysql_api/wsgi_enhanced.py not found"
    exit 1
fi

if [ ! -f "mysql_api/diagnose_server.py" ]; then
    echo "Error: mysql_api/diagnose_server.py not found"
    exit 1
fi

echo "Step 1: Uploading fixed files to PythonAnywhere..."
echo "-----------------------------------------------"

# Upload the fixed app.py
echo "Uploading app.py..."
scp mysql_api/app.py ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/app.py
if [ $? -ne 0 ]; then
    echo "Error: Failed to upload app.py"
    exit 1
fi

# Upload the enhanced WSGI file
echo "Uploading wsgi_enhanced.py..."
scp mysql_api/wsgi_enhanced.py ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/wsgi_enhanced.py
if [ $? -ne 0 ]; then
    echo "Error: Failed to upload wsgi_enhanced.py"
    exit 1
fi

# Upload the diagnostic script
echo "Uploading diagnose_server.py..."
scp mysql_api/diagnose_server.py ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/diagnose_server.py
if [ $? -ne 0 ]; then
    echo "Error: Failed to upload diagnose_server.py"
    exit 1
fi

echo ""
echo "Step 2: Running server diagnostics..."
echo "-----------------------------------------------"

# Run diagnostics on the server
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /home/wsmontes/Concierge-Analyzer/mysql_api
python3.10 diagnose_server.py
ENDSSH

echo ""
echo "Step 3: Instructions for completing the fix..."
echo "-----------------------------------------------"
echo ""
echo "MANUAL STEPS REQUIRED:"
echo ""
echo "1. Log in to PythonAnywhere: https://www.pythonanywhere.com"
echo ""
echo "2. Go to the Web tab"
echo ""
echo "3. Click on your web app (wsmontes.pythonanywhere.com)"
echo ""
echo "4. In the 'Code' section, click on the WSGI configuration file"
echo ""
echo "5. Replace the WSGI file content with the contents of wsgi_enhanced.py"
echo "   (Or update the path in the WSGI config to point to wsgi_enhanced.py)"
echo ""
echo "6. Check the 'Environment variables' section:"
echo "   - Make sure MYSQL_PASSWORD is set"
echo "   - Add any other required variables from .env.template"
echo ""
echo "7. Click the 'Reload' button (big green button)"
echo ""
echo "8. Test the API:"
echo "   curl https://wsmontes.pythonanywhere.com/api/health"
echo ""
echo "9. Check the error log for any issues:"
echo "   Go to Web tab -> Log files -> Error log"
echo ""
echo "======================================"
echo "Deployment script completed"
echo "======================================"
