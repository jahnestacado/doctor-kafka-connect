const log = require("loglevel");
const superagent = require("superagent");
const ip = require("ip");
const localIpAddress = ip.address();

const Utils = {
    extractState(publicIpAddress = "localhost", tasks = [], targetWorkerIds = []) {
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
                (res, { worker_id, id }) => {
                    res.status = 503;
                    res.failures.push({ workerId: worker_id, taskId: id });
                    return res;
                },
                { status: 200, failures: [] }
            );

        return state;
    },
    assessConnectorsHealth(connectorName, { hostname = "", port = "", targetWorkerIds = "" }) {
        return new Promise((resolve, reject) => {
            superagent
                .get(`${hostname}:${port}/connectors/${connectorName}/status`)
                .end((err, kafkaConnectResponse) => {
                    if (!err) {
                        const { status, body } = kafkaConnectResponse;
                        const { tasks } = body;
                        const state = Utils.extractState(localIpAddress, tasks, targetWorkerIds);
                        resolve(state);
                    } else {
                        reject(err);
                    }
                });
        });
    },
    assessWorkersHealth(connectorNames = [], drKafkaConnectConfig) {
        const promises = [];
        connectorNames.forEach((connectorName) => {
            promises.push(Utils.assessConnectorsHealth(connectorName, drKafkaConnectConfig));
        });
        return Promise.all(promises);
    },
};

module.exports = Utils;
