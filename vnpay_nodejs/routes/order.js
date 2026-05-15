let express = require('express');
let router = express.Router();
const request = require('request');
const moment = require('moment');
const crypto = require('crypto');
const config = require('config');
const prisma = require('../services/prisma');

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (value === undefined || value === null) continue;
    const clean = String(value).trim();
    if (!clean) continue;
    sorted[key] = clean;
  }
  return sorted;
}

function vnpEncode(input) {
  return encodeURIComponent(input).replace(/%20/g, '+');
}

function buildVnpQuery(params) {
  return Object.entries(params)
    .map(([key, value]) => `${vnpEncode(key)}=${vnpEncode(value)}`)
    .join('&');
}

function mapStatusByResponseCode(code) {
  return code === '00' ? 'SUCCESS' : 'FAILED';
}

function getClientIp(req) {
  const rawIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '';
  const ip = String(rawIp).split(',')[0].trim().replace('::ffff:', '');
  if (!ip || ip === '::1') return '127.0.0.1';
  return ip;
}

function getVnpayConfig(req) {
  const tmnCode = String(config.get('vnp_TmnCode') || '').trim();
  const hashSecret = String(config.get('vnp_HashSecret') || '').trim();
  const paymentUrl = String(config.get('vnp_Url') || '').trim();
  const apiUrl = String(config.get('vnp_Api') || '').trim();
  const baseUrlDefault = String(config.get('vnp_BaseUrl') || '').trim();
  const returnPath = String(config.get('vnp_ReturnPath') || '/order/vnpay_return').trim();
  const ipnPath = String(config.get('vnp_IpnPath') || '/order/vnpay_ipn').trim();

  if (!tmnCode || !hashSecret || !paymentUrl || !apiUrl || !baseUrlDefault) {
    throw new Error('VNPAY_CONFIG_MISSING');
  }

  const forwardedHost = req && (req.headers['x-forwarded-host'] || req.headers.host);
  const forwardedProto = req && req.headers['x-forwarded-proto'];
  const isLocalHost = forwardedHost && (String(forwardedHost).includes('localhost') || String(forwardedHost).includes('127.0.0.1'));
  const requestBaseUrl = forwardedHost ? `${forwardedProto || (isLocalHost ? 'http' : 'https')}://${forwardedHost}` : null;
  const selectedBase = requestBaseUrl || baseUrlDefault;
  const parsedBase = new URL(selectedBase);
  const isLocal = parsedBase.hostname === 'localhost' || parsedBase.hostname === '127.0.0.1';
  if (!isLocal) {
    parsedBase.protocol = 'https:';
  }
  const baseUrl = parsedBase.origin;

  return {
    tmnCode,
    hashSecret,
    paymentUrl,
    apiUrl,
    returnUrl: new URL(returnPath, baseUrl).toString(),
    ipnUrl: new URL(ipnPath, baseUrl).toString()
  };
}

function buildSignedUrl(vnp_Params, secretKey, vnpUrl) {
  const sortedParams = sortObject(vnp_Params);
  const signData = buildVnpQuery(sortedParams);
  const signed = crypto.createHmac('sha512', secretKey).update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = signed;
  return `${vnpUrl}?${buildVnpQuery(sortedParams)}`;
}

function verifyVnpSignature(params) {
  const cloned = { ...params };
  const secureHash = cloned.vnp_SecureHash;
  delete cloned.vnp_SecureHash;
  delete cloned.vnp_SecureHashType;

  const sortedParams = sortObject(cloned);
  const signData = buildVnpQuery(sortedParams);
  const vnpConfig = getVnpayConfig();
  const signed = crypto
    .createHmac('sha512', vnpConfig.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return secureHash === signed;
}

router.get('/', async function (req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.render('orderlist', {
      title: 'Danh sach don hang',
      orders
    });
  } catch (err) {
    next(err);
  }
});

router.get('/create_payment_url', function (req, res) {
  res.render('order', { title: 'Tao moi don hang', amount: 10000 });
});

