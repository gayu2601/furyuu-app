import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Utility function to validate the HMAC signature
 */
const validateSignature = async (data: string, signature: string): Promise<boolean> => {
  console.log(data)
  const encoder = new TextEncoder();
  const key = encoder.encode(Deno.env.get('BORZO_CALLBACK_SECRET_KEY'));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const hmac = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );

  const computedSignature = Array.from(new Uint8Array(hmac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
};

const getDeliveryStatusMessage = (status) => {
  switch (status) {
    case "planned":
      return "Your order has been placed and is being processed.";
    case "active":
      return "Your order has been accepted and is waiting to be picked up.";
    case "courier_assigned":
      return "A courier has been assigned to your delivery.";
    case "courier_departed":
      return "The courier has departed to the pickup point.";
	case "courier_at_pickup":
      return "The courier for your order is at the pickup point.";
    case "parcel_picked_up":
      return "Your parcel has been picked up at the pick-up point";
    case "courier_arrived":
      return "The courier has arrived at the delivery location.";
    case "finished":
      return "Your parcel has been successfully delivered!";
    case "cancelled":
      return "The delivery has been cancelled.";
	case "delayed":
      return "The delivery is being delayed.";
    case "failed":
      return "The delivery attempt failed. Please contact support for details.";
    case "returned":
      return "The parcel has been returned to the sender.";
    case "deleted":
      return "The order has been deleted.";
    default:
      return "Unknown status. Please contact support for assistance.";
  }
}

/**
 * Main handler for the Edge Function
 */
Deno.serve(async (req) => {
  try {
    // Get headers and body
	console.log(req)
    const signature = req.headers.get("X-DV-Signature");
    if (!signature) {
      return new Response("Error: Signature not found", { status: 400 });
    }

    const data = await req.text();
    const isValid = await validateSignature(data, signature);

    if (!isValid) {
      return new Response("Error: Signature is not valid", { status: 400 });
    }
	
	const body = JSON.parse(data);
    const orderId = body.order?.order_id || body.delivery?.order_id;
	console.log(orderId)
	const username = body.order?.points[1]?.contact_person?.name || body.delivery?.contact_person.name
	let message = '';  

	const supabase = createClient(Deno.env.get('SPB_URL'), Deno.env.get('SPB_KEY'));
    const { data: existingOrder, error: fetchError } = await supabase
        .from("BorzoOrders")
        .select("*")
        .eq("orderId", orderId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching order:", fetchError);
        return new Response("Error fetching order", { status: 500 });
      }
    
    const updateData: Record<string, any> = {};
    if (existingOrder) {
      if (body.event_type.startsWith("order_")) {
        updateData.orderStatus = body.order.status;
        updateData.pickupAddress = body.order.points[0]?.address || null;
        updateData.pickupPhNo = body.order.points[0]?.contact_person?.phone || null;
      } else if (body.event_type.startsWith("delivery_")) {
        updateData.deliveryStatus = body.delivery?.status || null;
      }
      
      const { error: updateError } = await supabase
          .from("BorzoOrders")
          .update(updateData)
          .eq("orderId", orderId);

        if (updateError) {
          console.error("Error updating order:", updateError);
          return new Response("Error updating order", { status: 500 });
        }

		if(body.event_type.startsWith("delivery_")) {
			message = getDeliveryStatusMessage(body.delivery.status)
		}
    } else {
      let newOrderData = null;
      if (body.event_type.startsWith("order_")) {
        newOrderData = {
          orderId,
          created_username: username,
          created_at: body.order.created_datetime,
          orderStatus: body.order.status,
          pickupAddress: body.order.points[0]?.address || null,
          dropAddress: body.order.points[1]?.address || null,
          pickupPhNo: '+'+body.order.points[0]?.contact_person?.phone || null,
          dropPhNo: '+'+body.order.points[1]?.contact_person?.phone || null,
          amount: parseFloat(body.order.payment_amount),
          };
      } else if (body.event_type.startsWith("delivery_")) {
        newOrderData = {
          orderId,
          created_username: username,
          created_at: body.delivery.created_datetime,
          deliveryStatus: body.delivery.status,
          dropAddress: body.delivery.address || null,
          dropPhNo: '+'+body.delivery.contact_person?.phone || null,
          amount: parseFloat(body.delivery.order_payment_amount),
          };
      }
      
      const { error: insertError } = await supabase.from("BorzoOrders").insert(newOrderData);

      if (insertError) {
        console.error("Error inserting order:", insertError);
        return new Response("Error inserting order", { status: 500 });
        }

      message = `Order ${orderId} created successfully.`;
    }
	
	if(body.event_type.startsWith("delivery_")) {
		const { data: profileData, error: profileError } = await supabase
		  .from("profiles")
		  .select("pushToken")
		  .eq("username", username)
		  .single();

		if (profileError) {
		  console.error("Error fetching pushtoken:", profileError);
		  return new Response("Error fetching pushtoken", { status: 500 });
		}

		const pushToken = profileData?.pushToken;
		console.log(pushToken)
		
		  if (pushToken) {
			// Send notification
			const notification = {
			  to: pushToken,
			  sound: "default",
			  title: "Order Update",
			  body: message
			};
			console.log(notification)

			try {
			  await fetch('https://exp.host/--/api/v2/push/send', {
					method: 'POST',
					headers: {
					  'Content-Type': 'application/json'
					},
					body: JSON.stringify(notification),

			  });
			} catch (error) {
			  console.error("Error sending notification:", error);
			  return new Response("Error sending notification", { status: 500 });
			}
		  } else {
			console.warn("No push token found for username:", username);
		  }
	}
    return new Response(message, { status: 200 });
  } catch (error) {
    console.error("Error verifying signature:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
