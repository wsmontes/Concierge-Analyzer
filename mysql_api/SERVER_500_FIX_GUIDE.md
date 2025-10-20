# 
# Server-Side 500 Error Fix Guide
# Comprehensive guide to fix CORS and 500 errors on PythonAnywhere
#

## Problem Summary

The server at `wsmontes.pythonanywhere.com` is returning:
- **500 Internal Server Error** responses
- **Missing CORS headers** (causing client-side CORS errors)

This is a **server-side problem**, not a client configuration issue.

## Root Causes

Potential causes of 500 errors on PythonAnywhere:

1. **Missing or incorrect environment variables** (most common)
   - `MYSQL_PASSWORD` not set
   - Database credentials incorrect

2. **Import failures**
   - Missing dependencies (`flask-cors`, `mysql-connector-python`)
   - Python path issues

3. **Database connectivity issues**
   - Database not accessible
   - Connection pool initialization failures

4. **WSGI configuration errors**
   - Incorrect paths
   - Import errors in WSGI file

## Solutions Applied

### 1. Enhanced CORS Configuration

**File: `mysql_api/app.py`**

Changed CORS configuration from:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

To:
```python
CORS(app, 
     resources={
         r"/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": False,
             "max_age": 3600
         }
     })
```

**Why:** This enables CORS for ALL routes (not just `/api/*`) and explicitly defines all CORS settings.

### 2. Better Error Handling

Added comprehensive error handlers:

```python
@app.errorhandler(Exception)
def handle_exception(error):
    """Handle all uncaught exceptions"""
    logger.error(f"Unhandled exception: {error}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    return create_api_response(
        status="error",
        error=str(error),
        status_code=500
    )
```

**Why:** This catches all exceptions and logs detailed error information to help diagnose the problem.

### 3. OPTIONS Request Handler

Added explicit OPTIONS handler for CORS preflight:

```python
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle OPTIONS requests for CORS preflight"""
    return '', 204
```

**Why:** Ensures CORS preflight requests are handled correctly.

### 4. Enhanced WSGI Configuration

**File: `mysql_api/wsgi_enhanced.py`**

Added:
- Comprehensive logging
- Environment variable checks
- Error handling during initialization
- Fallback error app if initialization fails

**Why:** Provides detailed diagnostics and prevents silent failures.

### 5. Diagnostic Script

**File: `mysql_api/diagnose_server.py`**

A script that checks:
- Python version
- All required imports
- Environment variables
- Database connectivity
- Flask app initialization
- Route registration

**Why:** Helps identify the exact cause of server errors.

## Deployment Steps

### Step 1: Upload Fixed Files

Upload these files to PythonAnywhere:
```bash
# Upload via Files interface or use SCP:
scp mysql_api/app.py wsmontes@ssh.pythonanywhere.com:/home/wsmontes/Concierge-Analyzer/mysql_api/
scp mysql_api/wsgi_enhanced.py wsmontes@ssh.pythonanywhere.com:/home/wsmontes/Concierge-Analyzer/mysql_api/
scp mysql_api/diagnose_server.py wsmontes@ssh.pythonanywhere.com:/home/wsmontes/Concierge-Analyzer/mysql_api/
```

### Step 2: Run Diagnostics

1. Open a Bash console on PythonAnywhere
2. Run the diagnostic script:
   ```bash
   cd /home/wsmontes/Concierge-Analyzer/mysql_api
   python3.10 diagnose_server.py
   ```
3. Review the output to identify issues

### Step 3: Fix Environment Variables

If diagnostics show missing `MYSQL_PASSWORD`:

**Option A: Using .env file**
```bash
cd /home/wsmontes/Concierge-Analyzer/mysql_api
echo "MYSQL_PASSWORD=your_actual_password" >> .env
```

**Option B: Using PythonAnywhere Web Interface**
1. Go to Web tab
2. Scroll to "Environment variables" section
3. Add: `MYSQL_PASSWORD` = `your_actual_password`

