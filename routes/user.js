const router = require('express').Router();
const User = require('../models/user');

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