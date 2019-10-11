/**
 * redux-tattoo <https://github.com/jahnestacado/doctor-kafka-connect>
 * Copyright (c) 2019 Ioannis Tzanellis
 * Licensed under the MIT License (MIT).
 */
const log = require("loglevel");
module.exports = function handleError(error, request, response, next) {
    log.error(JSON.stringify(error));
    response.status(500).json(error);
};
