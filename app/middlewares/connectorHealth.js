const stateExtractor = require("./../utils/stateExtractor.js");
const log = require("loglevel");

module.exports = (drKafkaConnectConfig) =>
    function checkConnectorHealth(request, response, next) {
        const connectorName = request.params.connector;
        stateExtractor
            .assessConnectorsHealth(connectorName, drKafkaConnectConfig)
            .then((state) => {
                request.healthcheck = state;
                log.trace(
                    `Forwarded healthcheck for connector: ${connectorName} state to router -> ${JSON.stringify(
                        request.healthcheck
                    )}`
                );
                next();
            })
            .catch(next);
    };
