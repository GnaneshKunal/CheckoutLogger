const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

//User Schema model
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true
    },
    password: String,
    profile: {
        name: { type: String, default: '' },
        picture: { type: String, default: '' }
    }
});

//Hashing password

UserSchema.pre('save', function(next) {
    const user = this;
    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, (err, hash) => {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

//compare password method
UserSchema.methods.comparePassword = function(password) {
    return bcrypt.compare(password, this.password);
};