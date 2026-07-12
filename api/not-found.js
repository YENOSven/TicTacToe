module.exports = function handler(request, response) {
  response.statusCode = 404;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end("404 Not Found");
};
