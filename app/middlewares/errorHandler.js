const log = require("loglevel");
module.exports = function handleError(error, request, response, next) {
    log.error(JSON.stringify(error));
    response.status(500).json(error);
};
