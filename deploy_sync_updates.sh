#!/bin/bash
"""
Deployment Script for Concierge API Sync Updates
Run this script on the PythonAnywhere server to complete the sync implementation.
"""

echo "🚀 Deploying Concierge API Sync Updates"
echo "======================================="

# Step 1: Backup current database
echo ""
echo "📋 Step 1: Database Schema Update"
echo "Please run the following SQL commands on your database:"
echo ""
echo "-- Check if server_id column exists"
echo "SELECT column_name FROM information_schema.columns"
echo "WHERE table_name = 'restaurants' AND column_name = 'server_id';"
echo ""
echo "-- If column doesn't exist, add it:"
echo "ALTER TABLE restaurants ADD COLUMN server_id VARCHAR(255);"
echo "CREATE INDEX IF NOT EXISTS idx_restaurants_server_id ON restaurants(server_id);"
echo ""

# Step 2: File deployment  
echo "📁 Step 2: File Deployment"
echo "The following files have been updated:"
echo "  ✅ concierge_parser.py - Enhanced with new sync endpoints"
echo "  ✅ check_schema.py - Database schema validation"
echo "  ✅ test_sync_endpoints.py - Endpoint testing"
echo ""
echo "Deploy these files to your PythonAnywhere environment."
echo ""

# Step 3: Server restart
echo "🔄 Step 3: Server Restart"
echo "After deploying files, restart your Flask application on PythonAnywhere:"
echo "  - Go to Web tab in PythonAnywhere dashboard"
echo "  - Click 'Reload' button for your web app"
echo ""

# Step 4: Validation
echo "✅ Step 4: Validation"
echo "Run these commands to validate the deployment:"
echo ""
echo "# Test database schema"
echo "python check_schema.py"
echo ""
echo "# Test all endpoints"  
echo "python test_sync_endpoints.py"
echo ""

echo "🎯 Expected Results After Deployment:"
echo "====================================="
echo "✅ All sync endpoints return 200 status codes"
echo "✅ GET /api/restaurants includes 'id' and 'server_id' fields"  
echo "✅ Database has server_id column with index"
echo "✅ Bulk sync operations work correctly"
echo ""

echo "📋 New Endpoints Available:"
echo "=========================="
echo "GET    /api/restaurants/<id>           - Fetch single restaurant"
echo "PUT    /api/restaurants/<id>           - Update restaurant"  
echo "DELETE /api/restaurants/<id>           - Delete restaurant"
echo "GET    /api/restaurants/server-ids     - Get sync mapping"
echo "POST   /api/restaurants/sync           - Bulk sync operations"
echo ""

echo "🔄 This resolves the sync issues in your Collector application!"
echo "The 'Fix deleting' problem should now be resolved."