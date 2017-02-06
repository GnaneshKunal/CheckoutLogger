const router = require('express').Router();

router.get('/checkout', (req, res) => {
    res.render('checkouts/checkout');
});

module.exports = router;

router.get('/checkout-new', (req, res) => {
    res.render('checkouts/checkout-new');
});

router.get('/checkout-history', (req, res) => {
    res.render('checkouts/checkout-history');
});