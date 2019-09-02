const express = require("express");
const app = express();
const handleError = require("./routes/healthcheck.js");
const healthcheckRouter = require("./middlewares/errorHandler.js");
const healthcheckPort = process.env.HEALTHCHECK_PORT || 18083;

app.use(healthcheckRouter);
app.listen(healthcheckPort, () => {
    console.log(`Starting Kafka Connect Healthcheck server on port: ${healthcheckPort}`);
});

app.use(handleError);
