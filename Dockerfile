FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION
ENV WEBITEL_MAJOR 3.1
ENV WEBITEL_REPO_BASE https://github.com/webitel

ENV NODE_ENV production
ENV NODE_TLS_REJECT_UNAUTHORIZED 0

COPY src /core
COPY docker-entrypoint.sh /

WORKDIR /core
RUN npm install && npm cache clear

EXPOSE 10022
ENTRYPOINT ["/docker-entrypoint.sh"]