### Step 4: Update WSGI Configuration

1. Go to PythonAnywhere Web tab
2. Click on WSGI configuration file link
3. Replace entire content with the content of `wsgi_enhanced.py`

OR update the import to use the enhanced version:
```python
# Change from:
from app import app as application

# To:
# Use the enhanced WSGI with better error handling
# (Copy the entire content of wsgi_enhanced.py here)
```

### Step 5: Reload Web App

1. In PythonAnywhere Web tab
2. Click the **Reload** button (big green button)
3. Wait for reload to complete

### Step 6: Test the Fix

Test the health endpoint:
```bash
curl -v https://wsmontes.pythonanywhere.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T...",
  "data": {
    "database": {"status": "healthy"},
    "api": "operational"
  }
}
```

Check for CORS headers in response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Step 7: Check Error Logs

If still getting 500 errors:

1. Go to PythonAnywhere Web tab
2. Click on "Error log" link
3. Review recent errors
4. Look for:
   - Import errors
   - Database connection errors
   - Missing environment variables

## Common Issues and Solutions

### Issue: "MYSQL_PASSWORD environment variable is required"

**Solution:**
```bash
# Add to .env file:
echo "MYSQL_PASSWORD=your_password" > /home/wsmontes/Concierge-Analyzer/mysql_api/.env

# OR set in PythonAnywhere Web interface under Environment variables
```

### Issue: "Import 'flask_cors' could not be resolved"

**Solution:**
```bash
# Install in Bash console:
pip3.10 install --user flask-cors mysql-connector-python python-dotenv
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Test connection in Bash console:
cd /home/wsmontes/Concierge-Analyzer/mysql_api
python3.10 -c "from database import DatabaseManager; db = DatabaseManager(); print(db.get_connection())"
```

Check:
- MySQL service is running
- Database exists
- Credentials are correct
- Host is correct: `wsmontes.mysql.pythonanywhere-services.com`

### Issue: Still getting CORS errors after fix

**Checklist:**
1. ✓ Verify app.py has the enhanced CORS configuration
2. ✓ Verify WSGI file is using the updated app.py
3. ✓ Web app has been reloaded
4. ✓ Browser cache is cleared
5. ✓ Testing with curl shows CORS headers in response

## Verification Commands

Run these commands to verify the fix:

```bash
# 1. Test health endpoint
curl -v https://wsmontes.pythonanywhere.com/api/health

# 2. Test with OPTIONS (CORS preflight)
curl -X OPTIONS -v https://wsmontes.pythonanywhere.com/api/health

# 3. Test from browser console
fetch('https://wsmontes.pythonanywhere.com/api/health', {
  method: 'GET',
  mode: 'cors'
}).then(r => r.json()).then(console.log).catch(console.error);

# 4. Check if CORS headers are present
curl -s -D - https://wsmontes.pythonanywhere.com/api/health -o /dev/null | grep -i access-control
```

## Expected Results After Fix

### Successful Response
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Content-Type: application/json

{
  "status": "healthy",
  "data": {...}
}
```

### Client-Side Success
- No CORS errors in browser console
- Successful data fetching
- Proper JSON responses

## Additional Resources

- **PythonAnywhere Error Log**: Web tab → Error log
- **PythonAnywhere Server Log**: Web tab → Server log  
- **Bash Console**: For running diagnostics and commands
- **MySQL Console**: Databases tab → MySQL console

## Support

If issues persist after following this guide:

1. Run `diagnose_server.py` and save output
2. Check error log and save recent errors
3. Verify all environment variables are set
4. Test database connection independently
5. Review WSGI configuration file

## Summary

The fixes applied:
- ✅ Enhanced CORS configuration for all routes
- ✅ Comprehensive error handling and logging
- ✅ OPTIONS request handler for CORS preflight
- ✅ Diagnostic script for troubleshooting
- ✅ Enhanced WSGI with better error reporting

The server-side issues should now be resolved. The 500 errors should be gone, and CORS headers should be present in all responses.
