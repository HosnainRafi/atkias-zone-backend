import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiError";

export type TSteadfastCreateParcelPayload = {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  delivery_type: 0 | 1;
  alternative_phone?: string;
  recipient_email?: string;
  note?: string;
  item_description?: string;
  total_lot?: number;
};

export type TSteadfastParcel = {
  consignmentId: number;
  trackingCode: string;
  invoice: string;
  status: string;
  rawResponse: unknown;
};

export type TSteadfastStatus = {
  status: string;
  rawResponse: unknown;
};

export type TSteadfastPaymentEntry = {
  paymentId?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  rawResponse: unknown;
};

export type TSteadfastReturnRequest = {
  id?: string;
  consignmentId?: string;
  trackingCode?: string;
  invoice?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
  rawResponse: unknown;
};

export type TSteadfastTrackingSnapshot = {
  syncedAt: string;
  statuses: {
    consignmentId: TSteadfastStatus;
    invoice?: TSteadfastStatus;
    trackingCode?: TSteadfastStatus;
  };
  paymentEntries: TSteadfastPaymentEntry[];
  paymentEntriesCount: number;
  returnRequests: TSteadfastReturnRequest[];
  returnRequestsCount: number;
  paymentsRaw: unknown;
  returnsRaw: unknown;
};

function getConfiguredBaseUrl(): string {
  return config.steadfast.baseUrl.replace(/\/$/, "");
}

function getHeaders(): HeadersInit {
  const { apiKey, secretKey } = config.steadfast;

  if (!apiKey || !secretKey) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Steadfast credentials are not configured.",
    );
  }

  return {
    "Content-Type": "application/json",
    "Api-Key": apiKey,
    "Secret-Key": secretKey,
  };
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getResponseMessage(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed || undefined;
  }

  if (!payload || typeof payload !== "object") return undefined;

  const maybePayload = payload as Record<string, unknown>;
  return [maybePayload.message, maybePayload.error, maybePayload.statusMessage]
    .find((value) => typeof value === "string") as string | undefined;
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

function toCleanString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return undefined;
}

