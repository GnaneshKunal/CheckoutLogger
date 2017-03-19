const router = require('express').Router();
const fs = require('fs');
const mongoose = require('mongoose');
const Checkout = require('../models/checkout');

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

router.get('/checkout-history', (req, res, next) => {
    if (!req.user) return res.redirect('/');
    Checkout.find({ bill_owner: req.user._id })
        .populate('bill_owner', 'profile.name')
        .exec((err, checkouts) => {
            if (err) { return next(err); }
            if (!checkouts) { 
                return res.render('checkouts/checkout-history', { checkouts: [] });
            }
            return res.render('checkouts/checkout-history', { checkouts });
        });
});

router.post('/api/checkout', (req, res, next) => {
    // bill_id: { type: String, unique: true },
	// title: { type: String, lowercase: true },
	// description: { type: String, default: ''},
	// date: { type: Date, default: Date() },
	// location: { type: String, default: '' },
	// total_tax: { type: String },
	// bill_picture: { type: String, required: true },
	// bill_owner: { type: Schema.Types.ObjectId, ref: "User" }
    const bill_id = req.body.bill_id;
    const title = req.body.title;
    const description = req.body.description;
    const total_tax = req.body.total_tax;

    var checkout = new Checkout({
        bill_id,
        title,
        description,
        date: Date(),
        location: 'https://www.google.com/maps/place/Starbucks+Coffee/@17.4506728,78.3786222,13z/data=!4m8!1m2!2m1!1sstarbucks+near+Hyderabad,+Telangana,+India!3m4!1s0x0:0xd0691d7fbe930877!8m2!3d17.484271!4d78.3892322?hl=en',
        total_tax,
        bill_picture: '/uploads/pictures/2b85a9585550716c2ec9cde481cd4ddd',
        bill_owner: '5897777c77a3897b97677d4f'
    });
    checkout.save((err) => {
        if (err) { return next(err); }
        return res.json(checkout);
    })
});