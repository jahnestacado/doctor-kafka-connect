const express = require("express");
const app = express();
const handleError = require("./routes/healthcheck.js");
const healthcheckRouter = require("./middlewares/errorHandler.js");
const healthcheckPort = process.env.HEALTHCHECK_PORT || 18083;
const logLevel = process.env.LOG_LEVEL || "INFO";
const log = require("loglevel");

log.setDefaultLevel(logLevel);

app.use(healthcheckRouter);
app.listen(healthcheckPort, () => {
    log.info(`Starting Doctor Kafka Connect server on port: ${healthcheckPort}`);
});

app.use(handleError);
