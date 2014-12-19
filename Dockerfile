FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

COPY src /core

VOLUME ["/core/config", "/core/cert"]

WORKDIR /core
ENTRYPOINT ["node", "app.js"]

EXPOSE 10022