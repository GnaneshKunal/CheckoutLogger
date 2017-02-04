const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');

mongoose.connect('mongodb://' + config.user + ':' + config.password + '@localhost:27017' + '/' + config.database, (err) => {
    if (err) throw err;
    console.log('Connected to database');
})

const app = express();

//Middlewares
app.use(morgan('tiny'));

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
});