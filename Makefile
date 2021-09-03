


# Controls
.PHONY : commands clean clean-all keys

# Default target
.DEFAULT_GOAL := commands


# files which are expected
KEY_FILE = keystring.txt


## I. Commands for building the website
## =================================================

## * docker-serve      : use Docker to serve the site
docker-serve : settings
	docker-compose up -d
	@echo "Server is running, connect at http://127.0.0.1:8000/"

## * docker-stop       : halts the Docker instances for the site
docker-stop : 
	docker-compose down


## * clean             : clean out the settings files
clean :
	rm -rf geo_sensor_gaps/settings/.docker-env
	rm -rf geo_sensor_gaps/settings/local.py

## * clean-all         : clean out the settings files, and secrets key
clean-all : clean
	rm -rf ${KEY_FILE}



## * settings          : create required settings file
settings : keys
	@cp geo_sensor_gaps/settings/local.template geo_sensor_gaps/settings/local.py
	@sed -e "s/\[INSERT A SECRET_KEY\]/$$(cat ${KEY_FILE})/" geo_sensor_gaps/settings/.docker-env.template > geo_sensor_gaps/settings/.docker-env

## * keys              : create required secret key for docker, to be stored in text file
keys : ${KEY_FILE}


${KEY_FILE} :
	@read -p "Enter : " enter; \
	echo $$enter > ${KEY_FILE}


##
## IV. Auxililary (plumbing) commands
## =================================================

## * commands          : show all commands. (borrowed from Software Carpentries templates)
commands :
	@sed -n -e '/^##/s|^##[[:space:]]*||p' $(MAKEFILE_LIST)