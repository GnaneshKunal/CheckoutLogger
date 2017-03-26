const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const passportConfig = require('../services/passport');
const User = require('../models/user');
var upload = multer({ dest: '/tmp/'});

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
    if(!req.user) return res.redirect('/login');
    User.findOne({ _id: req.user._id }, function(err, user) {
        if (err) { return next(err); }
        res.render('accounts/profile', { user: user });
    });
});

router.get('/signup', (req, res, next) => {
    if(req.user) return res.redirect('/');
    res.render('accounts/signup', {
        errors: req.flash('errors')
    });
});

router.post('/signup', (req, res, next) => {
    const email = req.body.email.toLowerCase();
    const name = req.body.name;
    const password = req.body.password;
    if (!email || !name || !password ) {
        req.flash('errors', 'Please fill up the form');
        return res.redirect('/signup');
    }
    const user = new User({
        email,
        password,
        profile: {
            name
        }
    });
    user.profile.picture = user.gravatar();
    User.findOne({ email: email }, function(err, existingUser) {
        if (existingUser) {
            req.flash('errors', 'Account with that email address already exists');
            return res.redirect('/signup');
        } else {
            user.save((err, user) => {
                if (err) return next(err);

                req.logIn(user, function(err) {
                    if (err) { return next(err); }
                    res.redirect('/profile');
                });
            });
        }
    });
});

router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
});

router.get('/edit-profile', (req, res, next) => {
    if(!req.user) return res.redirect('/');
    res.render('accounts/edit-profile.ejs', { message: req.flash('success'), error: req.flash('errorPicture') });
});

router.post('/edit-profile', upload.single('profilePhoto'), (req, res, next) => {
    User.findOne({ _id: req.user._id }, function(err, user) {
        if (err) return next(err);

        if (req.body.name) user.profile.name = req.body.name;

        if (req.file) {
            var extensions = ['.png', '.jpg', '.gif'];
            if (extensions.indexOf(path.extname(req.file.originalname)) !== -1) {
                var file = path.dirname(__dirname) + '/public/uploads/pictures/' + req.file.filename ;
                if (fs.existsSync(path.dirname(__dirname) + '/public' + user.profile.picture)) {
                    fs.unlinkSync(path.dirname(__dirname) + '/public' + user.profile.picture);
                }
                let is = fs.createReadStream(req.file.path);
                let ds = fs.createWriteStream(file);
                is.pipe(ds);
                is.on('end', () => {
                    fs.unlinkSync(req.file.path);
                });
                user.profile.picture = '/uploads/pictures/' + path.basename(file);
                
            } else {
                req.flash('errorPicture', 'Sorry we accept only png, jpg and gif formats');
                return res.redirect('/edit-profile');
            }
        }
        
        user.save((err) => {
            if (err) return next(err);

            req.flash('success', 'Successfully edited your profile');
            return res.redirect('/edit-profile');
        });
    });
});

module.exports = router;