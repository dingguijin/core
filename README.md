core
====

main Webitel node.js application

## Default ports

`10022/tcp` - WebSocket Server port

## Environment Variables

The CDR image uses several environment variables

### Server variables

`SSL` - enable https (default: false)

`CONSOLE_HOST` - Webitel Console host or IP

`CONSOLE_PASSWORD` - Webitel Console password

`CDR_SERVER` - CDR Server host or IP

`CDR_HTTP` - https or http (default: http)

`MONGODB_HOST` - MongoDB host or IP

`FS_HOST` - FreeSWITCH host or IP

`TOKEN_KEY` - application token key for storing session

### Logs

`LOGLEVEL` - log level (default: warn)

`LOGSTASH_ENABLE` - send logs to Logstash Server (default: false)

`LOGSTASH_HOST` - Logstash host or IP


## Supported Docker versions

This image is officially supported on Docker version `1.5` and newest.

## User Feedback

### Issues
If you have any problems with or questions about this image, please contact us through a [GitHub issue](https://github.com/webitel/core/issues).
