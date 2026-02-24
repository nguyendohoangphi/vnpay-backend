const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// --- VNPAY INTEGRATION ---
const VNPAY_TMN_CODE = "4K175GIS";
const VNPAY_HASH_SECRET = "KOYB9O92EUDMYBJ9BP2CGN58WEIBYN0J";
const VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_URL = "https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/#returnurl";

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
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

app.post('/create_payment_url', (req, res) => {
    try {
        const date = new Date();
        const createDate = moment(date).utcOffset(7).format('YYYYMMDDHHmmss');

        const ipAddr = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            '127.0.0.1';

        const amount = req.body.amount;
        const orderInfo = req.body.orderInfo || "Thanh toan don hang";

        let orderId = req.body.orderId || moment(date).format('DDHHmmss');
        orderId = orderId.replace(/[^a-zA-Z0-9]/g, "");

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = VNPAY_TMN_CODE;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = VNPAY_RETURN_URL;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        vnp_Params = sortObject(vnp_Params);

        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

        vnp_Params['vnp_SecureHash'] = signed;
        let vnpUrl = VNPAY_URL + '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Đây là IPN URL (Server-to-Server) mà email VNPAY nhắc đến
// Bạn sẽ copy domain của bạn gắn đuôi /vnpay_ipn để gửi cho VNPAY. Ví dụ: https://your-app-name.onrender.com/vnpay_ipn
app.get('/vnpay_ipn', (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    let orderId = vnp_Params['vnp_TxnRef'];
    let rspCode = vnp_Params['vnp_ResponseCode'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
    let signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        // Kiểm tra dữ liệu xem đơn hàng có trùng khớp không
        // (Ở đây bạn kết nối Firebase Admin SDK để sửa trạng thái đơn hàng thành "Đã thanh toán")

        if (rspCode == '00') {
            // Thanh toán thành công (Update DB)
            console.log(`Đã cập nhật DB: Đơn hàng ${orderId} thanh toán THÀNH CÔNG.`);
        } else {
            // Thanh toán thất bại (Update DB)
            console.log(`Đơn hàng ${orderId} thanh toán THẤT BẠI.`);
        }

        // Trả mã 00 báo cho VNPAY biết là máy chủ đã ghi nhận IPN thành công
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
    } else {
        // Checksum sai, báo lỗi
        res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' })
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`VNPay server is running on port ${PORT}`);
});
