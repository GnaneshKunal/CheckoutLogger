var star = require('./transportation.json');
var star = require('./star.json');
var star = require('./dominos.json');
var title;
var address; var addressFinal;
var phone; var phoneFinal;
var date; var dateFinal;
var valid; var validFinal;
var id; var idFinal;

var total; var totalIndex; var totalFinal;
var tax; var taxIndex; var taxFinal;

var newStar = star.textAnnotations[0].description;
var starArray = newStar.split('\n');
// console.log(starArray);
title = starArray[0];
console.log('Title: ' + title);

totalIndex = starArray.indexOf('TOTAL') !== -1 ? starArray.indexOf('TOTAL') : starArray.indexOf('Total');
totalIndex = totalIndex === -1 ? starArray.indexOf('TOTAL NET') : totalIndex;
if (totalIndex !== -1) {
    total = starArray[totalIndex+1];
    totalFinal = total.match(/[+-]?\d+(\.\d+)?/g);
    if (typeof totalFinal == 'object' || typeof totalFinal == 'Array') {
        totalFinal = totalFinal.join('.');
    }
    if (typeof totalFinal == 'string' && totalFinal.indexOf(',') !== -1) {
        totalFinal = totalFinal.replace(/,/g, '.');
    }
    console.log('Total: ' + totalFinal);
}
// taxIndex = starArray.indexOf('TAX') !== -1 ? starArray.indexOf('TAX') : starArray.indexOf('TVA');
// taxIndex = taxIndex === -1 ? starArray.indexOf('Tax') : taxIndex;
// tax = 'Cant parse TAX';
// if (taxIndex !== -1) {
//     tax = starArray[taxIndex + 1].match(/[+-]?\d+(\.\d+)?/g);
//     if (tax === null) {
//         tax = starArray[taxIndex - 1].match(/[+-]?\d+(\.\d+)?/g);
//         taxFinal = tax !== null ? tax : 'Cant parse TAX';
//         if (typeof taxFinal == 'object' || typeof taxFinal == 'Array') {
//             taxFinal = taxFinal.join('.');
//         }
//         console.log(tax !== 'Cant parse TAX' ? 'TAX: ' + taxFinal : taxFinal);
//     } else {
//         console.log('Tax: '+ tax);
//     }
// } else {
//     console.log('TAX: '+ tax)
// }

date = starArray.filter(a => {
    if (a.match(/(\d+)(-|\/)(\d+)(?:-|\/)(?:(\d+)\s+(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?)?/g)) {
        return a;
    }
});
date = date[0].match(/(\d+)(-|\/)(\d+)(?:-|\/)(?:(\d+)\s+(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?)?/g);
console.log('Date: ' + date);


function parseTax() {
    taxIndex = starArray.indexOf('TAX') !== -1 ? starArray.indexOf('TAX') : starArray.indexOf('Tax');
    taxIndex = taxIndex !== -1 ? taxIndex : starArray.indexOf('TVA');
    if (taxIndex === -1) {
        return 'Cant Parse TAX';
    } else {
        tax = starArray[taxIndex + 1].match(/[+-]?\d+(\.\d+)?/g);
        if (tax === null) {
            tax = starArray[taxIndex -1].match(/[+-]?\d+(\.\d+)?/g);
            if (tax === null) {
                return 'Cant Parse TAX';
            } else {
                if (typeof tax == 'object' || typeof tax == 'array') {
                    return tax.join('.');
                }
                if (typeof tax == 'string' && tax.indexOf(',') !== -1) {
                    return tax.replace(/,/g, '.');
                }
                return tax;
            }
        } else {
            if (typeof tax =='object' || typeof tax == 'array') {
                return tax.join('.');
            }
            if (typeof tax == 'string' && tax.indexOf(',') !== -1) {
                return tax.replace(/,/g, '.');
            }
            return tax;
        }
    }
}
console.log('Tax: ' + parseTax())

function parseT(in1, in2, in3) {
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
}

console.log('Total: ' + parseT('TOTAL', 'Total', 'TOTAL NET'));