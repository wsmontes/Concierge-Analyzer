#!/bin/bash

# Server Fix Deployment Script
# Fixes the 500 Internal Server Error on PythonAnywhere

echo "🚀 Deploying server fixes to PythonAnywhere..."

# Commit current changes
echo "📝 Committing fixes..."
git add concierge_parser.py
git commit -m "fix: resolve 500 server error with enhanced error handling

- Remove duplicate Flask app initializations causing conflicts
- Add database connection helper with timeout and error handling
- Enhance /api/restaurants endpoint with better error handling
- Add global error handlers for 500, 404, 400, and unexpected errors
- Add /api/health endpoint for database connectivity testing
- Improve logging and resource cleanup in database operations"

echo "✅ Changes committed locally"

echo "
📋 NEXT STEPS FOR PYTHONANYWHERE DEPLOYMENT:

1. 🌐 Go to PythonAnywhere Web tab: https://www.pythonanywhere.com/user/wsmontes/webapps/

2. 📁 Open Console and navigate to project:
   cd /home/wsmontes/Concierge-Analyzer

3. 🔄 Pull latest changes:
   git pull origin main

4. 🗄️ **CRITICAL: Run database migration to add server_id column:**
   python3 migrate_database_schema.py

5. 🏥 Test database health:
   curl https://wsmontes.pythonanywhere.com/api/health

6. 🔄 Reload web app:
   - Click 'Reload wsmontes.pythonanywhere.com' button in Web tab

7. ✅ Test the fixed endpoint:
   curl https://wsmontes.pythonanywhere.com/api/restaurants

EXPECTED RESULTS:
- Health endpoint should return: {'status': 'healthy', 'database': 'connected'}
- Restaurants endpoint should return JSON array instead of 500 error

🔧 TROUBLESHOOTING:
If still getting errors, check:
- Environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) in .env
- Database server is running and accessible
- PostgreSQL connection limits not exceeded

📊 ERROR MONITORING:
Check server error logs in PythonAnywhere console:
tail -f /var/log/wsmontes.pythonanywhere.com.error.log
"

echo "🎯 Deployment script complete! Follow the steps above to deploy on PythonAnywhere."