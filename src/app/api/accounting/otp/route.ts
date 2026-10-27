import { NextRequest, NextResponse } from 'next/server';

interface OtpEntry {
  code: string;
  phone: string;
  amount: number;
  title?: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP store (keyed by target phone)
const otpStore: Map<string, OtpEntry> = new Map();

const TARGET_PHONE = '+91 81499 09546';
const ADMIN_NAME = 'Sana Zeba Bakshi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'send', amount, title, payee, callmebotApiKey, fast2smsApiKey } = body;

    if (action === 'send') {
      const numAmount = Number(amount) || 0;
      if (numAmount <= 2000) {
        return NextResponse.json({
          success: true,
          requiresOtp: false,
          message: 'Payment amount is within ₹2,000 threshold. OTP not required.'
        });
      }

      // Generate a 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      otpStore.set(TARGET_PHONE, {
        code,
        phone: TARGET_PHONE,
        amount: numAmount,
        title: title || 'Expense Disbursement',
        expiresAt,
        attempts: 0
      });

      console.log(`[EXPENSE OTP DISPATCH] Target: ${TARGET_PHONE} (${ADMIN_NAME}) | Code: ${code} | Amount: ₹${numAmount.toLocaleString('en-IN')}`);

      const cleanPhone = TARGET_PHONE.replace(/\D/g, ''); // 918149909546
      const last10Digits = cleanPhone.slice(-10); // 8149909546

      // 1. Attempt Free External Delivery via CallMeBot WhatsApp API (Sends from CallMeBot cloud number +34 xxx)
      const cmbKey = callmebotApiKey || process.env.CALLMEBOT_API_KEY;
      let callmebotDelivered = false;
      if (cmbKey) {
        try {
          const cmbUrl = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(
            `🔒 *SHESHAAN GLOBAL SECURITY OTP*\n\nYour 6-Digit Code: *${code}*\nAmount: ₹${numAmount.toLocaleString('en-IN')}\nCost Head: ${title || 'Internal Expense'}\n\n(Valid for 5 mins for CEO Sana Zeba Bakshi)`
          )}&apikey=${cmbKey}`;
          const cmbRes = await fetch(cmbUrl);
          if (cmbRes.ok) {
            callmebotDelivered = true;
            console.log(`[CallMeBot OTP] Sent successfully from cloud number to ${cleanPhone}`);
          }
        } catch (e) {
          console.warn('[CallMeBot Error]', e);
        }
      }

      // 2. Attempt Free Developer SMS via Fast2SMS API (Sends from Indian carrier shortcode directly to cellular inbox)
      const fastKey = fast2smsApiKey || process.env.FAST2SMS_API_KEY;
      let fast2smsDelivered = false;
      if (fastKey) {
        try {
          const fRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
              authorization: fastKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              variables_values: code,
              route: 'otp',
              numbers: last10Digits
            })
          });
          const fJson = await fRes.json();
          if (fJson.return) {
            fast2smsDelivered = true;
            console.log(`[Fast2SMS OTP] Sent successfully to cellular phone ${last10Digits}`);
          }
        } catch (e) {
          console.warn('[Fast2SMS Error]', e);
        }
      }

      // 3. Fallback background free tier SMS attempt
      try {
        fetch('https://textbelt.com/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: `+${cleanPhone}`,
            message: `Sheshaan Global OTP: ${code} for expense ₹${numAmount}. Valid 5 mins.`,
            key: 'textbelt'
          })
        }).catch(() => {});
      } catch {}

      // 4. Preformatted 100% Free WhatsApp Direct URL as immediate zero-barrier fallback
      const whatsappText = `🔒 *SHESHAAN GLOBAL SECURITY OTP*\n\nExpense Disbursement Authorization\nAmount: ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nCost Head: ${title || 'Internal Expense'}\nBeneficiary: ${payee || 'Direct Voucher'}\n\nYour 6-Digit Verification Code is:\n👉 *${code}*\n\n(Valid for 5 minutes. Certified to CEO Sana Zeba Bakshi)`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappText)}`;

      return NextResponse.json({
        success: true,
        requiresOtp: true,
        phone: TARGET_PHONE,
        adminName: ADMIN_NAME,
        expiresInSeconds: 300,
        message: `OTP generated for administrator ${ADMIN_NAME} (${TARGET_PHONE}).`,
        previewCode: code,
        whatsappUrl,
        callmebotDelivered,
        fast2smsDelivered
      });
    }

    if (action === 'verify') {
      const inputCode = String(body.code || '').trim();
      const entry = otpStore.get(TARGET_PHONE);

      if (!entry) {
        return NextResponse.json({
          verified: false,
          error: 'No active OTP found. Please request a new code.'
        }, { status: 400 });
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(TARGET_PHONE);
        return NextResponse.json({
          verified: false,
          error: 'OTP has expired. Please request a new code.'
        }, { status: 400 });
      }

      entry.attempts += 1;
      if (entry.attempts > 5) {
        otpStore.delete(TARGET_PHONE);
        return NextResponse.json({
          verified: false,
          error: 'Too many incorrect attempts. Please request a new code.'
        }, { status: 429 });
      }

      if (entry.code !== inputCode) {
        return NextResponse.json({
          verified: false,
          error: 'Incorrect OTP. Please enter the valid 6-digit code.'
        }, { status: 400 });
      }

      // Code matched!
      otpStore.delete(TARGET_PHONE);
      return NextResponse.json({
        verified: true,
        phone: TARGET_PHONE,
        verifiedAt: new Date().toISOString(),
        message: `Security verification successful for ${ADMIN_NAME} (${TARGET_PHONE}).`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP processing failed' }, { status: 500 });
  }
}
