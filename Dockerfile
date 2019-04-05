FROM node:8

WORKDIR /usr/src/app
COPY package.json ./

RUN npm install

COPY . .

EXPOSE 8001
ENV NODE_ENV=development

CMD [ "npm", "start" ]
