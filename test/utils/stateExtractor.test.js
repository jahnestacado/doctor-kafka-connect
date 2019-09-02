const extractState = require("./../../app/utils/stateExtractor.js");
const chai = require("chai");
const expect = chai.expect;

describe("when calling the extractState function", () => {
    describe("with undefined arguments", () => {
        let state;
        const expectedState = { status: 200, failures: [] };
        beforeEach(() => {
            state = extractState();
        });

        it("should return a 200 code status with no failures", () => {
            expect(state).to.deep.equal(expectedState);
        });
    });
    describe("with failing tasks in workers that are not defined in the targetWorkerIds", () => {
        let state;
        const targetWorkerIds = ["foo:8989", "bar:3333"];
        const tasks = [{ id: 0, worker_id: "buzz:3434", state: "FAILED" }];
        const ip = "127.0.0.1";
        const expectedState = { status: 200, failures: [] };
        beforeEach(() => {
            state = extractState(ip, tasks, targetWorkerIds);
        });

        it("should return a 200 status code with no failures", () => {
            expect(state).to.deep.equal(expectedState);
        });
    });
    describe("with failing tasks in workers that are defined in the targetWorkerIds", () => {
        let state;
        const targetWorkerIds = ["foo:8989", "buzz:3333"];
        const tasks = [
            { id: 0, worker_id: "buzz:3434", state: "FAILED" },
            { id: 1, worker_id: "buzz:3333", state: "RUNNING" },
            { id: 2, worker_id: "buzz:3333", state: "FAILED" },
        ];
        const hostIP = "127.0.0.1";
        const expectedState = {
            status: 500,
            failures: [{ taskId: 2, workerId: "buzz:3333" }],
        };
        beforeEach(() => {
            state = extractState(hostIP, tasks, targetWorkerIds);
        });

        it("should return a 500 status code with the expected failure", () => {
            expect(state).to.deep.equal(expectedState);
        });
    });
    describe("with failing tasks in workers that match the host IP address and no targetWorkerIds are defined", () => {
        let state;
        const hostIP = "127.234.345.1";
        const tasks = [
            { id: 0, worker_id: `${hostIP}:8900`, state: "FAILED" },
            { id: 1, worker_id: `${hostIP}:8901`, state: "FAILED" },
            { id: 2, worker_id: "128.222.333.12:3333", state: "FAILED" },
        ];
        const expectedState = {
            status: 500,
            failures: [
                { taskId: 0, workerId: `${hostIP}:8900` },
                { taskId: 1, workerId: `${hostIP}:8901` },
            ],
        };
        beforeEach(() => {
            state = extractState(hostIP, tasks);
        });

        it("should return a 500 status code with the expected failures", () => {
            expect(state).to.deep.equal(expectedState);
        });
    });
});