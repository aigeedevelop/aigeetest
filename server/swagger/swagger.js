const swaggerUi = require("swagger-ui-express")
const swaggereJsdoc = require("swagger-jsdoc")

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "aigee",
      description: "aigee RestFul API 클라이언트 UI",
    },
    servers: [
      {
        url: "http://localhost:3500", // 요청 URL
      },
    ],
  },
  apis: ["./auth/index.js", "./server/http_server.js"], //Swagger 파일 연동
}
const specs = swaggereJsdoc(options)

module.exports = { swaggerUi, specs }