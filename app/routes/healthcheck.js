/**
 * redux-tattoo <https://github.com/jahnestacado/doctor-kafka-connect>
 * Copyright (c) 2019 Ioannis Tzanellis
 * Licensed under the MIT License (MIT).
 */
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
        const responseMessage = failures.length
            ? `Failures: ${JSON.stringify(failures, 0, 2)}`
            : "OK";
        log.info(`/healthcheck" ->  status: ${status} message: ${responseMessage}`);
        response.status(status).json(responseMessage);
    }
);

healthcheckRouter.get(
    "/healthcheck/:connector",
    createCheckConnectorsHealth(drKafkaConnectConfig),
    (request, response) => {
        const { status, failures = [] } = request.healthcheck;
        const responseMessage = failures.length
            ? `Failures: ${JSON.stringify(failures, 0, 2)}`
            : "OK";
        const connector = request.params.connector;
        log.info(`/healthcheck/:${connector}" ->  status: ${status} message: ${responseMessage}`);
        response.status(status).json(responseMessage);
    }
);

module.exports = healthcheckRouter;
