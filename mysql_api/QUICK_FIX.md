# 
# Quick Fix Reference - PythonAnywhere 500 Error
# Step-by-step checklist for fixing server errors
#

## Quick Diagnosis

Run this on PythonAnywhere Bash console:
```bash
cd /home/wsmontes/Concierge-Analyzer/mysql_api
python3.10 diagnose_server.py
```

## Quick Fix Steps

### 1. Upload Fixed Files (2 minutes)

Via PythonAnywhere Files interface:
- Upload `app.py` to `/home/wsmontes/Concierge-Analyzer/mysql_api/`
- Upload `wsgi_enhanced.py` to `/home/wsmontes/Concierge-Analyzer/mysql_api/`

### 2. Set Environment Variable (1 minute)

**Web tab → Environment variables → Add:**
```
Name: MYSQL_PASSWORD
Value: [your MySQL password]
```

### 3. Update WSGI File (2 minutes)

**Web tab → Code section → WSGI configuration file**

Replace entire content with:
```python
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

os.chdir('/home/wsmontes/Concierge-Analyzer/mysql_api')

try:
    from app import app as application
    logger.info("Application loaded successfully")
except Exception as e:
    logger.error(f"Failed to load application: {e}")
    from flask import Flask, jsonify
    application = Flask(__name__)
    
    @application.route('/')
    @application.route('/<path:path>')
    def error(path=''):
        return jsonify({'error': str(e)}), 500
```

### 4. Reload Web App (30 seconds)

**Web tab → Click "Reload" button**

### 5. Test (30 seconds)

```bash
curl https://wsmontes.pythonanywhere.com/api/health
```

Expected: `{"status": "healthy", ...}`

## If Still Failing

### Check Error Log
**Web tab → Error log (bottom of page)**

Look for:
- `ImportError` → Missing dependencies
- `ValueError: MYSQL_PASSWORD` → Environment variable not set
- `mysql.connector.Error` → Database connection issue

### Common Fixes

**Missing Dependencies:**
```bash
pip3.10 install --user flask flask-cors mysql-connector-python python-dotenv
```

**Database Connection:**
```bash
# Test in MySQL console (Databases tab):
USE wsmontes$concierge_db;
SHOW TABLES;
```

**Wrong Python Version:**
- Check Web tab shows Python 3.10
- If different, reinstall dependencies for that version

## Verification Checklist

- [ ] `diagnose_server.py` shows all checks passed
- [ ] Environment variable `MYSQL_PASSWORD` is set
- [ ] WSGI file updated and saved
- [ ] Web app reloaded
- [ ] Error log shows no errors
- [ ] `/api/health` returns 200 OK
- [ ] Response includes CORS headers

## CORS Headers Check

```bash
curl -v https://wsmontes.pythonanywhere.com/api/health 2>&1 | grep -i access-control
```

Should see:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## Still Not Working?

1. Run diagnostics: `python3.10 diagnose_server.py`
2. Save output from Error log
3. Test database connection independently
4. Verify file uploads were successful
5. Check Python version matches requirements

## Emergency Rollback

If you need to rollback:

1. **Web tab → WSGI configuration**
2. Restore to simple version:
```python
import sys
sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
from app import app as application
```
3. **Reload** web app

## Success Indicators

✅ No 500 errors
✅ `/api/health` returns JSON
✅ CORS headers present in response
✅ No errors in Error log
✅ Browser console shows no CORS errors

## Time Required

- **Minimum**: 5 minutes (if everything goes smoothly)
- **Maximum**: 30 minutes (if troubleshooting needed)
- **Most common**: 10 minutes

## Key Files

- **Application**: `/home/wsmontes/Concierge-Analyzer/mysql_api/app.py`
- **WSGI Config**: Via Web tab → WSGI configuration file link
- **Environment**: Web tab → Environment variables section
- **Logs**: Web tab → Error log / Server log links
- **Database**: Databases tab → MySQL console

## Contact Points

- **Error Log**: Most detailed error information
- **Server Log**: Request/response information  
- **Bash Console**: For running diagnostics
- **MySQL Console**: For database testing
