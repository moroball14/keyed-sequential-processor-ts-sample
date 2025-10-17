FROM node:20-alpine

RUN npm install -g npm@latest

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["echo", "Please specify a command"]