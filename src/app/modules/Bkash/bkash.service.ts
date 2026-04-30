// src/app/modules/Bkash/bkash.service.ts
import config from "../../../config";
import prisma from "../../../shared/prisma";

interface BkashTokenResponse {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface BkashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
}

export interface BkashExecutePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  paymentExecuteTime: string;
  merchantInvoiceNumber: string;
  payerReference: string;
  customerMsisdn: string;
}

/**
 * Obtain a short-lived access token from bKash.
 * Each create/execute call needs a fresh token; bKash tokens expire quickly.
 */
const grantToken = async (): Promise<string> => {
  const { appKey, appSecret, username, password, baseUrl } = config.bkash;

  const response = await fetch(`${baseUrl}/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: username as string,
      password: password as string,
    },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash token grant failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as BkashTokenResponse;
  return data.id_token;
};

/**
 * Initiate a bKash checkout payment for an existing order.
 * Stores the bKash paymentID temporarily in the order's transactionId so
 * the callback handler can look up the order.
 */
const createPayment = async (
  orderId: string,
  amount: number,
): Promise<{ bkashURL: string; paymentID: string }> => {
  const { appKey, baseUrl } = config.bkash;
  const callbackURL = `${config.backendUrl}/api/v1/bkash/callback`;

  const token = await grantToken();

  const response = await fetch(`${baseUrl}/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": appKey as string,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: " ",
      callbackURL,
      amount: amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: orderId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `bKash create payment failed (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as BkashCreatePaymentResponse;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash create payment error: ${data.statusMessage}`);
  }

  // Store the bKash paymentID in transactionId temporarily so the callback
  // can identify the order when bKash payment was not yet executed.
  await prisma.order.update({
    where: { id: orderId },
    data: { transactionId: data.paymentID },
  });

  return { bkashURL: data.bkashURL, paymentID: data.paymentID };
};

/**
 * Execute (capture) a bKash payment after the user completes the payment UI.
 * Called from the bKash callback route.
 */
const executePayment = async (
  paymentID: string,
): Promise<BkashExecutePaymentResponse> => {
  const { appKey, baseUrl } = config.bkash;
  const token = await grantToken();

  const response = await fetch(`${baseUrl}/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": appKey as string,
    },
    body: JSON.stringify({ paymentID }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `bKash execute payment failed (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as BkashExecutePaymentResponse;
  return data;
};

export const BkashService = {
  grantToken,
  createPayment,
  executePayment,
};
