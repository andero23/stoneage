FROM node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=8125
EXPOSE 8125
VOLUME /app/data
CMD ["node", "server.js"]
