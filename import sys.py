import sys
import os

# Add your project directory to the Python path
path = '/home/wsmontes/Concierge-Analyzer'
if path not in sys.path:
    sys.path.insert(0, path)

# Set the current working directory
os.chdir(path)

# Import your Flask application
from concierge_parser import app as application

# The PythonAnywhere WSGI handler expects an object called 'application'
# Now 'application' refers to your Flask app
