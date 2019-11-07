##########################################################################
# Django local.py Settings Example Template
##########################################################################
# Copy this to local.py and edit setting as required.
# DO NOT COMMIT THE local.py FILE TO THE REPOSITORY
##########################################################################
# See https://docs.djangoproject.com/en/2.0/ref/settings/

# Security
# ------------------------------------------------------------------------
# See https://docs.djangoproject.com/en/1.10/topics/security/#ssl-https
# SECURE_HSTS_SECONDS = 3600 # 1 hour; change to 31536000 for 1 year when in production

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '5e#ol-mirtx-xjoe=#@wk8tvuv=yuoq(2ywd^)y8=8o2c+6v#3'


# Database(s)
# ------------------------------------------------------------------------
# https://docs.djangoproject.com/en/2.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'sensor_gaps',
        'USER': 'mcassag',
        'PASSWORD': 'sensor_gaps_pw',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Hosts
# ------------------------------------------------------------------------
# Hosts/domain names that are valid for this site; required if DEBUG is
# False.
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
# Use localhost/127.0.0.1 for debug/dev
# Use explicit host when in production

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
]

INTERNAL_IPS = [
    '127.0.0.1',
]

# Language
# ------------------------------------------------------------------------

LANGUAGE_CODE = 'en-gb'