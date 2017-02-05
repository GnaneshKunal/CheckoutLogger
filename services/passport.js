const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

//serialize and deserialize
passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

//middleware
passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    password: 'password',
    passReqToCallback: true
}, (req, email, password, done) => {
    User.findOne({ email: email.toLowerCase() }, function(err, user) {
        if (err) return done(err);

        if (!user) {
            return done(null, false, req.flash('loginMessage', 'No user has been found'));
        }

        if (!user.comparePassword(password)) {
            return done(null, false, req.flash('loginMessage', 'Oops! Wrong Password.'));
        }
        return done(null, user);
    });
}));

//custom function to validate
exports.isAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}