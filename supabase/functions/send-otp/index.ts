/**
 * Edge Function: send-otp
 * Customer ke phone pe OTP SMS bhejta hai via Fast2SMS.
 *
 * URL: POST https://<project>.supabase.co/functions/v1/send-otp
 * Body: { "phone": "9876543210", "otp": "123456", "restaurant_name": "Zara Restaurant" }
 *
 * Required secret: FAST2SMS_API_KEY
 * Set via: supabase secrets set FAST2SMS_API_KEY=your_key
 */

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { phone, otp, restaurant_name } = await req.json()

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'phone and otp are required' }),
        { status: 400, headers }
      )
    }

    const apiKey = Deno.env.get('FAST2SMS_API_KEY')
    if (!apiKey) {
      // SMS not configured — return success silently (OTP shown on screen anyway)
      console.warn('FAST2SMS_API_KEY not set — SMS skipped')
      return new Response(JSON.stringify({ success: true, sms: false }), { headers })
    }

    const message = `${otp} is your OTP for ${restaurant_name || 'QR Kitchen'}. Valid for 10 minutes. Do not share.`

    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: phone,
      }),
    })

    const result = await res.json()

    if (!result.return) {
      console.error('Fast2SMS error:', result)
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'SMS failed' }),
        { status: 500, headers }
      )
    }

    return new Response(JSON.stringify({ success: true, sms: true }), { headers })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers }
    )
  }
})
