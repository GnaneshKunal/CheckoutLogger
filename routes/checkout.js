const router = require('express').Router();
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Checkout = require('../models/checkout');
const parser = require('../lib/parser');
let upload = multer({dest: '/tmp/' });
let exampleJSON = require('../lib/examples/star.json');

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
                    return res.render('checkouts/checkout-history', { checkouts: [], pages: count / perPage });
                return res.render('checkouts/checkout-history', { checkouts, pages: count / perPage });
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
        return res.render('checkouts/checkout-self', { status: true, checkout });
    });
});

module.exports = router;

router.get('/checkout-new', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    return res.render('checkouts/checkout-new');
});

router.post('/checkout-new', upload.single('checkout'),(req, res, next) => {
    if (!req.user) return res.redirect('/');

    if (req.file) {
        let extensions = ['.png', '.jpg'];
        if (extensions.indexOf(path.extname(req.file.originalname)) !== -1) {
            console.log(req.file);
            let file = path.join(path.dirname(__dirname), 'public/uploads/checkouts', req.file.filename);
            //vision(req.file, config,(err, text) => {
                let detectedText = exampleJSON.textAnnotations[0].description;
                let textArray = detectedText.split('\n');
                let title = textArray[0];
                let total = parser.parseT(textArray, "TOTAL", "Total", "TOTAL NET");
                let total_tax = parser.parseT(textArray, "TAX", "Tax", "TVA");
                let date = parser.parseDate(textArray);
                let location = "chittoor";
                let description = "Checkout";
                let bill_picture = path.join('upload/checkouts', req.file.filename);
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
                    fs.renameSync(req.file.path, file);
                    return res.redirect('/checkout/' + checkout._id);
                });
        }
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
