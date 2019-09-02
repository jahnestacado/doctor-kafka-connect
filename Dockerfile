FROM node:12.9.1-alpine
MAINTAINER Jahn Estacado

COPY . /kafka-connect-healthcheck
WORKDIR /kafka-connect-healthcheck
RUN npm install --production

ENTRYPOINT ["npm", "start"]
