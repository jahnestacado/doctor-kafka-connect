module.exports = function handleError(error, request, response, next) {
    response.status(500).json(error);
};
