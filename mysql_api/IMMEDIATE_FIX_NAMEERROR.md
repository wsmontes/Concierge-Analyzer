# 
# IMMEDIATE FIX - NameError in WSGI
# This fixes the "NameError: name 'e' is not defined" issue
#

## The Problem

The WSGI configuration has a scope error where the exception variable `e` is not accessible in the error handler function.

## The Fix (2 minutes)

### Step 1: Copy the Fixed WSGI Code

Copy **ALL** of the following code:

```python
import sys
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
    if mysql_api_path not in sys.path:
        sys.path.insert(0, mysql_api_path)
        logger.info(f"Added {mysql_api_path} to Python path")

    os.chdir('/home/wsmontes/Concierge-Analyzer/mysql_api')
    logger.info(f"Changed working directory to {os.getcwd()}")

    has_password = 'MYSQL_PASSWORD' in os.environ
    logger.info(f"MYSQL_PASSWORD is {'set' if has_password else 'NOT SET'}")

    logger.info("Importing Flask application...")
    from app import app as application
    logger.info("Flask application imported successfully")

except Exception as init_error:
    error_message = str(init_error)
    error_type = type(init_error).__name__
    
    logger.error(f"WSGI initialization failed: {error_message}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    from flask import Flask, jsonify
    from flask_cors import CORS
    
    application = Flask(__name__)
    CORS(application, resources={r"/*": {"origins": "*"}})
    
    @application.route('/', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    @application.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    def error_handler(path=''):
        return jsonify({
            'status': 'error',
            'error': 'Server initialization failed',
            'error_type': error_type,
            'details': error_message,
            'message': 'Check server logs. Common issues: missing MYSQL_PASSWORD, import errors, database connectivity.'
        }), 500
```

### Step 2: Update WSGI Configuration on PythonAnywhere

1. Go to **PythonAnywhere Dashboard**
2. Click **Web** tab
3. Click on **WSGI configuration file** link (under "Code" section)
4. **Delete ALL existing content**
5. **Paste the code from Step 1**
6. Click **Save** (or Ctrl+S)

### Step 3: Reload Web App

1. Still on **Web** tab
2. Click the green **"Reload wsmontes.pythonanywhere.com"** button
3. Wait for confirmation message

### Step 4: Test

```bash
curl https://wsmontes.pythonanywhere.com/api/health
```

## What Was Fixed

**Before (broken):**
```python
except Exception as e:
    # ... setup code ...
    
    @application.route('/<path:path>')
    def error_handler(path=''):
        return jsonify({
            'details': str(e),  # ❌ 'e' not accessible here
        }), 500
```

**After (fixed):**
```python
except Exception as init_error:
    error_message = str(init_error)  # ✅ Store it first
    
    @application.route('/<path:path>')
    def error_handler(path=''):
        return jsonify({
            'details': error_message,  # ✅ Use stored value
        }), 500
```

## Why This Happened

The exception variable `e` only exists within the `except` block. When the error handler function is called later (during an HTTP request), that variable is out of scope. The fix stores the error message in a variable that persists.

## Expected Behavior After Fix

If there's still an initialization error, you'll now get a **proper error response with CORS headers** instead of a `NameError`:

```json
{
  "status": "error",
  "error": "Server initialization failed",
  "error_type": "ImportError",
  "details": "No module named 'mysql.connector'",
  "message": "Check server logs. Common issues: missing MYSQL_PASSWORD, import errors, database connectivity."
}
```

This will help identify the **actual** problem (like missing dependencies or environment variables).

## Next Steps After Applying This Fix

Once the NameError is fixed, you may see the **real** error. Common issues:

### 1. Missing MYSQL_PASSWORD
**Error:** `ValueError: MYSQL_PASSWORD environment variable is required`

**Fix:** Web tab → Environment variables → Add:
```
Name: MYSQL_PASSWORD
Value: [your actual MySQL password]
```

### 2. Import Errors
**Error:** `ImportError: No module named 'flask_cors'`

**Fix:** Open Bash console:
```bash
pip3.10 install --user flask flask-cors mysql-connector-python python-dotenv
```

### 3. Database Connection Error
**Error:** `mysql.connector.errors.DatabaseError`

**Fix:** Verify database credentials in environment variables

## Verification

After fixing, the health endpoint should work:

```bash
curl https://wsmontes.pythonanywhere.com/api/health
```

Expected:
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

## Files Updated

These local files have been fixed:
- ✅ `mysql_api/wsgi.py`
- ✅ `mysql_api/wsgi_enhanced.py`
- ✅ `mysql_api/wsgi_fixed.py` (new - clean version)

Upload **`wsgi_fixed.py`** or copy its content to PythonAnywhere WSGI config.

## Time Required

- **2 minutes** to copy/paste and reload

---

**Critical:** The NameError was masking the real error. Once fixed, you'll see what's **actually** preventing the app from starting.
