# 🏗️ VNPAY Integration Architecture

**Status**: ✅ Post-Refactor (Unified)  
**Last Updated**: May 16, 2026

---

## Overview

The VNPAY payment integration is now fully integrated into the main Next.js project as a feature module, not a separate application.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Frontend Pages                        │   │
│  │  ├── Student Wallet Page (/student/wallet)             │   │
│  │  └── Admin Dashboard                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               API Routes (/api/wallet)                 │   │
│  │  ├── POST /api/wallet/top-up                          │   │
│  │  ├── GET  /api/wallet/vnpay-return                    │   │
│  │  └── GET  /api/wallet/vnpay-ipn                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Shared Libraries                         │   │
│  │  ├── lib/vnpay.ts (VNPAY helpers)                      │   │
│  │  └── lib/wallet.ts (Wallet logic)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Unified Prisma (PostgreSQL)                │   │
│  │  ├── Order Model                                       │   │
│  │  ├── OrderItem Model                                   │   │
│  │  ├── Payment Model                                     │   │
│  │  └── Payment relations (Order, User)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         PostgreSQL Database (AWS RDS)                  │   │
│  │  Single database for entire application                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ↕
┌─────────────────────────────────────────────────────────────────┐
│              External Services                                  │
│  ├── VNPAY Payment Gateway                                     │
│  │   ├── POST /paymentv2/vpcpay.html (Payment redirect)       │
│  │   └── POST /merchant_webapi/api/transaction (API)          │
│  └── Email Service (Nodemailer)                               │
│      └── Send transaction notifications                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 VNPAY Payment Flow

### Step 1: Initiate Payment (POST /api/wallet/top-up)
```
User Request
    ↓
Validate amount (min 10,000 VND)
    ↓
Create pending Payment record (status: PENDING)
Generate unique transaction reference (txnRef)
    ↓
Build VNPAY payment params
    ├── vnp_TmnCode (merchant code)
    ├── vnp_Amount (in 100 VND units)
    ├── vnp_TxnRef (unique transaction ref)
    ├── vnp_ReturnUrl (callback after payment)
    └── vnp_IpnUrl (server notification)
    ↓
Sign params with HMAC SHA512
    ↓
Return payment URL to frontend
    ↓
Frontend redirects to VNPAY payment page
```

**Related Functions**:
- `validateTopUpAmount()` - Validate amount >= 10,000
- `createPendingTopUp()` - Create Payment with PENDING status
- `createTxnRef()` - Generate unique txnRef
- `getVnpayConfig()` - Load config from .env
- `signVnpParams()` - Sign with HMAC SHA512
- `formatVnpDate()` - Format date as YYYYMMDDHHmmss

### Step 2a: Payment Success - Return URL (GET /api/wallet/vnpay-return)
```
VNPAY redirects user to /api/wallet/vnpay-return with params
    ↓
Verify signature (HMAC SHA512 validation)
    ↓
Extract txnRef and responseCode
    ↓
Update Payment status based on responseCode
    ├── "00" → SUCCESS
    └── Other → FAILED
    ↓
Redirect user to /student/wallet?payment=success
```

**Related Functions**:
- `verifyVnpParams()` - Verify HMAC signature
- `markTopUpResultByTxnRef()` - Update Payment status

### Step 2b: Payment Notification - IPN (GET /api/wallet/vnpay-ipn)
```
VNPAY sends IPN request to server (background)
    ↓
Verify signature and params
    ↓
Validate amount matches
    ↓
Update Payment record (may already be updated from return URL)
    ↓
Return RspCode to VNPAY
    ├── "00" → Success
    ├── "01" → Order not found
    ├── "02" → Already updated
    ├── "04" → Amount invalid
    └── "97" → Signature invalid
```

**Related Functions**:
- `verifyVnpParams()` - Verify HMAC signature
- `findTopUpByTxnRef()` - Find Payment record
- `markTopUpResultByTxnRef()` - Update Payment status

---

## 📦 Data Models

### Payment Model (Prisma)
```typescript
model Payment {
  id        String   @id @default(uuid())
  orderId   String   @unique
  amount    Float
  status    String    // "PENDING" | "SUCCESS" | "FAILED"
  createdAt DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id])
}
```

### Order Model (Prisma)
```typescript
model Order {
  id        String   @id @default(uuid())
  userId    String
  createdAt DateTime @default(now())

  user    User       @relation(fields: [userId], references: [id])
  items   OrderItem[]
  payment Payment?
}
```

### Related Models
```typescript
model OrderItem {
  id       String @id @default(uuid())
  orderId  String
  courseId String
  price    Float

  order  Order  @relation(fields: [orderId], references: [id])
  course Course @relation(fields: [courseId], references: [id])
}

model User {
  id     String @id @default(uuid())
  // ... other fields
  orders Order[]  // User has many orders
}
```

---

## 🔑 Configuration

### Environment Variables (.env)
```bash
# VNPAY Configuration
VNPAY_TMN_CODE=<merchant_code>
VNPAY_HASH_SECRET=<secret_key>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_API=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_BASE_URL=http://localhost:3000  # or production domain
VNPAY_RETURN_PATH=/api/wallet/vnpay-return
VNPAY_IPN_PATH=/api/wallet/vnpay-ipn

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/final-pj
```

### Config Template (config/vnpay.json)
```json
{
  "tmnCode": "Read from VNPAY_TMN_CODE in .env",
  "hashSecret": "Read from VNPAY_HASH_SECRET in .env",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  "apiUrl": "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  "baseUrl": "Read from VNPAY_BASE_URL in .env",
  "returnPath": "/api/wallet/vnpay-return",
  "ipnPath": "/api/wallet/vnpay-ipn"
}
```

