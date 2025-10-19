# 
# Configuration Management for Concierge Entities API
# Environment-based configuration for database and API settings
# Dependencies: os for environment variables
#

import os
from typing import Dict, Any

class Config:
    """Base configuration class"""
    
    # API Configuration
    API_NAME = "Concierge Entities API"
    API_VERSION = "1.0.0"
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Database Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'wsmontes.mysql.pythonanywhere-services.com')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'wsmontes')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD')  # Required
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'wsmontes$concierge_db')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', '3306'))
    
    # Connection Pool Configuration
    MYSQL_POOL_SIZE = int(os.environ.get('MYSQL_POOL_SIZE', '5'))
    MYSQL_POOL_NAME = os.environ.get('MYSQL_POOL_NAME', 'concierge_pool')
    
    # API Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    JSON_SORT_KEYS = False
    
    # Pagination defaults
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    @classmethod
    def validate_required_config(cls) -> tuple[bool, list]:
        """Validate that all required configuration is present"""
        required_vars = ['MYSQL_PASSWORD']
        missing_vars = []
        
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
        
        return len(missing_vars) == 0, missing_vars
    
    @classmethod
    def get_database_config(cls) -> Dict[str, Any]:
        """Get database configuration as dictionary"""
        return {
            'host': cls.MYSQL_HOST,
            'user': cls.MYSQL_USER,
            'password': cls.MYSQL_PASSWORD,
            'database': cls.MYSQL_DATABASE,
            'port': cls.MYSQL_PORT,
            'pool_size': cls.MYSQL_POOL_SIZE,
            'pool_name': cls.MYSQL_POOL_NAME
        }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    MYSQL_DATABASE = 'wsmontes$concierge_test_db'

# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

def get_config(config_name: str = None):
    """Get configuration class based on environment"""
    if not config_name:
        config_name = os.environ.get('FLASK_ENV', 'production')
    
    return config_map.get(config_name, ProductionConfig)