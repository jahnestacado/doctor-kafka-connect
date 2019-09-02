const superagent = require("superagent");
const kafkaConnectHostname = process.env.KAFKA_CONNECT_HOSTNAME || "localhost";
const kafkaConnectPort = process.env.KAFKA_CONNECT_PORT || 8083;
const kafkaConnectTargetWorkerIds = (process.env.KAFKA_CONNECT_TARGET_WORKER_IDS || "").split(",");
const extractState = require("./../utils/stateExtractor.js");
const ip = require("ip");
const localIpAddress = ip.address();
const log = require("loglevel");

module.exports = function checkHealth(request, response, next) {
    const connectorName = request.params.connector;
    superagent
        .get(`${kafkaConnectHostname}:${kafkaConnectPort}/connectors/${connectorName}/status`)
        .end((err, kafkaConnectResponse) => {
            if (!err) {
                const { status, body } = kafkaConnectResponse;
                const { tasks } = body;
                request.healthcheck = extractState(
                    localIpAddress,
                    tasks,
                    kafkaConnectTargetWorkerIds
                );
                log.trace(
                    `Forwarded healthcheck state to router -> ${JSON.stringify(
                        request.healthcheck
                    )}`
                );
            }
            next(err);
        });
};
