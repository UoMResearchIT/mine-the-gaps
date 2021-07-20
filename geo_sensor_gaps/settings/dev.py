from __future__ import absolute_import, unicode_literals

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

try:
    print('trying local settings file')
    from .local import *
except ImportError:
    try:
        print('trying test settings file')
        from .test import *
    except ImportError:
        pass