const express = require('express');
const http = require('http');

const app = express();

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
})