---

## 📁 File Structure

### Core VNPAY Files
```
lib/
├── vnpay.ts
│   ├── VnpayConfig (interface)
│   ├── getVnpayConfig(request?)
│   ├── formatVnpDate(date)
│   ├── createTxnRef()
│   ├── normalizeIpAddr(ip)
│   ├── signVnpParams(params, secret)
│   ├── verifyVnpParams(query, secret)
│   └── joinUrl(base, path)
│
└── wallet.ts
    ├── getUserBalance(userId)
    ├── createTopUp(userId, amount)
    ├── createPendingTopUp(userId, amount, txnRef)
    ├── findTopUpByTxnRef(txnRef)
    ├── markTopUpResultByTxnRef({txnRef, responseCode})
    ├── isValidTopUpAmount(amount)
    ├── getWalletTransactions(userId)
    └── WalletTransaction (interface)

app/api/wallet/
├── route.ts                     (general wallet endpoint, if any)
├── top-up/
│   └── route.ts                 (POST - create payment URL)
├── vnpay-ipn/
│   └── route.ts                 (GET - IPN callback)
└── vnpay-return/
    └── route.ts                 (GET - payment return)

config/
└── vnpay.json                   (config template/reference)

prisma/
└── schema.prisma
    ├── Order
    ├── OrderItem
    └── Payment
```

---

## 🔐 Security Implementation

### HMAC SHA512 Signature Verification
```typescript
// Request signing (when creating payment URL)
const signData = buildVnpQuery(sortedParams);
const signature = createHmac('sha512', hashSecret)
  .update(Buffer.from(signData, 'utf-8'))
  .digest('hex');

// Response verification (when receiving callback)
const secureHash = query.vnp_SecureHash;
delete query.vnp_SecureHash;
delete query.vnp_SecureHashType;
const signData = buildVnpQuery(sortedParams);
const expectedHash = createHmac('sha512', hashSecret)
  .update(Buffer.from(signData, 'utf-8'))
  .digest('hex');
return secureHash === expectedHash;
```

### Amount Validation
```typescript
// Always verify amount in callbacks
const expectedAmount = Math.round(payment.amount * 100);  // Convert to 100 VND units
const receivedAmount = Number(query.vnp_Amount ?? 0);
if (expectedAmount !== receivedAmount) {
  return { RspCode: "04", Message: "Amount invalid" };
}
```

### IP Address Handling
```typescript
// Normalize IP address for security
const rawIp = request.headers.get('x-forwarded-for') || 
              request.connection.remoteAddress || 
              '127.0.0.1';
const ip = String(rawIp).split(',')[0].trim().replace('::ffff:', '');
```

---

## 🧪 Testing Scenarios

### Test Case 1: Successful Payment
```
1. Call POST /api/wallet/top-up
   - Input: { amount: 50000 }
   - Expected: { ok: true, paymentUrl, txnRef }

2. Complete payment on VNPAY page
   - VNPAY returns to /api/wallet/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=...

3. Verify payment
   - Payment.status should be "SUCCESS"
   - User balance should increase
```

### Test Case 2: Failed Payment
```
1. Call POST /api/wallet/top-up
   - Input: { amount: 50000 }

2. Cancel on VNPAY page
   - VNPAY returns with vnp_ResponseCode != "00"

3. Verify payment
   - Payment.status should be "FAILED"
   - User balance should NOT increase
```

### Test Case 3: Invalid Amount
```
1. Call POST /api/wallet/top-up
   - Input: { amount: 5000 }  (less than minimum 10000)
   - Expected: 400 error
```

### Test Case 4: Duplicate IPN Notification
```
1. First IPN updates Payment to SUCCESS
2. Second IPN with same txnRef arrives
   - Should return RspCode: "02" (already updated)
   - Should NOT update again
```

---

## 📊 Monitoring & Debugging

### Key Logs to Monitor
```
[VNPAY][TOPUP] config
[VNPAY][TOPUP] vnp_Params
[VNPAY][TOPUP] signData
[VNPAY][TOPUP] secureHash
[VNPAY][TOPUP] redirectUrl

[VNPAY][IPN] query
[VNPAY][IPN] signatureValid
[VNPAY][IPN] updated payment

[VNPAY][RETURN] query
[VNPAY][RETURN] signatureValid
[VNPAY][RETURN] updated payment
```

### Common Issues
1. **Checksum failed**: Verify `VNPAY_HASH_SECRET` is correct
2. **Order not found**: Verify txnRef generation and storage
3. **Amount mismatch**: Ensure amount is converted to 100 VND units correctly
4. **Config missing**: All VNPAY env variables must be set

---

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Set `VNPAY_PAYMENT_URL` to production VNPAY endpoint
- [ ] Update `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` to production values
- [ ] Set `VNPAY_BASE_URL` to actual domain (must support HTTPS)
- [ ] Verify database connectivity
- [ ] Enable HTTPS for all endpoints
- [ ] Set up proper error monitoring/logging
- [ ] Test end-to-end payment flow

### Environment Progression
```
Development: http://localhost:3000
  └── VNPAY Sandbox (sandbox.vnpayment.vn)

Staging: https://staging.example.com
  └── VNPAY Sandbox

Production: https://example.com
  └── VNPAY Production
```

---

## 📞 Support References

- **VNPAY Documentation**: https://sandbox.vnpayment.vn/apis/
- **VNPAY Integration**: See full payment flow docs
- **Prisma Documentation**: https://www.prisma.io/docs/
- **Next.js API Routes**: https://nextjs.org/docs/api-routes

---

**Document Version**: 1.0  
**Last Reviewed**: May 16, 2026  
**Next Review**: December 2026
