from node:8-alpine

env USER=pull-review

run addgroup -S $USER && adduser -S -g $USER $USER

workdir /home/$USER
user $USER

copy package.json package.json
run npm install --production && npm cache clean --force

copy index.js index.js
copy bin bin/
copy src src/

entrypoint ["node", "/home/pull-review/bin/pull-review.js"]
