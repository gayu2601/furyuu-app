Deno.serve(async (req) => {
  const { email, phone, type, reference_id, legal_business_name, business_type, profile, legal_info } = await req.json();
  
  const auth = `Basic ${btoa(Deno.env.get('RAZORPAY_KEY_ID') + ':' + Deno.env.get('RAZORPAY_KEY_SECRET'))}`;
  
  const body = {
    email,
    phone,
    type,
    reference_id,
    legal_business_name,
    business_type,
    profile,
    legal_info
  };
  console.log(body);
  
  try {
    const response = await fetch("https://api.razorpay.com/v2/accounts", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
	console.log(data);
	return new Response(JSON.stringify(data), { status: response.status });
  } catch (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }
});
