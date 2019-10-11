const superagent = require("superagent");
const stateExtractor = require("./../utils/stateExtractor.js");
const log = require("loglevel");

module.exports = (drKafkaConnectConfig) =>
    function checkWorkersHealth(request, response, next) {
        const { hostname, port, targetWorkerIds } = drKafkaConnectConfig;

        superagent.get(`${hostname}:${port}/connectors`).end((err, kafkaConnectResponse) => {
            if (!err) {
                const { status, body: connectorNames } = kafkaConnectResponse;

                stateExtractor
                    .assessWorkersHealth(connectorNames, drKafkaConnectConfig)
                    .then((states) => {
                        request.healthcheck = states.reduce(
                            (finalState, state) => {
                                finalState.failures = finalState.failures.concat(state.failures);
                                finalState.status =
                                    finalState.status === 200 && state.failures.length ? 503 : 200;
                                return finalState;
                            },
                            { status: 200, failures: [] }
                        );
                        log.trace(
                            `Forwarded healthcheck for worker: ${targetWorkerIds} state to router -> ${JSON.stringify(
                                request.healthcheck
                            )}`
                        );
                        next();
                    })
                    .catch(next);
            } else {
                next(err);
            }
        });
    };
