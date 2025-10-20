# 
# Database Connection Module for Concierge Entities API
# Handles MySQL database connections for PythonAnywhere hosting
# Dependencies: mysql-connector-python
#

import mysql.connector
import os
import logging
from contextlib import contextmanager
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration management"""
    
    def __init__(self):
        self.host = os.environ.get('MYSQL_HOST', 'wsmontes.mysql.pythonanywhere-services.com')
        self.user = os.environ.get('MYSQL_USER', 'wsmontes')
        self.password = os.environ.get('MYSQL_PASSWORD')  # Must be set in environment
        self.database = os.environ.get('MYSQL_DATABASE', 'wsmontes$concierge_db')
        self.port = int(os.environ.get('MYSQL_PORT', '3306'))
        self.charset = 'utf8mb4'
        self.autocommit = False
        
        # Connection pool settings - reduced for PythonAnywhere
        self.pool_name = 'concierge_pool'
        self.pool_size = 2  # Reduced from 5 to avoid pool exhaustion on PythonAnywhere
        self.pool_reset_session = True
        
    def get_connection_params(self) -> Dict[str, Any]:
        """Get connection parameters as dictionary"""
        if not self.password:
            raise ValueError("MYSQL_PASSWORD environment variable is required")
            
        return {
            'host': self.host,
            'user': self.user,
            'password': self.password,
            'database': self.database,
            'port': self.port,
            'charset': self.charset,
            'autocommit': self.autocommit,
            'use_unicode': True,
            'sql_mode': 'STRICT_TRANS_TABLES',
            'time_zone': '+00:00'  # UTC
        }

class DatabaseManager:
    """Database connection manager with connection pooling"""
    
    def __init__(self):
        self.config = DatabaseConfig()
        self._pool = None
        # Don't initialize pool immediately - do it lazily
    
    def _initialize_pool(self):
        """Initialize MySQL connection pool"""
        if self._pool is not None:
            return  # Already initialized
            
        try:
            connection_params = self.config.get_connection_params()
            connection_params.update({
                'pool_name': self.config.pool_name,
                'pool_size': self.config.pool_size,
                'pool_reset_session': self.config.pool_reset_session
            })
            
            # Create the pool by making the first connection
            mysql.connector.pooling.MySQLConnectionPool(**connection_params)
            self._pool = True  # Mark as initialized
            logger.info(f"Database connection pool initialized successfully")
            
        except mysql.connector.Error as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error initializing database pool: {e}")
            raise
    
    def get_connection(self):
        """Get a connection from the pool"""
        if self._pool is None:
            self._initialize_pool()
            
        try:
            return mysql.connector.connect(pool_name=self.config.pool_name)
        except mysql.connector.Error as e:
            logger.error(f"Failed to get database connection: {e}")
            raise
    
    @contextmanager
    def get_cursor(self, dictionary=True):
        """Context manager for database operations"""
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=dictionary)
            yield cursor, connection
        except mysql.connector.Error as e:
            if connection:
                connection.rollback()
            logger.error(f"Database operation failed: {e}")
            raise
        except Exception as e:
            if connection:
                connection.rollback()
            logger.error(f"Unexpected error in database operation: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None, 
                     fetch_one: bool = False, dictionary: bool = True):
        """Execute a SELECT query and return results"""
        with self.get_cursor(dictionary=dictionary) as (cursor, connection):
            cursor.execute(query, params or ())
            
            if fetch_one:
                return cursor.fetchone()
            else:
                return cursor.fetchall()
    
    def execute_insert(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute an INSERT query and return the last insert ID"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            connection.commit()
            return cursor.lastrowid
    
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute an UPDATE query and return the number of affected rows"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            connection.commit()
            return cursor.rowcount
    
    def execute_delete(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute a DELETE query and return the number of affected rows"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            connection.commit()
            return cursor.rowcount
    
    def health_check(self) -> Dict[str, Any]:
        """Check database connectivity and return status"""
        try:
            result = self.execute_query("SELECT 1 as status", fetch_one=True)
            return {
                'status': 'healthy',
                'database': 'connected',
                'result': result
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e)
            }

# Global database manager instance
db_manager = DatabaseManager()

def get_db():
    """Get the global database manager instance"""
    return db_manager