const router = require('express').Router();
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const request = require('request');
const gcloud = require('google-cloud');
const Checkout = require('../models/checkout');
const config = require('../config');
const parser = require('../lib/parser');
let upload = multer({dest: '/tmp/' });
let exampleJSON = require('../lib/examples/star.json');
var storage = gcloud.storage({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFileName
});
var vision = gcloud.vision({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFileName
});
var checkoutBucket = storage.bucket(config.buckets.checkout);

function paginate(req, res, next) {
    let perPage = 5;
    let page = req.params.page - 1;
    Checkout.find({ bill_owner: req.user._id })
        .sort({ date: 'desc' })
        .skip(perPage * page)
        .limit(perPage)
        .populate('bill_owner', 'profile.name')
        .exec((err, checkouts) => {
            if (err) return next(err);
            Checkout.count().exec((err, count) => {
                if (err) return next(err);
                if (!checkouts)
                    return res.render('checkouts/checkout-history', { checkouts: [], pages: count / perPage, success: req.flash('success') });
                return res.render('checkouts/checkout-history', { checkouts, pages: count / perPage, success: req.flash('success') });
            });
    });
}

router.get('/checkout', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    Checkout.findOne({ bill_owner: req.user._id }).sort({ date: -1}).exec((err, checkout) => {
        if (err) { return next(err); }
        if (!checkout) { 
            return res.render('checkouts/checkout', { checkout: [] });
        }
        return res.render('checkouts/checkout', { checkout });
    });
});

router.get('/checkout/:_id', (req, res, next) => {
    let _id = req.params._id
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.render('main/error404', { status: false, _id });
    }
    if (!req.user) return res.redirect('/');
    Checkout.findOne({ _id }, (err, checkout) => {
        if (err) return next(err);
        if (!checkout)
            return res.render('main/error404', { status: false, _id });
        return res.render('checkouts/checkout-self', { status: true, checkout, success: req.flash('success') });
    });
});

module.exports = router;

router.get('/checkout-new', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    return res.render('checkouts/checkout-new', { error: req.flash('errorPicture') });
});

router.post('/checkout-new', upload.single('checkout'),(req, res, next) => {
    if (!req.user) return res.redirect('/');

    if (req.file) {
        let extensions = ['.png', '.jpg'];
        if (extensions.indexOf(path.extname(req.file.originalname)) !== -1) {
            vision.detectText(req.file.path, (err, textD) => {
                if (textD.length !== 0 || textD[0].length !== 0) {
                    let detectedText = textD[0];
                    let textArray = detectedText.split('\n');
                    let title = textArray[0];
                    let total = parser.parseT(textArray, "TOTAL", "Total", "TOTAL NET");
                    let total_tax = parser.parseT(textArray, "TAX", "Tax", "TVA");
                    let date = parser.parseDate(textArray);
                    let location = "chittoor";
                    let description = "Checkout";
                    let bill_picture = 'https://storage.googleapis.com/' + config.buckets.checkout + '/' + req.file.filename;
                    var checkout = new Checkout({
                        bill_id: req.file.filename,
                        title,
                        description,
                        date,
                        location,
                        total_tax,
                        total,
                        bill_picture,
                        bill_owner: req.user._id
                    });
                    checkout.save((err) => {
                        if (err) return next(err);
                        checkoutBucket.upload(req.file.path, (err, uploaded) => {
                            if (err)
                                return next(err);
                            setTimeout(function() {
                                return res.redirect('/checkout/' + checkout._id);
                            }, 110);
                        });
                    });
                } else {
                    req.flash('errorPicture', 'Sorry we accept only checkout images.');
                    return res.redirect('/checkout-new');
                }
            });
        } else {
                req.flash('errorPicture', 'Sorry we accept only png and jpg formats');
                return res.redirect('/checkout-new');
        }
    } else {
        req.flash('errorPicture', 'Please upload an Image');
        return res.redirect('/checkout-new');
    }
});

router.get('/checkout-history', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    paginate(req, res, next);
});

router.get('/checkout-history/:page', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    paginate(req, res, next);
});

router.get('/checkout-edit/:id', (req, res, next) => {
    if (!req.user)
        return res.redirect('/');
    let _id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.render('main/error404', { status: false, _id });
    }
    Checkout.findById({ _id }, (err, checkout) => {
        if (err)
            return next(err);
        if (!checkout)
            return res.render('main/error404', { status: false, _id });
        let date = moment(checkout.date).format('YYYY-MM-DDTHH:mm:ss');
        return res.render('checkouts/checkout-edit', { checkout, date, error: req.flash('errorCheckout'), success: req.flash('success') });
    });
});

router.post('/checkout-edit/:id', (req, res, next) => {
    if (!req.user)
        return res.redirect('/');
    let _id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(_id))
        return res.render('main/error404', { status: false, _id });
        Checkout.findById({ _id }, (err, checkout) => {
            if (err)
                return next(err);
            if (!checkout)
                return res.render('main/error404', { status: false, _id });
            if (req.body.title)
                checkout.title = req.body.title;
            checkout.description = req.body.description ? req.body.description : checkout.description;
            if (req.body.date_time) {
                if (!moment(req.body.date_time).isValid){
                    req.flash('errorCheckout', 'Not a Valid date format');
                    return res.redirect('/checkout-edit/' + checkout._id);
                }
                checkout.date = req.body.date_time;
            }
            if (req.body.tax) {
                let tax = Number.parseFloat(req.body.tax);
                if (!Number.isNaN(tax) && tax > 0)
                    checkout.total_tax = tax;
            }
            if (req.body.total) {
                let total = Number.parseFloat(req.body.total);
                if (!Number.isNaN(total) && total > 0)
                    checkout.total = total;
            }
            if (req.body.location)
                checkout.location = req.body.location;
            
            checkout.save((err) => {
                if (err) return next(err);

                req.flash('success', 'Successfully edited your checkout');
                return res.redirect('/checkout/' + checkout._id);
            });
        });
});

router.get('/checkout-delete/:id',(req, res, next) => {
    if (!req.user)
        return res.redirect('/');
    let _id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(_id))
        return res.render('main/error404', { status: false, _id });
    Checkout.findByIdAndRemove({ _id }, (err, checkout) => {
        if (err)
            return res.next(err);
        let file = checkoutBucket.file(path.basename(checkout.bill_picture));
        file.exists((err, exists) => {
            if (err)
                return next(err);
            if (exists) {
                file.delete((err, deleted) => {
                    if (err)
                        return next(err);
                    req.flash('success', 'Successfully deleted');
                    return res.redirect('/checkout-history');
                });
            }
        });
    });
});