"""
Shared configuration for Video Processing Suite
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.absolute()

class Config:
    """Base configuration"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Flask settings
    DEBUG = os.environ.get('FLASK_ENV', 'development') == 'development'
    TESTING = False
    
    # File upload settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))  # 500MB
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}
    
    # Directories
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    PROCESSED_FOLDER = BASE_DIR / 'processed'
    LOG_FOLDER = BASE_DIR / 'logs'
    
    # Service URLs
    MAIN_APP_URL = os.environ.get('MAIN_APP_URL', 'http://localhost:5000')
    WATERMARK_SERVICE_URL = os.environ.get('WATERMARK_SERVICE_URL', 'http://localhost:8000')
    TAMPER_DETECTION_SERVICE_URL = os.environ.get('TAMPER_DETECTION_SERVICE_URL', 'http://localhost:8001')
    
    # Watermark settings
    MAX_WATERMARK_LENGTH = int(os.environ.get('MAX_WATERMARK_LENGTH', 50))
    DEFAULT_WATERMARK_STRENGTH = float(os.environ.get('DEFAULT_STRENGTH', 0.1))
    BLOCK_SIZE = int(os.environ.get('BLOCK_SIZE', 8))
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    
    # Rate limiting
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')
    
    @staticmethod
    def init_app(app):
        """Initialize application with this config"""
        # Create required directories
        for folder in [Config.UPLOAD_FOLDER, Config.PROCESSED_FOLDER, Config.LOG_FOLDER]:
            folder.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    UPLOAD_FOLDER = Config.BASE_DIR / 'test_uploads'
    PROCESSED_FOLDER = Config.BASE_DIR / 'test_processed'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """Get configuration object"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    return config.get(config_name, config['default'])
