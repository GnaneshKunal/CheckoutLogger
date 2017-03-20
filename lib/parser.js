module.exports = {
    parseT : function parseT(starArray, in1, in2, in3) {
        var index, value;
        index = starArray.indexOf(in1) !== -1 ? starArray.indexOf(in1) : starArray.indexOf(in2);
        index = index !== -1 ? index : starArray.indexOf(in3);
        if (index === -1) {
            return 'Cant Parse ' + in1;
        } else {
            value = starArray[index + 1].match(/[+-]?\d+(\.\d+)?/g);
            if (value === null) {
                value = starArray[index -1].match(/[+-]?\d+(\.\d+)?/g);
                if (value === null) {
                    return 'Cant Parse ' + in1;
                } else {
                    if (typeof value == 'object' || typeof value == 'array') {
                        return value.join('.');
                    }
                    if (typeof value == 'string' && value.indexOf(',') !== -1) {
                        return value.replace(/,/g, '.');
                    }
                    return value;
                }
            } else {
                if (typeof value =='object' || typeof value == 'array') {
                    return value.join('.');
                }
                if (typeof value == 'string' && value.indexOf(',') !== -1) {
                    return value.replace(/,/g, '.');
                }
                return value;
            }
        }
    },
    parseDate: function(starArray) {
        var date = starArray.filter(a => {
            if (a.match(/(\d+)(-|\/)(\d+)(?:-|\/)(?:(\d+)\s+(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?)?/g)) {
                return a;
            }
        });
        date = date[0].match(/(\d+)(-|\/)(\d+)(?:-|\/)(?:(\d+)\s+(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?)?/g);
        return date;
    }
};
