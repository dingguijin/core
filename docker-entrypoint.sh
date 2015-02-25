#!/bin/bash
set -e

if [ "$SSL" ]; then
	sed -i 's/SSL/'$SSL'/g' /core/conf/config.json
else
	sed -i 's/SSL/false/g' /core/conf/config.json
fi

if [ "$FS_HOST" ]; then
	sed -i 's/FS_HOST/'$FS_HOST'/g' /core/conf/config.json
fi

if [ "$CONSOLE_HOST" ]; then
	sed -i 's/CONSOLE_HOST/'$CONSOLE_HOST'/g' /core/conf/config.json
fi

if [ "$CONSOLE_PASSWORD" ]; then
	sed -i 's/CONSOLE_PASSWORD/'$CONSOLE_PASSWORD'/g' /core/conf/config.json
else
	sed -i 's/CONSOLE_PASSWORD//g' /core/conf/config.json
fi

if [ "$LOGLEVEL" ]; then
	sed -i 's/LOGLEVEL/'$LOGLEVEL'/g' /core/conf/config.json
else
	sed -i 's/LOGLEVEL/warn/g' /core/conf/config.json
fi

exec node app.js