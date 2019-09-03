const log = require("loglevel");

const extractState = (publicIpAddress = "localhost", tasks = [], targetWorkerIds = []) => {
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
                res.status = 500;
                res.failures.push({ workerId: worker_id, taskId: id });
                return res;
            },
            { status: 200, failures: [] }
        );

    return state;
};

module.exports = extractState;
