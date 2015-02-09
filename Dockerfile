FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION 3.0.5014

COPY src /core
COPY docker-entrypoint.sh /

VOLUME ["/core/cert"]

WORKDIR /core

EXPOSE 10022
ENTRYPOINT ["/docker-entrypoint.sh"]