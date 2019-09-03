const nock = require("nock");
const checkHealth = require("./../../app/middlewares/checkHealth.js");
const chai = require("chai");
const expect = chai.expect;

describe("when hitting the checkHealth middleware", () => {
    const testWorkerId = "test-worker-id:9090";
    beforeEach(() => {
        process.env.KAFKA_CONNECT_TARGET_WORKER_IDS = testWorkerId;
    });
    describe("and the Kafka Connect Endpoint returns a 200 response", () => {
        const connector = "foo-0-connector";
        const request = { params: { connector } };
        const expectHealthcheckResult = {
            status: 500,
            failures: [{ workerId: "test-worker-id:9090", taskId: 0 }],
        };
        beforeEach(() => {
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
        beforeEach((done) => {
            checkHealth(request, {}, done);
        });

        it("should attach the expected healthcheck result on the request object", () => {
            expect(request.healthcheck).to.deep.equal(expectHealthcheckResult);
        });
    });
    describe("and the Kafka Connect Endpoint returns an error", () => {
        const connector = "foo-1-connector";
        let error = null;
        const request = { params: { connector } };

        beforeEach(() => {
            nock("http://localhost:8083")
                .get(`/connectors/${connector}/status`)
                .reply(500, {});
        });
        beforeEach((done) => {
            checkHealth(request, {}, (err) => {
                error = err;
                done();
            });
        });

        it("should call the next function with an error", () => {
            expect(error.status).to.equal(500);
        });
    });
});
