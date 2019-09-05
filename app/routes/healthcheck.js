const express = require("express");
const checkHealth = require("./../middlewares/kafkaConnectProxy.js");
const healthcheckRouter = express.Router();
const log = require("loglevel");

healthcheckRouter.get("/healthcheck/:connector", checkHealth, (request, response) => {
    const { status, failures = [] } = request.healthcheck;
    const responseMessage = failures.length ? `Failures: ${JSON.stringify(failures)}` : "OK";
    const connectorName = request.params.connector;
    log.info(`/healthcheck/:${connectorName}" ->  status: ${status} message: ${responseMessage}`);
    response.status(status).json(responseMessage);
});

module.exports = healthcheckRouter;
