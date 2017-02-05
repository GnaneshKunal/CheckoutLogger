const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const ejsMate = require('ejs-mate');
const config = require('./config');

const User = require('./models/user');

const app = express();

mongoose.connect('mongodb://' + config.user + ':' + config.password + '@localhost:27017' + '/' + config.database, (err) => {
    if (err) throw err;
    else console.log('Connected to database');
});

//Middlewares
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('home');
})

app.post('/create', (req, res, next) => {
    var user = new User();

    user.profile.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;

    user.save((err) => {
        if (err) { return next(err); }

        res.send({ user });
    })

})

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
});