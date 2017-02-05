const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const ejsMate = require('ejs-mate');
const config = require('./config');

//models
const User = require('./models/user');

//express & routes
const app = express();
const mainRoutes = require('./routes/main');
const userRoutes = require('./routes/user');

mongoose.connect('mongodb://' + config.user + ':' + config.password + '@localhost:27017' + '/' + config.database, (err) => {
    if (err) throw err;
    else console.log('Connected to database');
});

//Middlewares
app.use(express.static(__dirname + '/public'));
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.use(mainRoutes);
app.use(userRoutes);

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
});