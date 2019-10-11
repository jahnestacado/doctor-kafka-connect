const express = require("express");
const createCheckConnectorsHealth = require("./../middlewares/connectorHealth.js");
const createCheckWorkersHealth = require("./../middlewares/workerHealth.js");
const healthcheckRouter = express.Router();
const log = require("loglevel");
const drKafkaConnectConfig = {
    hostname: process.env.KAFKA_CONNECT_HOSTNAME || "localhost",
    port: process.env.KAFKA_CONNECT_PORT || 8083,
    targetWorkerIds: (process.env.KAFKA_CONNECT_TARGET_WORKER_IDS || "").split(","),
};

healthcheckRouter.get(
    "/healthcheck",
    createCheckWorkersHealth(drKafkaConnectConfig),
    (request, response) => {
        const { status, failures = [] } = request.healthcheck;
        const responseMessage = failures.length ? `Failures: ${JSON.stringify(failures)}` : "OK";
        log.info(`/healthcheck" ->  status: ${status} message: ${responseMessage}`);
        response.status(status).json(responseMessage);
    }
);

healthcheckRouter.get(
    "/healthcheck/:connector",
    createCheckConnectorsHealth(drKafkaConnectConfig),
    (request, response) => {
        const { status, failures = [] } = request.healthcheck;
        const responseMessage = failures.length ? `Failures: ${JSON.stringify(failures)}` : "OK";
        const connectorName = request.params.connector;
        log.info(
            `/healthcheck/:${connectorName}" ->  status: ${status} message: ${responseMessage}`
        );
        response.status(status).json(responseMessage);
    }
);

module.exports = healthcheckRouter;
