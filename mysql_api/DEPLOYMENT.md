# Deployment Guide - Concierge Entities API

## Overview

This guide provides step-by-step instructions for deploying the Concierge Entities API on PythonAnywhere with MySQL backend.

## Prerequisites

- PythonAnywhere account (free or paid)
- MySQL database created on PythonAnywhere
- Basic familiarity with PythonAnywhere interface

## Step 1: Database Setup

### 1.1 Create MySQL Database

1. Log into PythonAnywhere dashboard
2. Go to **Databases** → **MySQL**
3. Your database `wsmontes$concierge_db` should already exist
4. Note your connection details:
   - Host: `wsmontes.mysql.pythonanywhere-services.com`
   - Username: `wsmontes`
   - Database: `wsmontes$concierge_db`

### 1.2 Initialize Database Schema

1. Click on your database name to open MySQL console
2. Copy and paste the contents of `schema.sql`
3. Execute the SQL commands to create tables
4. Verify tables are created:
   ```sql
   SHOW TABLES;
   DESCRIBE entities;
   ```

## Step 2: File Upload

### 2.1 Upload API Files

1. Go to **Files** in PythonAnywhere dashboard
2. Navigate to `/home/wsmontes/Concierge-Analyzer/`
3. Create directory: `mysql_api`
4. Upload all files from your local `mysql_api` directory:
   - `app.py`
   - `database.py`
   - `models.py`
   - `config.py`
   - `wsgi.py`
   - `requirements.txt`
   - `README.md`

### 2.2 File Structure Verification

Your directory should look like:
```
/home/wsmontes/Concierge-Analyzer/mysql_api/
├── app.py
├── database.py
├── models.py
├── config.py
├── wsgi.py
├── requirements.txt
├── README.md
└── .env (create this next)
```

## Step 3: Environment Configuration

### 3.1 Create Environment File

1. In the `mysql_api` directory, create `.env` file
2. Add your configuration:
   ```bash
   # MySQL Database Configuration
   MYSQL_HOST=wsmontes.mysql.pythonanywhere-services.com
   MYSQL_USER=wsmontes
   MYSQL_PASSWORD=your_mysql_password_here
   MYSQL_DATABASE=wsmontes$concierge_db
   MYSQL_PORT=3306

   # Flask Configuration
   FLASK_ENV=production
   FLASK_DEBUG=False
   SECRET_KEY=your_secret_key_here

   # CORS Configuration
   CORS_ORIGINS=*
   ```

3. **Important**: Replace `your_mysql_password_here` with your actual MySQL password
4. Replace `your_secret_key_here` with a secure random string

### 3.2 Set Environment Variables (Alternative)

Instead of `.env` file, you can set environment variables in PythonAnywhere:

1. Go to **Web** tab
2. Scroll to **Environment variables** section
3. Add the variables listed above

## Step 4: Install Dependencies

### 4.1 Open Bash Console

1. Go to **Consoles** in PythonAnywhere dashboard
2. Click **Bash**

### 4.2 Install Python Packages

```bash
cd /home/wsmontes/Concierge-Analyzer/mysql_api
pip3.10 install --user -r requirements.txt
```

Note: Use the Python version that matches your web app (usually 3.10)

## Step 5: Web App Configuration

### 5.1 Create Web App

1. Go to **Web** tab in PythonAnywhere dashboard
2. If you don't have a web app, click **Add a new web app**
3. Choose **Manual configuration**
4. Select **Python 3.10** (or your preferred version)

### 5.2 Configure WSGI File

1. Click on the **WSGI configuration file** link
2. Replace the entire content with:

```python
import sys
import os

# Add the mysql_api directory to Python path
mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

# Set the current working directory
os.chdir('/home/wsmontes/Concierge-Analyzer/mysql_api')

# Import the Flask application
from app import app as application

# The WSGI handler expects an object called 'application'
if __name__ == "__main__":
    application.run()
```

3. Save the file

### 5.3 Configure Static Files (Optional)

If you plan to serve static files:

1. In **Web** tab, scroll to **Static files**
2. Add mapping:
   - URL: `/static/`
   - Directory: `/home/wsmontes/Concierge-Analyzer/mysql_api/static/`

