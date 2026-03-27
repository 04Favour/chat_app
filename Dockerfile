FROM node:alpine

WORKDIR /app

COPY /package.json /app

COPY /yarn.lock /app

RUN yarn install

COPY . .

EXPOSE 3009

CMD ["node", "dist/main.js"]