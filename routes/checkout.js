const router = require('express').Router();

router.get('/checkout', (req, res) => {
    res.render('checkouts/checkout');
});

module.exports = router;