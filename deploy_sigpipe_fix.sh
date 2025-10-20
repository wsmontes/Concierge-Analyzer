#!/bin/bash

# Deploy SIGPIPE fixes to PythonAnywhere
# Purpose: Automate deployment of SIGPIPE error fixes
# Dependencies: SSH access to PythonAnywhere, git configured

set -e  # Exit on error

echo "========================================="
echo "SIGPIPE Fix Deployment Script"
echo "========================================="
echo ""

# Configuration
PYTHONANYWHERE_USER="wsmontes"
PYTHONANYWHERE_DOMAIN="${PYTHONANYWHERE_USER}.pythonanywhere.com"
PROJECT_DIR="Concierge-Analyzer"
VENV_NAME="concierge-analyzer-venv"

echo "Step 1: Committing changes to git..."
git add concierge_parser.py requirements.txt SIGPIPE_FIX_GUIDE.md
git commit -m "Fix SIGPIPE errors: Add compression, pagination, and optimized queries" || echo "Nothing to commit"
git push origin main

echo ""
echo "Step 2: PythonAnywhere Deployment Instructions"
echo "----------------------------------------------"
echo ""
echo "Please run the following commands in PythonAnywhere Console:"
echo ""
echo "# 1. Navigate to project directory"
echo "cd ~/${PROJECT_DIR}"
echo ""
echo "# 2. Pull latest changes"
echo "git pull origin main"
echo ""
echo "# 3. Activate virtual environment"
echo "source ~/.virtualenvs/${VENV_NAME}/bin/activate"
echo ""
echo "# 4. Install/update dependencies"
echo "pip install -r requirements.txt"
echo ""
echo "# 5. Verify flask-compress is installed"
echo "pip show flask-compress"
echo ""
echo "# 6. Reload web app (replace with your actual reload command)"
echo "touch /var/www/${PYTHONANYWHERE_DOMAIN}_wsgi.py"
echo ""
echo "# 7. Monitor logs for errors"
echo "tail -f /var/log/${PYTHONANYWHERE_DOMAIN}.error.log"
echo ""
echo "========================================="
echo "Deployment preparation complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Open PythonAnywhere Console: https://www.pythonanywhere.com/user/${PYTHONANYWHERE_USER}/consoles/"
echo "2. Execute the commands listed above"
echo "3. Verify the deployment using the test commands below"
echo ""
echo "Test commands:"
echo "curl https://${PYTHONANYWHERE_DOMAIN}/api/health"
echo "curl https://${PYTHONANYWHERE_DOMAIN}/api/restaurants?page=1&limit=10"
echo "curl -H 'Accept-Encoding: gzip' -I https://${PYTHONANYWHERE_DOMAIN}/api/restaurants | grep Content-Encoding"
echo ""
