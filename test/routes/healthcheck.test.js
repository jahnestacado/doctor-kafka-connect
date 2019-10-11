const express = require("express");
const request = require("supertest");
const nock = require("nock");
const chai = require("chai");
const expect = chai.expect;
const testWorkerId = "foo-bar:3000";

const attachHealthcheckRouter = () => {
    process.env.KAFKA_CONNECT_TARGET_WORKER_IDS = testWorkerId;
    const healthcheckRouter = require("./../../app/routes/healthcheck.js");
    const app = express();
    app.use(healthcheckRouter);
    return app;
};

describe("when testing the healthcheck routes (integration-like tests)", () => {
    let app;
    beforeEach(() => {
        app = attachHealthcheckRouter();
    });
    afterEach(() => {
        process.env.KAFKA_CONNECT_TARGET_WORKER_IDS = undefined;
    });

    describe("when testing the worker-wide /healthcheck route", () => {
        const connectors = ["test-connector-0", "test-connector-1"];
        describe("and there is a failure in the targeted worker", () => {
            let response;
            beforeEach(async () => {
                nock("http://localhost:8083")
                    .get(`/connectors`)
                    .reply(200, connectors);

                connectors.forEach((connector) => {
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
                                { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                            ],
                        });
                });
                response = await request(app).get(`/healthcheck`);
            });

            it("should return a 503 status", () => {
                expect(response.status).to.equal(503);
            });

            const expectedResponseBody = [
                {
                    connector: connectors[0],
                    workerId: testWorkerId,
                    taskId: 0,
                    trace: "the stack trace...",
                },
                {
                    connector: connectors[1],
                    workerId: testWorkerId,
                    taskId: 0,
                    trace: "the stack trace...",
                },
            ];
            it("should return a body with the expected failure message", () => {
                expect(response.body).to.equal(
                    `Failures: ${JSON.stringify(expectedResponseBody, 0, 2)}`
                );
            });
        });

        describe("and there are no failing tasks in the targeted worker", () => {
            let response;
            beforeEach(async () => {
                nock("http://localhost:8083")
                    .get(`/connectors`)
                    .reply(200, connectors);

                connectors.forEach((connector) => {
                    nock("http://localhost:8083")
                        .get(`/connectors/${connector}/status`)
                        .reply(200, {
                            status: 200,
                            tasks: [
                                {
                                    id: 0,
                                    worker_id: "another-one:3737",
                                    state: "FAILED",
                                    trace: "the stack trace",
                                },
                                { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                            ],
                        });
                });
                response = await request(app).get(`/healthcheck`);
            });

            it("should return a 200 status", () => {
                expect(response.status).to.equal(200);
            });

            it("should return a body with the 'OK' message", () => {
                expect(response.body).to.equal("OK");
            });
        });
    });

    describe("when testing the connector-specific /healthcheck/:connector route", () => {
        describe("and there is a failure in tasks of the targeted connector in the targeted worker", () => {
            const connector = "test-connector-0";
            let response;
            beforeEach(async () => {
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
                            { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                        ],
                    });
                response = await request(app).get(`/healthcheck/${connector}`);
            });

            it("should return a 503 status", () => {
                expect(response.status).to.equal(503);
            });

            it("should return a body with the expected failure message", () => {
                expect(response.body).to.equal(
                    `Failures: ${JSON.stringify(
                        [
                            {
                                connector,
                                workerId: testWorkerId,
                                taskId: 0,
                                trace: "the stack trace...",
                            },
                        ],
                        0,
                        2
                    )}`
                );
            });
        });
        describe("and there is no failure in the targeted worker", () => {
            const connector = "test-connector-1";
            let response;
            beforeEach(async () => {
                nock("http://localhost:8083")
                    .get(`/connectors/${connector}/status`)
                    .reply(200, {
                        status: 200,
                        tasks: [
                            {
                                id: 0,
                                worker_id: "another-one:3737",
                                state: "FAILED",
                                trace: "the stack trace",
                            },
                            { id: 1, worker_id: testWorkerId, state: "RUNNING" },
                        ],
                    });
                response = await request(app).get(`/healthcheck/${connector}`);
            });

            it("should return a 200 status", () => {
                expect(response.status).to.equal(200);
            });

            it("should return a body with the 'OK' message", () => {
                expect(response.body).to.equal("OK");
            });
        });
    });
});
