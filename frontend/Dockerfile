FROM node:18-alpine

WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm install

# Sao chép mã nguồn và build ứng dụng Next.js
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]