## Step 6: Test Deployment

### 6.1 Reload Web App

1. In **Web** tab, click **Reload** button
2. Wait for reload to complete

### 6.2 Test Health Check

1. Open your web app URL: `https://wsmontes.pythonanywhere.com`
2. Test the health endpoint: `https://wsmontes.pythonanywhere.com/api/health`
3. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-18T10:30:00.000Z",
     "data": {
       "database": {
         "status": "healthy",
         "database": "connected"
       },
       "api": "operational"
     }
   }
   ```

### 6.3 Test API Info

Test: `https://wsmontes.pythonanywhere.com/api/info`

Expected response:
```json
{
  "status": "success",
  "data": {
    "name": "Concierge Entities API",
    "version": "1.0.0",
    "supported_entities": ["restaurant", "hotel", "attraction", "event"]
  }
}
```

## Step 7: Import Sample Data

### 7.1 Test Import with Concierge V2 Data

Using curl or a REST client:

```bash
curl -X POST "https://wsmontes.pythonanywhere.com/api/import/concierge-v2" \
  -H "Content-Type: application/json" \
  -d @concierge_export_example_v2.json
```

### 7.2 Verify Import

Check entities:
```bash
curl "https://wsmontes.pythonanywhere.com/api/entities?per_page=5"
```

## Step 8: Troubleshooting

### 8.1 Check Error Logs

1. Go to **Web** tab
2. Click **Error log** link
3. Look for Python errors and database connection issues

### 8.2 Common Issues

#### Database Connection Errors
- Verify MySQL password in environment variables
- Check database name format: `wsmontes$concierge_db`
- Ensure database exists and tables are created

#### Import Errors
- Check package installation: `mysql-connector-python`
- Verify Python path in WSGI file
- Check file permissions

#### Module Import Errors
- Ensure all files are uploaded
- Verify Python path in WSGI configuration
- Check requirements.txt installation

### 8.3 Debug Console

Open a Python console to test imports:

```python
import sys
sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')

# Test database connection
from database import get_db
db = get_db()
print(db.health_check())

# Test model import
from models import EntityModel
print("Models imported successfully")
```

## Step 9: API Usage

### 9.1 Base URL

Your API is now available at:
```
https://wsmontes.pythonanywhere.com/api
```

### 9.2 Key Endpoints

- Health check: `GET /api/health`
- API info: `GET /api/info`
- List entities: `GET /api/entities`
- Get entity: `GET /api/entities/{id}`
- Create entity: `POST /api/entities`
- Import V2 data: `POST /api/import/concierge-v2`

### 9.3 Example Usage

```bash
# Get all restaurants
curl "https://wsmontes.pythonanywhere.com/api/entities?entity_type=restaurant"

# Search for specific restaurant
curl "https://wsmontes.pythonanywhere.com/api/entities?search=osteria"

# Create new restaurant
curl -X POST "https://wsmontes.pythonanywhere.com/api/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "restaurant",
    "name": "My Restaurant",
    "entity_data": {"cuisine": ["Italian"]},
    "created_by": "api-user"
  }'
```

## Step 10: Maintenance

### 10.1 Database Backups

Regular backups are recommended:
1. Use PythonAnywhere's backup features
2. Export data via API endpoints
3. Regular JSON exports of entity_data

### 10.2 Monitoring

Monitor your API:
- Check error logs regularly
- Monitor `/api/health` endpoint
- Set up alerts for 500 errors

### 10.3 Updates

To update the API:
1. Upload new files
2. Reload web app
3. Test functionality
4. Check error logs

## Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Secret Key**: Use a strong, unique secret key
3. **CORS**: Configure CORS_ORIGINS for production (not `*`)
4. **Database**: Use secure MySQL password
5. **API Access**: Consider adding authentication for production use

## Support

For issues:
1. Check the `/api/health` endpoint first
2. Review error logs in PythonAnywhere
3. Verify database connectivity
4. Test with simple curl commands
5. Check the README.md for API documentation

Your Concierge Entities API should now be running successfully on PythonAnywhere!