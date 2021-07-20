from __future__ import absolute_import, unicode_literals

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SECRET_KEY = os.environ.get('SECRET_KEY')

try:
    from .local import *
except ImportError:
    pass
