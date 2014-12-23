FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"
ENV VERSION 3.0 <%= `git rev-parse --short HEAD`.strip %>

COPY src /core

VOLUME ["/core/config", "/core/cert"]

WORKDIR /core
ENTRYPOINT ["node", "app.js"]

EXPOSE 10022