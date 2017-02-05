const router = require('express').Router();
const User = require('../models/user');

router.get('/signup', (req, res, next) => {
    res.render('accounts/signup');
});

router.post('/signup', (req, res, next) => {
    const email = req.body.email;
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
            console.log(req.body.email + " already exists");
            res.redirect('/signup');
        } else {
            user.save((err, user) => {
                if (err) return next(err);

                res.json({ 
                    success: "New user has been created",
                    user
                });
            });
        }
    });
});

module.exports = router;