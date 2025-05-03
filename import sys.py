import sys
import os

# Add your project directory to the path
path = '/home/wsmontes/Concierge-Analyzer'
if path not in sys.path:
    sys.path.append(path)

# Import app from your renamed module
from concierge_parser import app as application
