const log = require("loglevel");
const superagent = require("superagent");
const ip = require("ip");
const localIpAddress = ip.address();

const Utils = {
    extractState(publicIpAddress = "localhost", connector = "", tasks = [], targetWorkerIds = []) {
        log.trace(
            `Current IP: ${publicIpAddress}, TargetWorkerIds: ${JSON.stringify(targetWorkerIds)}`
        );
        const state = tasks
            .filter(({ worker_id, state, id }) => {
                const workerHostname = worker_id.split(":")[0] || "";
                log.debug(`Checking task {id: ${id}, worker_id: ${worker_id}, state: ${state}}`);

                const isTaskFailing =
                    (targetWorkerIds.includes(worker_id) || workerHostname === publicIpAddress) &&
                    state === "FAILED";

                return isTaskFailing;
            })
            .reduce(
                (res, { worker_id, id, trace }) => {
                    res.status = 503;
                    res.failures.push({
                        connector,
                        workerId: worker_id,
                        taskId: id,
                        trace: `${trace.slice(0, 200)}...`,
                    });
                    return res;
                },
                { status: 200, failures: [] }
            );

        return state;
    },
    assessConnectorsHealth(connector, { hostname = "", port = "", targetWorkerIds = "" }) {
        return new Promise((resolve, reject) => {
            superagent
                .get(`${hostname}:${port}/connectors/${connector}/status`)
                .end((err, kafkaConnectResponse) => {
                    if (!err) {
                        const { status, body } = kafkaConnectResponse;
                        const { tasks } = body;
                        const state = Utils.extractState(
                            localIpAddress,
                            connector,
                            tasks,
                            targetWorkerIds
                        );
                        resolve(state);
                    } else {
                        reject(err);
                    }
                });
        });
    },
    assessWorkersHealth(connectors = [], drKafkaConnectConfig) {
        const promises = [];
        connectors.forEach((connector) => {
            promises.push(Utils.assessConnectorsHealth(connector, drKafkaConnectConfig));
        });
        return Promise.all(promises);
    },
};

module.exports = Utils;
