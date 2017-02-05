const router = require('express').Router();
const passport = require('passport');
const passportConfig = require('../services/passport');
const User = require('../models/user');

router.get('/login', (req, res) => {
    if(req.user) return res.redirect('/');
    res.render('accounts/login', {
        message: req.flash('loginMessage')
    });
});

router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

router.get('/profile', (req, res, next) => {
    User.findOne({ _id: req.user._id }, function(err, user) {
        if (err) { return next(err); }
        res.render('accounts/profile', { user: user });
    });
});

router.get('/signup', (req, res, next) => {
    res.render('accounts/signup', {
        errors: req.flash('errors')
    });
});

router.post('/signup', (req, res, next) => {
    const email = req.body.email.toLowerCase();
    const name = req.body.name;
    const password = req.body.password;
    console.log(req.body);
    if (!email || !name || !password ) {

    }
    const user = new User({
        email,
        password,
        profile: {
            name
        }
    });
    User.findOne({ email: email }, function(err, existingUser) {
        if (existingUser) {
            req.flash('errors', 'Account with that email address already exists');
            return res.redirect('/signup');
        } else {
            user.save((err, user) => {
                if (err) return next(err);

                return res.redirect('/');
            });
        }
    });
});

module.exports = router;