const ip = require("ip");
const log = require("loglevel");

const extractState = (localIpAddress = "localhost", tasks = [], targetWorkerIds = []) => {
    log.trace(`Current IP: ${localIpAddress}, TargetWorkerIds: ${JSON.stringify(targetWorkerIds)}`);
    const state = tasks
        .filter(({ worker_id, state, id }) => {
            const worker = worker_id.split(":")[0] || "";
            log.debug(`Checking task {id: ${id}, worker_id: ${worker_id}, state: ${state}}`);
            return (
                (targetWorkerIds.includes(worker_id) || worker === localIpAddress) &&
                state === "FAILED"
            );
        })
        .reduce(
            (res, { worker_id, id }) => {
                res.status = 500;
                res.failures.push({ workerId: worker_id, taskId: id });
                return res;
            },
            { status: 200, failures: [] }
        );

    return state;
};

module.exports = extractState;
