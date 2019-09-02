const express = require("express");
const checkHealth = require("./../middlewares/checkHealth.js");
const healthcheckRouter = express.Router();

healthcheckRouter.get("/healthcheck/:connector", checkHealth, (request, response) => {
    const { status, failures } = request.healthcheck;
    const responseMessage = failures.length ? `Failed Kafka Connect tasks in: ${failures}` : "OK";
    console.log("HEALTHCHECK", status, responseMessage);
    response.status(status).json(responseMessage);
});

module.exports = healthcheckRouter;
