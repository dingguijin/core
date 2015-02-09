#!/bin/bash
set -e

if [ "$SSL" ]; then
	sed -i 's/SSL/'$SSL'/g' /core/config/config.json
else
	sed -i 's/SSL/false/g' /core/config/config.json
fi

if [ "$FS_HOST" ]; then
	sed -i 's/FS_HOST/'$FS_HOST'/g' /core/config/config.json
fi

if [ "$MONGODB_HOST" ]; then
	sed -i 's/MONGODB_HOST/'$MONGODB_HOST'/g' /core/config/config.json
fi

if [ "$CONSOLE_HOST" ]; then
	sed -i 's/CONSOLE_HOST/'$CONSOLE_HOST'/g' /core/config/config.json
fi

if [ "$CONSOLE_PASSWORD" ]; then
	sed -i 's/CONSOLE_PASSWORD/'$CONSOLE_PASSWORD'/g' /core/config/config.json
else
	sed -i 's/CONSOLE_PASSWORD//g' /core/config/config.json
fi

if [ "$LOGLEVEL" ]; then
	sed -i 's/LOGLEVEL/'$LOGLEVEL'/g' /core/config/config.json
else
	sed -i 's/LOGLEVEL/warn/g' /core/config/config.json
fi

if [ "$LOGSTASH_ENABLE" ]; then
	sed -i 's/LOGSTASH_ENABLE/'$LOGSTASH_ENABLE'/g' /core/config/config.json
else
	sed -i 's/LOGSTASH_ENABLE/false/g' /core/config/config.json
fi

if [ "$LOGSTASH_HOST" ]; then
	sed -i 's/LOGSTASH_HOST/'$LOGSTASH_HOST'/g' /core/config/config.json
fi

if [ "$TOKEN_KEY" ]; then
	sed -i 's/TOKEN_KEY/'$TOKEN_KEY'/g' /core/config/config.json
fi

exec node app.js