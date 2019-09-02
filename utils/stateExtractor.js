const ip = require("ip");
const localIpAddress = ip.address();

const extractState = (tasks = [], targetWorkerIds = []) => {
    const state = tasks
        .filter(({ worker_id, state }) => {
            const worker = worker_id.split(":")[0] || "";
            return (
                (targetWorkerIds.includes(worker_id) || worker === localIpAddress) &&
                state === "FAILED"
            );
        })
        .reduce(
            (res, { worker_id }) => {
                res.status = 500;
                res.failures.push(worker_id);
                return res;
            },
            { status: 200, failures: [] }
        );

    return state;
};

module.exports = extractState;
