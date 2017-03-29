const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const config = require('./config');

//models
const User = require('./models/user');

//express & routes
const app = express();
const mainRoutes = require('./routes/main');
const userRoutes = require('./routes/user');
const checkoutRoutes = require('./routes/checkout');

mongoose.connect(config.databaseUrl, (err) => {
    if (err) throw err;
    else console.log('Connected to database');
});

//Middlewares
app.use(express.static(__dirname + '/public'));
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: config.secret,
    store: new MongoStore({ 
                url: config.databaseUrl, autoReconnect: true,
                autoRemove: 'native',
                autoRemoveInterval: 10,
                ttl: 14 * 24 * 60 * 60,
                touchAfter: 24 * 3600
            })
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
    res.locals.user = req.user; //making available to all routes
    next();
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.use(mainRoutes);
app.use(userRoutes);
app.use(checkoutRoutes);

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Server is listening on PORT: ' + PORT);
});