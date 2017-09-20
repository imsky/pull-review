from node:8-alpine

env USER=pull-review
env HOME=/home/$USER

run addgroup -S $USER && adduser -S -g $USER $USER

workdir $HOME
user $USER

copy package.json .
run npm install --production && npm cache clean --force

copy index.js .
copy bin bin/
copy src src/

entrypoint ["node", "/home/pull-review/bin/pull-review.js"]
