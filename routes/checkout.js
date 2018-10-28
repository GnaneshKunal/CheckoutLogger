const router = require('express').Router();
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const request = require('request');
const {Storage} = require('@google-cloud/storage');
const Vision = require('@google-cloud/vision')
const Checkout = require('../models/checkout');
const config = require('../config');
const parser = require('../lib/parser');
let upload = multer({dest: '/tmp/' });
var storage = new Storage({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFileName
});
var vision = new Vision.ImageAnnotatorClient();
// var vision = gcloud.vision({
//     projectId: config.gcloud.projectId,
//     keyFilename: config.gcloud.keyFileName
// });
var checkoutBucket = storage.bucket(config.buckets.checkout);

function paginate(req, res, next) {
    let perPage = 5;
    let page = req.params.page - 1;
    let search = false;
    let sort = -1;
    if (req.query.sort) {
        sort = req.query.sort === 'asc' ? 1 : -1;
    }
    if (req.query.search !== undefined) {
        search = req.query.search.trim();
        Checkout.find({ title: new RegExp(search, 'i')})
            .where('bill_owner').equals(req.user._id)
            .sort({ date: sort })
            .skip(perPage * page)
            .limit(perPage)
            .populate('bill_owner', 'profile.name')
            .exec((err, checkouts) => {
                if (err) return next(err);
                Checkout.find({ title: new RegExp(search, 'i')}).where('bill_owner').equals(req.user._id).count().exec((err, count) => {
                    if (err) return next(err);
                    if (!checkouts)
                        return res.render('checkouts/checkout-history', { checkouts: [], pages: count / perPage, success: req.flash('success'), search, sort });
                    return res.render('checkouts/checkout-history', { checkouts, pages: count / perPage, success: req.flash('success'), search, sort });
                });
            });
            return;
    }
    Checkout.find({ bill_owner: req.user._id })
        .sort({ date: sort })
        .skip(perPage * page)
        .limit(perPage)
        .populate('bill_owner', 'profile.name')
        .exec((err, checkouts) => {
            if (err) return next(err);
            Checkout.find({ bill_owner: req.user._id }).count().exec((err, count) => {
                if (err) return next(err);
                if (!checkouts)
                    return res.render('checkouts/checkout-history', { checkouts: [], pages: count / perPage, success: req.flash('success'), search, sort });
                return res.render('checkouts/checkout-history', { checkouts, pages: count / perPage, success: req.flash('success'), search, sort });
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
	    vision.documentTextDetection(req.file.path)
		.then(textD => {
		    if (textD !== undefined && textD !== null ) {
			// console.log(textD);
			let detectedText = textD[0];
			console.log("THIS IS DETECTED", detectedText);
			// // let detectedText = textD[0];
			let total, total_tax, date, title, textArray;
			try {
                            textArray = detectedText.fullTextAnnotation.text.split('\n');
                            title = textArray[0];
                            total = parser.parseT(textArray, "TOTAL", "Total", "TOTAL NET");
                            total_tax = parser.parseT(textArray, "TAX", "Tax", "TVA");
                            date = parser.parseDate(textArray);
			    try {
                                date = parser.parseDate(textArray);
                            } catch(e) {
                                date = new Date;
                            }
			} catch(e) {
			    console.log(e);
                            req.flash('errorPicture', "Sorry, There's some error in decoding the text. Try to upload a clear Image");
                            return res.redirect('/checkout-new');
			}
			if (!date || !moment(date).isValid())
			    date = new Date;
			
			let location = "Cant Parse Location";
			let description = "Checkout";
			let bill_picture = path.join('https://storage.googleapis.com/', config.buckets.checkout, req.file.filename);
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
		})
		.catch(err => {
		    req.flash('errorPicture', 'Sorry we accept only checkout images.');
                    return res.redirect('/checkout-new');
		});
            // vision.detectText(req.file.path, (err, textD) => {
                // if (textD !== undefined && textD !== null ) {
                //     let detectedText = textD[0];
                //     let total, total_tax, date, title, textArray;
                //     try {
                //         textArray = detectedText.split('\n');
                //         title = textArray[0];
                //         total = parser.parseT(textArray, "TOTAL", "Total", "TOTAL NET");
                //         total_tax = parser.parseT(textArray, "TAX", "Tax", "TVA");
                //         date = parser.parseDate(textArray);
                //     } catch(e) {
                //         req.flash('errorPicture', "Sorry, There's some error in decoding the text. Try to upload a clear Image");
                //         return res.redirect('/checkout-new');
                //     }
                //     let location = "Cant Parse Location";
                //     let description = "Checkout";
                //     let bill_picture = path.join('https://storage.googleapis.com/', config.buckets.checkout, req.file.filename);
                //     var checkout = new Checkout({
                //         bill_id: req.file.filename,
                //         title,
                //         description,
                //         date,
                //         location,
                //         total_tax,
                //         total,
                //         bill_picture,
                //         bill_owner: req.user._id
                //     });
                //     checkout.save((err) => {
                //         if (err) return next(err);
                //         checkoutBucket.upload(req.file.path, (err, uploaded) => {
                //             if (err)
                //                 return next(err);
                //             setTimeout(function() {
                //                 return res.redirect('/checkout/' + checkout._id);
                //             }, 110);
                //         });
                //     });
                // } else {
                //     req.flash('errorPicture', 'Sorry we accept only checkout images.');
                //     return res.redirect('/checkout-new');
                // }
            // });
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
        if (!checkout)
            return res.render('main/error404', { status: false, _id });
            
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


router.post('/api/checkout-new', upload.single('checkout'), (req, res, next) => {

    const _id = req.body._id;
    if (!_id) {
	return res.status(400).send({
	    message: 'Please send an ID'
	});
    }
    
    // console.log(req);
    // console.log(req.body);
    
    // console.log(req.params);
    // console.log(req.query);
    // console.log(req.file);

    if (req.file) {
	let extensions = ['.png', '.jpg'];
	if (extensions.indexOf(path.extname(req.file.originalname)) != -1) {
	    vision.documentTextDetection(req.file.path)
		.then(textD => {
		    if (textD !== undefined && textD !== null ) {
			// console.log(textD);
			let detectedText = textD[0];
			// console.log("THIS IS DETECTED", detectedText);
			// // let detectedText = textD[0];
			let total, total_tax, date, title, textArray;
			try {
                            textArray = detectedText.fullTextAnnotation.text.split('\n');
                            title = textArray[0];
                            total = parser.parseT(textArray, "TOTAL", "Total", "TOTAL NET");
                            total_tax = parser.parseT(textArray, "TAX", "Tax", "TVA");
			    try {
				date = parser.parseDate(textArray);
			    } catch(e) {
				date = new Date;
			    }
			    
			    } catch(e) {
			    console.log(e);
			    return res.status(400).send({
	    			message: "Sorry, There's some error in decoding the text. Try to upload a clear Image"
	    		    });
			}
			let location = "Cant Parse Location";
			let description = "Checkout";
			let bill_picture = path.join('https://storage.googleapis.com/', config.buckets.checkout, req.file.filename);
			if (!date || !moment(date).isValid()) {
			    //    date = moment(new Date()).format("DD-MM-YYYY");
			    date = new Date;
			}
			
			var checkout = new Checkout({
                            bill_id: req.file.filename,
                            title,
                            description,
                            date,
                            location,
                            total_tax,
                            total,
                            bill_picture,
                            bill_owner: _id
			});
			checkout.save((err) => {
                            if (err) return next(err);
                            checkoutBucket.upload(req.file.path, (err, checkout) => {
				if (err) {
				    return res.status(400).send({
	     		            	message: JSON.stringify(err)
	      			    });
				}
				setTimeout(function() {
				    return res.status(200).send({
	    				message: 'Uploaded',
					checkout
	    			    });
				}, 110);
                            });
			});
                    } else {
			return res.status(400).send({
	    		    message: 'Sorry we accept only checkout images.'
	    		});
                    }
		})
		.catch(err => {
		    return res.status(400).send({
	    		message: 'Sorry we accept only checkout images.'
	    	    });
		});
	} else {
	    return res.status(400).send({
		message: 'Sorry we accept only checkout images.'
	    });
	}
    } else {
	return res.status(400).send({
	    message: 'Please upload an image'
	});
    }
});

router.get('/api/checkout-all', (req, res, next) => {
    
    const _id = req.query._id;

    if (!_id) {
	return res.status(400).send({
	    message: 'Please send an ID'
	});
    }
    
    Checkout.find({ bill_owner: _id })
	.sort({ date: -1 })
	.exec((err, checkouts) => {
	    if (err)
		return res.status(400)
		.send({
		    message: JSON.stringify(err)
		});
	    if (!checkouts || checkouts.length == 0)
		return res.status(404).send({
		    message: 'No checkouts found'
		});
	    return res.status(200).send({
		message: 'Found Checkouts',
		checkouts
	    });
	});
});

// router.get('/api/checkout/:_id', (req, res, next) => {

//     const _id = req.query._id;

//     if (!_id) {
// 	return res.status(400).send({
// 	    message: 'Please send an ID'
// 	});
//     }
    
//     Checkout.findOne({ bill_owner: _id })
// 	.sort({ date: -1 }).exec((err, checkout) => {
// 	    if (err)
// 		return res.status(400).send({
// 		    message: JSON.stringify(err)
// 		});
// 	    if (!checkout) {
// 		return res.status(404).send({
// 		    message: 'No Checkout found'
// 		});
// 	    }
// 	    return res.status(200).send({
// 		message: 'Found Checkout',
// 		checkout
// 	    });
// 	});
// });

router.get('/api/checkout/', (req, res, next) => {
    
    let _id = req.query._id;

    if (!_id) {
	return res.status(400).send({
	    message: 'Please send an ID'
	});
    }
    
    Checkout.findOne({ _id }, (err, checkout) => {
	if (err)
	    return res.status(400).send({
		message: JSON.stringify(err)
	    });
	if (!checkout)
	    return res.status(404).send({
		message: 'Checkout Not found'
	    });
	return res.status(200).send({
	    message: 'Found Checkout',
	    checkout
	});
    });
});



router.post('/api/checkout-edit/', (req, res, next) => {

    let _id = req.body._id;

    if (!_id)
	return res.status(400).send({
	    message: 'Please send an ID'
	});
    
    if (!mongoose.Types.ObjectId.isValid(_id))
	return res.status(400).send({
	    message: 'Please send a valid ID'
	});
    
    Checkout.findById({ _id }, (err, checkout) => {
        if (err)
            return res.status(500).send({
		message: err
	    });
	
        if (!checkout)
            return res.status(404).send({
		message: 'No checkout found with the given ID'
	    });

	
        if (req.body.title)
            checkout.title = req.body.title;

	checkout.description = req.body.description ? req.body.description : checkout.description;

	if (req.body.date_time) {
            if (!moment(req.body.date_time).isValid){
		return res.status(400).send({
		    message: 'Please enter a valid time'
		});
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
            if (err) return res.status(500).send({
		message: err
	    });

	    return res.status(200).send({
		message: 'Successfully edited your checkout',
		checkout
	    });
	    
            // req.flash('success', 'Successfully edited your checkout');
            // return res.redirect('/checkout/' + checkout._id);
        });
    });
});
