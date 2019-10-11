const nock = require("nock");
const createWorkerHealthMW = require("./../../app/middlewares/workerHealth.js");
const chai = require("chai");
const expect = chai.expect;

const testWorkerId = "test-worker-id:9090";
const drKafkaConnectConfig = {
    hostname: "localhost",
    port: 8083,
    targetWorkerIds: testWorkerId,
};

describe("when hitting the workerHealth middleware", () => {
    let checkWorkerHealth;
    const connectors = ["foo-0-connector", "foo-1-connector"];
    beforeEach(() => {
        checkWorkerHealth = createWorkerHealthMW(drKafkaConnectConfig);
    });
    describe("and all Kafka Connect Endpoints return a 200 response", () => {
        const expectHealthcheckResult = {
            status: 503,
            failures: [
                { workerId: "test-worker-id:9090", taskId: 0 },
                { workerId: "test-worker-id:9090", taskId: 0 },
            ],
        };

        beforeEach(() => {
            nock("http://localhost:8083")
                .get(`/connectors`)
                .reply(200, connectors);

            connectors.forEach((connector) => {
                nock("http://localhost:8083")
                    .get(`/connectors/${connector}/status`)
                    .reply(200, {
                        status: 200,
                        tasks: [
                            { id: 0, worker_id: testWorkerId, state: "FAILED" },
                            { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                        ],
                    });
            });
        });
        const request = {};
        beforeEach((done) => {
            checkWorkerHealth(request, {}, done);
        });

        it("should attach the expected healthcheck result on the request object", () => {
            expect(request.healthcheck).to.deep.equal(expectHealthcheckResult);
        });
    });
    describe("and one of the Kafka Connect Endpoints returns an error", () => {
        const connector = "foo-1-connector";

        beforeEach(() => {
            nock("http://localhost:8083")
                .get(`/connectors`)
                .reply(200, connectors);

            nock("http://localhost:8083")
                .get(`/connectors/${connectors[0]}/status`)
                .reply(200, {
                    status: 200,
                    tasks: [
                        { id: 0, worker_id: testWorkerId, state: "FAILED" },
                        { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                    ],
                });

            nock("http://localhost:8083")
                .get(`/connectors/${connectors[1]}/status`)
                .reply(503, {});
        });

        let error = null;
        const request = {};
        beforeEach((done) => {
            checkWorkerHealth(request, {}, (err) => {
                error = err;
                done();
            });
        });

        it("should call the next function with an error", () => {
            expect(error.status).to.equal(503);
        });
    });
});
