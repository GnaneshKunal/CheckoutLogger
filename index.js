const express = require('express');
const http = require('http');
const morgan = require('morgan');

const app = express();

//Middlewares
app.use(morgan('tiny'));

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
});