router.post('/create_payment_url', async function (req, res, next) {
  try {
    const vnpConfig = getVnpayConfig(req);
    const now = new Date();
    const createDate = moment(now).utcOffset(7).format('YYYYMMDDHHmmss');
    const orderId = moment(now).format('DDHHmmss');
    const amount = Number(req.body.amount || 0);
    const amountInMinorUnit = Math.round(amount * 100);

    if (!amount || amount <= 0) {
      return res.status(400).send('Invalid amount');
    }

    const bankCode = req.body.bankCode || '';
    const locale = req.body.language || 'vn';
    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpConfig.tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: 'Thanh toan cho ma GD:' + orderId,
      vnp_OrderType: 'other',
      vnp_Amount: amountInMinorUnit,
      vnp_ReturnUrl: vnpConfig.returnUrl,
      vnp_IpnUrl: vnpConfig.ipnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: createDate
    };

    if (bankCode) {
      vnp_Params.vnp_BankCode = bankCode;
    }

    await prisma.order.create({
      data: {
        orderCode: orderId,
        amount,
        status: 'PENDING',
        description: vnp_Params.vnp_OrderInfo,
        bankCode: bankCode || null,
        locale,
        ipAddress: vnp_Params.vnp_IpAddr
      }
    });

    await prisma.paymentTransaction.create({
      data: {
        order: { connect: { orderCode: orderId } },
        txnRef: orderId,
        amount,
        status: 'PENDING',
        source: 'CREATE_PAYMENT',
        bankCode: bankCode || null,
        rawPayload: JSON.stringify(vnp_Params)
      }
    });

    const paymentUrl = buildSignedUrl(vnp_Params, vnpConfig.hashSecret, vnpConfig.paymentUrl);
    return res.redirect(paymentUrl);
  } catch (err) {
    console.error('[VNPAY][CREATE_PAYMENT_URL] error', err);
    next(err);
  }
});

router.get('/vnpay_return', async function (req, res, next) {
  try {
    const vnp_Params = { ...req.query };
    const isValidSignature = verifyVnpSignature(vnp_Params);

    if (!isValidSignature) {
      return res.render('success', { code: '97', order: null, status: 'FAILED' });
    }

    const txnRef = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;
    const status = mapStatusByResponseCode(responseCode);

    const order = await prisma.order.findUnique({ where: { orderCode: txnRef } });
    if (!order) {
      return res.render('success', { code: '01', order: null, status: 'FAILED' });
    }

    let finalOrder = order;
    if (order.status === 'PENDING') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status,
          responseCode,
          vnpTransactionNo: vnp_Params.vnp_TransactionNo || null
        }
      });
      finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    }

    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        txnRef,
        amount: Number(vnp_Params.vnp_Amount || 0) / 100,
        responseCode,
        vnpTransactionNo: vnp_Params.vnp_TransactionNo || null,
        bankCode: vnp_Params.vnp_BankCode || null,
        status,
        source: 'RETURN',
        rawPayload: JSON.stringify(vnp_Params)
      }
    });

    return res.render('success', { code: responseCode, order: finalOrder, status });
  } catch (err) {
    next(err);
  }
});

router.get('/vnpay_ipn', async function (req, res) {
  try {
    const vnp_Params = { ...req.query };
    const isValidSignature = verifyVnpSignature(vnp_Params);

    if (!isValidSignature) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const txnRef = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;
    const amountInMinorUnit = Number(vnp_Params.vnp_Amount || 0);

    const order = await prisma.order.findUnique({ where: { orderCode: txnRef } });
    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (Math.round(order.amount * 100) !== amountInMinorUnit) {
      return res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
    }

    if (order.status !== 'PENDING') {
      return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
    }

    const status = mapStatusByResponseCode(responseCode);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        responseCode,
        vnpTransactionNo: vnp_Params.vnp_TransactionNo || null
      }
    });

    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        txnRef,
        amount: amountInMinorUnit / 100,
        responseCode,
        vnpTransactionNo: vnp_Params.vnp_TransactionNo || null,
        bankCode: vnp_Params.vnp_BankCode || null,
        status,
        source: 'IPN',
        rawPayload: JSON.stringify(vnp_Params)
      }
    });

    return res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