function extractArray(payload: unknown, keys: string[]): unknown[] {
  const record = asRecord(payload);
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

async function requestSteadfast(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`${getConfiguredBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      getResponseMessage(data) || `Steadfast request failed (${response.status}).`,
    );
  }

  return data;
}

function recordContainsIdentifiers(
  payload: unknown,
  identifiers: {
    consignmentId?: string;
    trackingCode?: string;
    invoice?: string;
  },
): boolean {
  if (!payload) return false;

  if (Array.isArray(payload)) {
    return payload.some((item) => recordContainsIdentifiers(item, identifiers));
  }

  if (typeof payload !== "object") return false;

  const record = payload as Record<string, unknown>;
  const directValues = [
    toCleanString(record.consignment_id),
    toCleanString(record.consignmentId),
    toCleanString(record.tracking_code),
    toCleanString(record.trackingCode),
    toCleanString(record.invoice),
  ];

  if (
    (identifiers.consignmentId && directValues.includes(identifiers.consignmentId)) ||
    (identifiers.trackingCode && directValues.includes(identifiers.trackingCode)) ||
    (identifiers.invoice && directValues.includes(identifiers.invoice))
  ) {
    return true;
  }

  return Object.values(record).some((value) =>
    recordContainsIdentifiers(value, identifiers),
  );
}

function normalizePaymentEntry(payload: unknown): TSteadfastPaymentEntry {
  const record = asRecord(payload) || {};

  return {
    paymentId:
      toCleanString(record.payment_id) ||
      toCleanString(record.id) ||
      undefined,
    amount:
      toOptionalNumber(record.amount) ||
      toOptionalNumber(record.payable_amount) ||
      toOptionalNumber(record.total_amount) ||
      undefined,
    status:
      toCleanString(record.status) ||
      toCleanString(record.payment_status) ||
      undefined,
    createdAt:
      toCleanString(record.created_at) ||
      toCleanString(record.date) ||
      undefined,
    rawResponse: payload,
  };
}

function normalizeReturnRequest(payload: unknown): TSteadfastReturnRequest {
  const record = asRecord(payload) || {};

  return {
    id: toCleanString(record.id),
    consignmentId:
      toCleanString(record.consignment_id) ||
      toCleanString(record.consignmentId) ||
      undefined,
    trackingCode:
      toCleanString(record.tracking_code) ||
      toCleanString(record.trackingCode) ||
      undefined,
    invoice: toCleanString(record.invoice),
    status: toCleanString(record.status),
    reason: toCleanString(record.reason),
    createdAt: toCleanString(record.created_at),
    updatedAt: toCleanString(record.updated_at),
    rawResponse: payload,
  };
}

function dedupePayments(
  entries: TSteadfastPaymentEntry[],
): TSteadfastPaymentEntry[] {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = entry.paymentId || JSON.stringify(entry.rawResponse);

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getParcelPayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Invalid response from Steadfast.",
    );
  }

  const payload = data as Record<string, unknown>;
  if (payload.consignment && typeof payload.consignment === "object") {
    return payload.consignment as Record<string, unknown>;
  }

  return payload;
}

const createParcel = async (
  payload: TSteadfastCreateParcelPayload,
): Promise<TSteadfastParcel> => {
  const data = await requestSteadfast("/create_order", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const parcelData = getParcelPayload(data);
  const consignmentId = Number(parcelData.consignment_id);
  const trackingCode = String(parcelData.tracking_code || "").trim();
  const status = String(
    parcelData.status || parcelData.delivery_status || "pending",
  ).trim();
  const invoice = String(parcelData.invoice || payload.invoice).trim();

  if (!Number.isFinite(consignmentId) || !trackingCode) {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Steadfast response did not include consignment details.",
    );
  }

  return {
    consignmentId,
    trackingCode,
    invoice,
    status,
    rawResponse: data,
  };
};

const getParcelStatusByConsignmentId = async (
  consignmentId: number,
): Promise<TSteadfastStatus> => {
  const data = await requestSteadfast(`/status_by_cid/${consignmentId}`);

  const payload = getParcelPayload(data);
  const status = String(
    payload.delivery_status || payload.status || "unknown",
  ).trim();

  return {
    status,
    rawResponse: data,
  };
};

const getParcelStatusByInvoice = async (
  invoice: string,
): Promise<TSteadfastStatus> => {
  const data = await requestSteadfast(
    `/status_by_invoice/${encodeURIComponent(invoice)}`,
  );
  const payload = getParcelPayload(data);

  return {
    status: String(payload.delivery_status || payload.status || "unknown").trim(),
    rawResponse: data,
  };
};

const getParcelStatusByTrackingCode = async (
  trackingCode: string,
): Promise<TSteadfastStatus> => {
  const data = await requestSteadfast(
    `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`,
  );
  const payload = getParcelPayload(data);

  return {
    status: String(payload.delivery_status || payload.status || "unknown").trim(),
    rawResponse: data,
  };
};

const getPayments = async (): Promise<{
  payments: unknown[];
  rawResponse: unknown;
}> => {
  const data = await requestSteadfast("/payments");

  return {
    payments: extractArray(data, ["payments", "data"]),
    rawResponse: data,
  };
};

const getPaymentById = async (paymentId: string): Promise<unknown> => {
  return requestSteadfast(`/payments/${encodeURIComponent(paymentId)}`);
};

const getReturnRequests = async (): Promise<{
  items: unknown[];
  rawResponse: unknown[];
}> => {
  const firstPage = await requestSteadfast("/get_return_requests?page=1");
  const firstPageRecord = asRecord(firstPage);
  const firstPageMeta = asRecord(firstPageRecord?.meta);
  const lastPage = Math.min(toOptionalNumber(firstPageMeta?.last_page) || 1, 10);

  const rawResponse = [firstPage];
  const items = [...extractArray(firstPage, ["data"])];

  for (let page = 2; page <= lastPage; page += 1) {
    const pageResponse = await requestSteadfast(
      `/get_return_requests?page=${page}`,
    );
    rawResponse.push(pageResponse);
    items.push(...extractArray(pageResponse, ["data"]));
  }

  return { items, rawResponse };
};

const getTrackingSnapshot = async (params: {
  consignmentId: number;
  invoice?: string;
  trackingCode?: string;
}): Promise<TSteadfastTrackingSnapshot> => {
  const statusByConsignmentId = await getParcelStatusByConsignmentId(
    params.consignmentId,
  );

  const [statusByInvoice, statusByTrackingCode, paymentsResult, returnsResult] =
    await Promise.all([
      params.invoice
        ? getParcelStatusByInvoice(params.invoice).catch(() => undefined)
        : Promise.resolve(undefined),
      params.trackingCode
        ? getParcelStatusByTrackingCode(params.trackingCode).catch(() => undefined)
        : Promise.resolve(undefined),
      getPayments().catch(() => ({ payments: [], rawResponse: null })),
      getReturnRequests().catch(() => ({ items: [], rawResponse: [] })),
    ]);

  const identifiers = {
    consignmentId: String(params.consignmentId),
    trackingCode: params.trackingCode?.trim(),
    invoice: params.invoice?.trim(),
  };

  const directlyMatchedPayments = paymentsResult.payments.filter((payment) =>
    recordContainsIdentifiers(payment, identifiers),
  );

  const paymentIds = paymentsResult.payments
    .map((payment) => {
      const record = asRecord(payment);
      return toCleanString(record?.payment_id) || toCleanString(record?.id);
    })
    .filter((paymentId): paymentId is string => Boolean(paymentId))
    .slice(0, 25);

  const paymentDetails = await Promise.all(
    paymentIds.map((paymentId) => getPaymentById(paymentId).catch(() => undefined)),
  );

  const detailedMatchedPayments = paymentDetails.filter(
    (payment): payment is unknown =>
      payment !== undefined && recordContainsIdentifiers(payment, identifiers),
  );

  const paymentEntries = dedupePayments(
    [...directlyMatchedPayments, ...detailedMatchedPayments].map(
      normalizePaymentEntry,
    ),
  );

  const returnRequests = returnsResult.items
    .filter((item) => recordContainsIdentifiers(item, identifiers))
    .map(normalizeReturnRequest);

  return {
    syncedAt: new Date().toISOString(),
    statuses: {
      consignmentId: statusByConsignmentId,
      invoice: statusByInvoice,
      trackingCode: statusByTrackingCode,
    },
    paymentEntries,
    paymentEntriesCount: paymentEntries.length,
    returnRequests,
    returnRequestsCount: returnRequests.length,
    paymentsRaw: paymentsResult.rawResponse,
    returnsRaw: returnsResult.rawResponse,
  };
};

export const SteadfastService = {
  createParcel,
  getParcelStatusByConsignmentId,
  getParcelStatusByInvoice,
  getParcelStatusByTrackingCode,
  getTrackingSnapshot,
};