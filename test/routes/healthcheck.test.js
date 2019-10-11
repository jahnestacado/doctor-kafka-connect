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

describe("when testing the healthcheck route (integration-like tests)", () => {
    let app;
    beforeEach(() => {
        app = attachHealthcheckRouter();
    });
    afterEach(() => {
        process.env.KAFKA_CONNECT_TARGET_WORKER_IDS = undefined;
    });

    describe("and there is a failure in the targeted worker", () => {
        const connector = "test-connector-0";
        let response;
        beforeEach(async () => {
            nock("http://localhost:8083")
                .get(`/connectors/${connector}/status`)
                .reply(200, {
                    status: 200,
                    tasks: [
                        { id: 0, worker_id: testWorkerId, state: "FAILED" },
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
                `Failures: ${JSON.stringify([{ workerId: testWorkerId, taskId: 0 }])}`
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
                        { id: 0, worker_id: "another-one:3737", state: "FAILED" },
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