router.get('/transactions', async function (req, res, next) {
  try {
    const rows = await prisma.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { order: true }
    });
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/querydr', function (req, res) {
  res.render('querydr', { title: 'Truy van ket qua thanh toan' });
});

router.get('/refund', function (req, res) {
  res.render('refund', { title: 'Hoan tien giao dich thanh toan' });
});

router.post('/querydr', function (req, res) {
  const vnpConfig = getVnpayConfig(req);
  let date = new Date();

  let vnp_TxnRef = req.body.orderId;
  let vnp_TransactionDate = req.body.transDate;

  let vnp_RequestId = moment(date).format('HHmmss');
  let vnp_Version = '2.1.0';
  let vnp_Command = 'querydr';
  let vnp_OrderInfo = 'Truy van GD ma:' + vnp_TxnRef;

  let vnp_IpAddr = getClientIp(req);
  let vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');

  let data =
    vnp_RequestId +
    '|' +
    vnp_Version +
    '|' +
    vnp_Command +
    '|' +
    vnpConfig.tmnCode +
    '|' +
    vnp_TxnRef +
    '|' +
    vnp_TransactionDate +
    '|' +
    vnp_CreateDate +
    '|' +
    vnp_IpAddr +
    '|' +
    vnp_OrderInfo;

  let vnp_SecureHash = crypto.createHmac('sha512', vnpConfig.hashSecret).update(Buffer.from(data, 'utf-8')).digest('hex');

  let dataObj = {
    vnp_RequestId,
    vnp_Version,
    vnp_Command,
    vnp_TmnCode: vnpConfig.tmnCode,
    vnp_TxnRef,
    vnp_OrderInfo,
    vnp_TransactionDate,
    vnp_CreateDate,
    vnp_IpAddr,
    vnp_SecureHash
  };

  request({ url: vnpConfig.apiUrl, method: 'POST', json: true, body: dataObj }, function (_error, _response, body) {
    res.json(body || {});
  });
});

router.post('/refund', function (req, res) {
  const vnpConfig = getVnpayConfig(req);
  let date = new Date();

  let vnp_TxnRef = req.body.orderId;
  let vnp_TransactionDate = req.body.transDate;
  let vnp_Amount = req.body.amount * 100;
  let vnp_TransactionType = req.body.transType;
  let vnp_CreateBy = req.body.user;

  let vnp_RequestId = moment(date).format('HHmmss');
  let vnp_Version = '2.1.0';
  let vnp_Command = 'refund';
  let vnp_OrderInfo = 'Hoan tien GD ma:' + vnp_TxnRef;
  let vnp_IpAddr = getClientIp(req);
  let vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
  let vnp_TransactionNo = '0';

  let data =
    vnp_RequestId +
    '|' +
    vnp_Version +
    '|' +
    vnp_Command +
    '|' +
    vnpConfig.tmnCode +
    '|' +
    vnp_TransactionType +
    '|' +
    vnp_TxnRef +
    '|' +
    vnp_Amount +
    '|' +
    vnp_TransactionNo +
    '|' +
    vnp_TransactionDate +
    '|' +
    vnp_CreateBy +
    '|' +
    vnp_CreateDate +
    '|' +
    vnp_IpAddr +
    '|' +
    vnp_OrderInfo;

  let vnp_SecureHash = crypto.createHmac('sha512', vnpConfig.hashSecret).update(Buffer.from(data, 'utf-8')).digest('hex');

  let dataObj = {
    vnp_RequestId,
    vnp_Version,
    vnp_Command,
    vnp_TmnCode: vnpConfig.tmnCode,
    vnp_TransactionType,
    vnp_TxnRef,
    vnp_Amount,
    vnp_TransactionNo,
    vnp_CreateBy,
    vnp_OrderInfo,
    vnp_TransactionDate,
    vnp_CreateDate,
    vnp_IpAddr,
    vnp_SecureHash
  };

  request({ url: vnpConfig.apiUrl, method: 'POST', json: true, body: dataObj }, function (_error, _response, body) {
    res.json(body || {});
  });
});

module.exports = router;
