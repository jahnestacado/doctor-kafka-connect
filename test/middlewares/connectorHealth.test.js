/**
 * redux-tattoo <https://github.com/jahnestacado/doctor-kafka-connect>
 * Copyright (c) 2019 Ioannis Tzanellis
 * Licensed under the MIT License (MIT).
 */
const nock = require("nock");
const createConnectorHealthcheckMW = require("./../../app/middlewares/connectorHealth.js");
const chai = require("chai");
const expect = chai.expect;

const testWorkerId = "test-worker-id:9090";
const drKafkaConnectConfig = {
    hostname: "localhost",
    port: 8083,
    targetWorkerIds: testWorkerId,
};

describe("when hitting the connectorHealth middleware", () => {
    let checkHealth;
    beforeEach(() => {
        checkHealth = createConnectorHealthcheckMW(drKafkaConnectConfig);
    });
    describe("and the Kafka Connect Endpoint returns a 200 response", () => {
        const connector = "foo-0-connector";
        const request = { params: { connector } };
        const expectedHealthcheckResult = {
            status: 503,
            failures: [
                {
                    connector,
                    workerId: "test-worker-id:9090",
                    taskId: 0,
                    trace: "the stack trace...",
                },
            ],
        };
        beforeEach(() => {
            nock("http://localhost:8083")
                .get(`/connectors/${connector}/status`)
                .reply(200, {
                    status: 200,
                    tasks: [
                        {
                            id: 0,
                            worker_id: testWorkerId,
                            state: "FAILED",
                            trace: "the stack trace",
                        },
                        {
                            id: 1,
                            worker_id: testWorkerId,
                            state: "RUNNING",
                        },
                    ],
                });
        });
        beforeEach((done) => {
            checkHealth(request, {}, done);
        });

        it("should attach the expected healthcheck result on the request object", () => {
            expect(request.healthcheck).to.deep.equal(expectedHealthcheckResult);
        });
    });
    describe("and the Kafka Connect Endpoint returns an error", () => {
        const connector = "foo-1-connector";
        let error = null;
        const request = { params: { connector } };

        beforeEach(() => {
            nock("http://localhost:8083")
                .get(`/connectors/${connector}/status`)
                .reply(503, {});
        });
        beforeEach((done) => {
            checkHealth(request, {}, (err) => {
                error = err;
                done();
            });
        });

        it("should call the next function with an error", () => {
            expect(error.status).to.equal(503);
        });
    });
});
