const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const crypto = require('crypto');
const gcloud = require('google-cloud');
const config = require('../config');
const passportConfig = require('../services/passport');
const User = require('../models/user');
var upload = multer({ dest: '/tmp/'});
var storage = gcloud.storage({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFileName
});
const Mailjet = require('node-mailjet').connect(
    config.mailjet.apiKey,
    config.mailjet.apiSecret
);

var userImages = storage.bucket(config.buckets.user);

function sendForgotPassword(forgotPass, next) {
    let options = {
    FromEmail: config.mailjet.sender,
    FromName: "Checkout Logger Name",
    Recipients: [ { Email: forgotPass.email }],
    Subject: "CheckoutLogger - forgot password",
    "Text-part": `Dear ${forgotPass.email},
        
As per your request, here is the link you can use to reset your password:

    ${forgotPass.protocol}://${forgotPass.host}${forgotPass.link}`,
    "Html-part": `<p>Dear ${forgotPass.email}.</p><br />
        <p>As per your request, here is the link you can use to reset your password:<br />
        <a href="${forgotPass.protocol}://${forgotPass.host}${forgotPass.link}">here</a></p><br /><br />
        <p>Best regards,</p>
        <p>The CLTeam</p>`
};

let request = Mailjet.post('send').request(options)
    .then((data) => {
        console.log(data);
    })
    .catch((data) => {
        next(data);
    });
}

router.get('/login', (req, res) => {
    if(req.user) return res.redirect('/');
    res.render('accounts/login', {
        message: req.flash('loginMessage'),
        success: req.flash('successMessage')
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
    user.forgotPassword = crypto.createHash('sha256', config.secret)
                                .update(req.body.email + new Date().getTime())
                                .digest('hex');
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
    req.session.destroy();
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
                var oldFile = userImages.file(path.basename(user.profile.picture));
                if (oldFile.exists((err, exists) => {
                    if (err)
                        return next(err);
                    if (exists) {
                        oldFile.delete((err, deleted) => {
                            if (err)
                                return next(err);
                        });
                    }
                }));
                userImages.upload(req.file.path, (err, file) => {
                    if (err)
                        return next(err);
                });
                user.profile.picture = path.join('https://storage.googleapis.com/', config.buckets.user,req.file.filename)
            } else {
                req.flash('errorPicture', 'Sorry we accept only png, jpg and gif formats');
                return res.redirect('/edit-profile');
            }
        }
        
        user.save((err) => {
            if (err) return next(err);

            req.flash('success', 'Successfully edited your profile');
            setTimeout(function() {
                return res.redirect('/edit-profile');
            }, 110);
        });
    });
});

router.get('/forgot-password', (req, res, next) => {
    return res.render('accounts/forgot-password', { message: req.flash('errorMessage'), status: false });
});

router.post('/forgot-password', (req, res, next) => {
    let email = req.body.email;
    if (!email){
        req.flash('errorMessage', 'Please enter an email address.');
        return res.redirect('/forgot-password');
    }
    User.findOne({ email }, (err, user) => {
        if (err)
            return next(err);
        if (!user) {
            req.flash('errorMessage', 'User not found');
            return res.redirect('/forgot-password');
        }
        let hash = user.forgotPassword;
        let link = '/forgot-password/' + hash;
        let host = req.get('host');
        let protocol = req.protocol;
        sendForgotPassword({ email: user.email, link, host, protocol }, next);
        return res.render('accounts/forgot-password', { message: req.flash('errorMessage'), status: true });
    });
});

router.get('/forgot-password/:id', (req, res, next) => {
    let hash = req.params.id;
    if (!hash)
        return res.redirect('/forgot-password');
    User.findOne({ forgotPassword: hash }, (err, user) => {
        if (err)
            return next(err);
        if (!user)
            return res.render('main/error404', { status: false, _id: hash });
        return res.render('accounts/forgot-password-new', { message: req.flash('errorMessage') });
    });
});

router.post('/forgot-password/:id', (req, res, next) => {
    let hash = req.params.id;
    if (!hash)
        return res.redirect('/forgot-password');
    User.findOne({ forgotPassword: hash }, (err, user) => {
        if (err)
            return next(err);
        if (!user)
            return res.render('main/error404', { status: false, _id: hash });
        let pass1 = req.body.password1;
        let pass2 = req.body.password2;
        if (!pass1 || !pass2){
            req.flash('errorMessage', 'Please enter passwords.');
            return res.redirect('/forgot-password/' + hash);
        }
        if (pass1 !== pass2) {
            req.flash('errorMessage', "Password's doesn't match.");
            return res.redirect('/forgot-password/' + hash);
        }
        user.forgotPassword = crypto.createHash('sha256', config.secret)
                                .update(user.email + new Date().getTime())
                                .digest('hex');
        user.password = pass1;
        user.save((err) => {
            if (err)
                return next(err);
            req.flash('successMessage', 'Successfully changed your password.');
            return res.redirect('/login');
        });
    });
});

module.exports = router;