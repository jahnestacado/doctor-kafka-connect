const express = require("express");
const checkHealth = require("./../middlewares/checkHealth.js");
const healthcheckRouter = express.Router();
const log = require("loglevel");

healthcheckRouter.get("/healthcheck/:connector", checkHealth, (request, response) => {
    const { status, failures = [] } = request.healthcheck;
    const responseMessage = failures.length ? `Failures: ${JSON.stringify(failures)}` : "OK";
    log.info(
        `/healthcheck/:${
            request.params.connector
        }" ->  status: ${status} message: ${responseMessage}`
    );
    response.status(status).json(responseMessage);
});

module.exports = healthcheckRouter;
