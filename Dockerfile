FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION 3.0.5014

COPY src /core

VOLUME ["/core/cert"]

WORKDIR /core
RUN npm install && npm cache clear

EXPOSE 10022
ENTRYPOINT ["/docker-entrypoint.sh"]