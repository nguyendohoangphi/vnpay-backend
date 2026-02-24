const crypto = require('crypto');
const querystring = require('qs');

const VNPAY_TMN_CODE = '4K175GIS';
const VNPAY_HASH_SECRET = 'KOYB9O92EUDMYBJ9BP2CGN58WEIBYN0J';

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
}

let vnp_Params = {};
vnp_Params['vnp_Version'] = '2.1.0';
vnp_Params['vnp_Command'] = 'pay';
vnp_Params['vnp_TmnCode'] = VNPAY_TMN_CODE;
vnp_Params['vnp_Locale'] = 'vn';
vnp_Params['vnp_CurrCode'] = 'VND';
vnp_Params['vnp_TxnRef'] = '123456';
vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang';
vnp_Params['vnp_OrderType'] = 'other';
vnp_Params['vnp_Amount'] = 5000000;
vnp_Params['vnp_ReturnUrl'] = 'https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/#returnurl';
vnp_Params['vnp_IpAddr'] = '127.0.0.1';
vnp_Params['vnp_CreateDate'] = '20230101120000';

vnp_Params = sortObject(vnp_Params);
const signData = querystring.stringify(vnp_Params, { encode: false });
console.log('signData:');
console.log(signData);

const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
console.log('\nsigned:', signed);
