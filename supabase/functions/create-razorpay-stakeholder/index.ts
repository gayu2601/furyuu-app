Deno.serve(async (req) => {
  const { accountId, name, email } = await req.json();

  const auth = `Basic ${btoa(Deno.env.get('RAZORPAY_KEY_ID') + ':' + Deno.env.get('RAZORPAY_KEY_SECRET'))}`;
  
  const body = { name, email };
  console.log(body);

  try {
    const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, {
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
