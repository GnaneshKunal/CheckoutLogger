const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../config');
const passportConfig = require('../services/passport');
const User = require('../models/user');
var upload = multer({ dest: '/tmp/'});

function sendForgotPassword(forgotPass, next) {
    let transporter = nodemailer.createTransport({
        service: config.smtp.service,
        auth: {
            user: config.smtp.email,
            pass: config.smtp.password
        }
    });

    let mailOptions = {
        from: `"${config.smtp.name + config.smtp.last}" <${config.smtp.email}>`,
        to: forgotPass.email,
        subject: 'CheckoutLogger - forgot password',
        text: `Dear ${forgotPass.email},
        
As per your request, here is the link you can use to reset your password:

    http://localhost:8080${forgotPass.link}`,
        html: `<p>Dear ${forgotPass.email}.</p><br />
        <p>As per your request, here is the link you can use to reset your password:<br />
        http://localhost:8080${forgotPass.link}</p><br /><br />
        <p>Best regards,</p>
        <p>The CLTeam</p>`
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
        if (err)
            return next(err);
        console.log("Message %s sent: %s", info.messageId, info.response);
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
        sendForgotPassword({ email: user.email, link }, next);
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