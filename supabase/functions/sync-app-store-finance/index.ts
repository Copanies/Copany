// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Credentials {
  privateKey: string;
  keyId: string;
  issuerId: string;
  vendorNumber: string;
  appSKU: string;
}

interface EncryptedCredentialsRow {
  id: number;
  copany_id: number;
  iv: string;
  encrypted_private_key: string;
  encrypted_key_id: string;
  encrypted_issuer_id: string;
  encrypted_vendor_number: string;
  encrypted_app_sku: string;
  created_at: string;
  updated_at: string;
}

interface FinanceReportData {
  reportType: string;
  regionCode: string;
  reportDate: string;
  rawData?: string;
  parsedData?: {
    headers: string[];
    rows: string[][];
  };
  filteredData?: {
    headers: string[];
    rows: string[][];
  };
}

interface FinanceChartData {
  date: string; // YYYY-MM format
  amountUSD: number;
  count: number;
  transactions: Array<{
    date: string;
    transactionDate: string;
    amount: number;
    currency: string;
    amountUSD: number;
    type: string;
  }>;
}

// Get encryption key from environment variable
function getEncryptionKey(): Uint8Array {
  const keyHex = Deno.env.get('AES_KEY');
  if (!keyHex) {
    throw new Error('AES_KEY environment variable is not set');
  }
  
  if (keyHex.length !== 64) {
    throw new Error('AES_KEY must be 64 hex characters (32 bytes)');
  }
  
  // Convert hex string to Uint8Array
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(keyHex.substr(i * 2, 2), 16);
  }
  
  return key;
}

// Decrypt App Store Connect credentials using AES-256-GCM (Deno Web Crypto API)
async function decryptAppStoreCredentials(
  iv: string,
  encryptedData: string,
  authTag: string
): Promise<string> {
  try {
    const key = getEncryptionKey();
    
    // Convert hex strings to Uint8Array
    function hexToUint8Array(hex: string): Uint8Array {
      const matches = hex.match(/.{1,2}/g);
      if (!matches) {
        throw new Error('Invalid hex string');
      }
      return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
    }
    
    const ivBuffer = hexToUint8Array(iv);
    const tagBuffer = hexToUint8Array(authTag);
    const dataBuffer = hexToUint8Array(encryptedData);
    
    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Combine encrypted data and tag (tag is appended to the end)
    const combinedData = new Uint8Array(dataBuffer.length + tagBuffer.length);
    combinedData.set(dataBuffer);
    combinedData.set(tagBuffer, dataBuffer.length);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
        additionalData: new TextEncoder().encode('app-store-connect'),
        tagLength: 128, // 16 bytes = 128 bits
      },
      cryptoKey,
      combinedData
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt App Store Connect credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get and decrypt credentials for a copany
async function getCredentials(
  supabase: ReturnType<typeof createClient>,
  copanyId: number
): Promise<Credentials | null> {
  console.log(`[DEBUG] Getting credentials for copany ${copanyId}`);
  
  const { data, error } = await supabase
    .from('app_store_connect_credentials')
    .select('*')
    .eq('copany_id', copanyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`[DEBUG] No credentials found for copany ${copanyId}`);
      return null;
    }
    console.error(`[DEBUG] Error getting credentials for copany ${copanyId}:`, error);
    throw new Error(`Failed to get credentials: ${error.message}`);
  }

  if (!data) {
    console.log(`[DEBUG] No credentials data for copany ${copanyId}`);
    return null;
  }

  console.log(`[DEBUG] Found encrypted credentials for copany ${copanyId}, decrypting...`);
  const row = data as EncryptedCredentialsRow;

  // Parse and decrypt each field
  const privateKeyEncrypted = JSON.parse(row.encrypted_private_key);
  const keyIdEncrypted = JSON.parse(row.encrypted_key_id);
  const issuerIdEncrypted = JSON.parse(row.encrypted_issuer_id);
  const vendorNumberEncrypted = JSON.parse(row.encrypted_vendor_number);
  const appSKUEncrypted = JSON.parse(row.encrypted_app_sku);

  const credentials = {
    privateKey: await decryptAppStoreCredentials(
      privateKeyEncrypted.iv,
      privateKeyEncrypted.data,
      privateKeyEncrypted.tag
    ),
    keyId: await decryptAppStoreCredentials(
      keyIdEncrypted.iv,
      keyIdEncrypted.data,
      keyIdEncrypted.tag
    ),
    issuerId: await decryptAppStoreCredentials(
      issuerIdEncrypted.iv,
      issuerIdEncrypted.data,
      issuerIdEncrypted.tag
    ),
    vendorNumber: await decryptAppStoreCredentials(
      vendorNumberEncrypted.iv,
      vendorNumberEncrypted.data,
      vendorNumberEncrypted.tag
    ),
    appSKU: await decryptAppStoreCredentials(
      appSKUEncrypted.iv,
      appSKUEncrypted.data,
      appSKUEncrypted.tag
    ),
  };

  console.log(`[DEBUG] Successfully decrypted credentials for copany ${copanyId}`, {
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    vendorNumber: credentials.vendorNumber,
    appSKU: credentials.appSKU,
    privateKeyLength: credentials.privateKey.length,
  });

  return credentials;
}

// Generate JWT token for App Store Connect API
async function generateJWTToken(
  privateKey: string,
  keyId: string,
  issuerId: string
): Promise<string> {
  console.log(`[DEBUG] Generating JWT token for keyId: ${keyId}, issuerId: ${issuerId}`);
  const cleanedKey = privateKey.trim();
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1',
  };
  
  console.log(`[DEBUG] JWT payload:`, payload);

  // Import private key for ES256
  // Remove PEM headers and whitespace
  const keyData = cleanedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Decode base64 to binary
  const binaryString = atob(keyData);
  const keyBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    keyBuffer[i] = binaryString.charCodeAt(i);
  }
  
  // Import key using Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  // Create JWT header
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  };

  // Base64URL encode
  function base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // Sign with ECDSA
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    cryptoKey,
    new TextEncoder().encode(message)
  );
  
  // Convert signature to base64url
  // ECDSA signatures are DER-encoded, need to convert to raw format
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = base64UrlEncode(
    String.fromCharCode(...signatureArray)
  );
  
  const token = `${message}.${signatureBase64}`;
  console.log(`[DEBUG] JWT token generated successfully, length: ${token.length}`);
  
  return token;
}

// Get report dates - if latestDate is provided, get dates after it, otherwise get last 12 months
function getReportDates(latestDate?: string): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  if (latestDate) {
    console.log(`[DEBUG] Getting report dates after latest date: ${latestDate}`);
    // Parse latest date (YYYY-MM format)
    const [year, month] = latestDate.split('-').map(Number);
    // Use UTC to ensure consistent behavior across timezones
    const latest = new Date(Date.UTC(year, month - 1, 1)); // month is 0-indexed
    
    // Get all months from latest date to current month
    let current = new Date(latest);
    current.setUTCMonth(current.getUTCMonth() + 1); // Start from next month after latest
    
    while (current <= now) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      dates.push(`${year}-${month}`);
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  } else {
    console.log(`[DEBUG] No latest date found, getting last 12 months`);
    // Get last 12 months using UTC
    for (let i = 0; i < 12; i++) {
      const date = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - i,
        1
      ));
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      dates.push(`${year}-${month}`);
    }
  }
  
  console.log(`[DEBUG] Generated ${dates.length} report dates:`, dates);
  return dates;
}

// Get region codes for report type
function getRegionCodesForReportType(reportType: string): string[] {
  if (reportType === 'FINANCIAL') {
    return ['ZZ'];
  } else if (reportType === 'FINANCE_DETAIL') {
    return ['Z1'];
  }
  return ['ZZ'];
}

const REPORT_TYPES = ['FINANCE_DETAIL'];

// Parse TSV data
function parseTSV(tsvData: string): { headers: string[]; rows: string[][] } {
  const lines = tsvData.trim().split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('transaction date') && line.includes('settlement date')) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }
  
  const headers = lines[headerRowIndex].split('\t');
  const dataStartIndex = headerRowIndex + 1;
  
  let dataEndIndex = lines.length;
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('country of sale') && line.includes('partner share currency')) {
      dataEndIndex = i;
      break;
    }
    if (line.trim() === '' && i > dataStartIndex) {
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine === '') continue;
        if (nextLine.toLowerCase().includes('country of sale')) {
          dataEndIndex = i;
          break;
        }
        break;
      }
      if (dataEndIndex < lines.length) break;
    }
  }
  
  const rows = lines
    .slice(dataStartIndex, dataEndIndex)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t'));
  
  return { headers, rows };
}

// Filter rows by App SKU
function filterByAppSKU(
  parsed: { headers: string[]; rows: string[][] },
  appSKU: string
): { headers: string[]; rows: string[][] } {
  const skuList = appSKU
    .split(',')
    .map((sku) => sku.trim())
    .filter((sku) => sku.length > 0)
    .map((sku) => sku.toLowerCase());
  
  const skuColumnNames = [
    'Vendor Identifier',
    'SKU',
    'App SKU',
    'Product Identifier',
    'Bundle ID',
  ];
  
  const skuColumnIndex = parsed.headers.findIndex((header) =>
    skuColumnNames.some((name) =>
      header.toLowerCase().includes(name.toLowerCase())
    )
  );
  
  if (skuColumnIndex === -1) {
    return parsed;
  }
  
  const filteredRows = parsed.rows.filter((row) => {
    const rowSKU = row[skuColumnIndex]?.trim() || '';
    const rowSKULower = rowSKU.toLowerCase();
    
    return skuList.some((appSKUTrimmed) => {
      const exactMatch = rowSKULower === appSKUTrimmed;
      const containsMatch = rowSKULower.includes(appSKUTrimmed) || appSKUTrimmed.includes(rowSKULower);
      const domainMatch = rowSKULower.startsWith(appSKUTrimmed + '.') || 
                          appSKUTrimmed.startsWith(rowSKULower + '.');
      
      return exactMatch || containsMatch || domainMatch;
    });
  });
  
  return {
    headers: parsed.headers,
    rows: filteredRows,
  };
}

// Get historical exchange rate to USD
const exchangeRateCache = new Map<string, number>();

async function getHistoricalExchangeRateToUSD(
  currency: string,
  date: string
): Promise<number> {
  const upperCurrency = currency.toUpperCase();
  
  if (upperCurrency === 'USD') {
    return 1.0;
  }
  
  const cacheKey = `${upperCurrency}-${date}`;
  if (exchangeRateCache.has(cacheKey)) {
    return exchangeRateCache.get(cacheKey)!;
  }
  
  const apis = [
    {
      name: 'exchangerate.host',
      url: `https://api.exchangerate.host/${date}?base=USD`,
      parse: (data: any) => {
        // exchangerate.host returns { rates: { EUR: 0.92, ... } } meaning 1 USD = 0.92 EUR
        // To convert EUR to USD, we need the inverse: 1 / 0.92 = 1.087
        const usdToCurrencyRate = data.rates?.[upperCurrency];
        return usdToCurrencyRate ? 1 / usdToCurrencyRate : undefined;
      },
    },
    {
      name: 'frankfurter.app',
      url: `https://api.frankfurter.app/${date}?from=${upperCurrency}&to=USD`,
      parse: (data: any) => {
        // frankfurter.app returns { rates: { USD: 1.08 } } when converting from EUR to USD
        // This gives us the rate to convert from target currency to USD (already correct)
        return data.rates?.USD;
      },
    },
  ];
  
  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(api.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        continue;
      }
      
      const data = await response.json();
      const rate = api.parse(data);
      
      if (rate === undefined || rate === null) {
        continue;
      }
      
      exchangeRateCache.set(cacheKey, rate);
      return rate;
    } catch (error) {
      continue;
    }
  }
  
  // Fallback rate
  return 1.0;
}

// Convert amount to USD
async function convertToUSD(
  amount: string,
  currency: string,
  date?: string
): Promise<number> {
  const numAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0;
  const upperCurrency = currency.toUpperCase();
  
  if (upperCurrency === 'USD') {
    return numAmount;
  }
  
  if (date) {
    const rate = await getHistoricalExchangeRateToUSD(upperCurrency, date);
    return numAmount * rate;
  }
  
  return numAmount;
}

// Parse MM/DD/YYYY format date
function parseDateMMDDYYYY(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }
  
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Use UTC to ensure consistent behavior across timezones
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  
  return date;
}

// Convert MM/DD/YYYY to YYYY-MM-DD
// Use UTC methods to ensure consistent behavior across timezones
function convertDateToYYYYMMDD(dateStr: string | undefined): string | undefined {
  if (!dateStr) {
    return undefined;
  }
  
  const date = parseDateMMDDYYYY(dateStr);
  if (!date) {
    return undefined;
  }
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Calculate transaction month
// Use UTC methods to ensure consistent behavior across timezones
function calculateTransactionMonth(
  transactionDateStr: string | undefined,
  fallbackDate: string
): string {
  const transactionDate = transactionDateStr
    ? parseDateMMDDYYYY(transactionDateStr)
    : null;

  if (transactionDate) {
    const year = transactionDate.getUTCFullYear();
    const month = String(transactionDate.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return fallbackDate;
}

// Extract financial data
async function extractFinancialData(
  parsed: { headers: string[]; rows: string[][] },
  reportDate: string
): Promise<FinanceChartData['transactions']> {
  const data: FinanceChartData['transactions'] = [];
  
  const transactionDateIndex = parsed.headers.findIndex((h) =>
    h.toLowerCase().includes('transaction date')
  );
  
  const currencyIndex = parsed.headers.findIndex((h) => {
    const lower = h.toLowerCase();
    return lower.includes('partner share currency');
  });
  
  const fallbackCurrencyIndex =
    currencyIndex === -1
      ? parsed.headers.findIndex((h) => h.toLowerCase().includes('currency'))
      : -1;
  
  const finalCurrencyIndex = currencyIndex !== -1 ? currencyIndex : fallbackCurrencyIndex;
  
  const amountColumnNames = [
    'Extended Partner Share',
    'Partner Share',
    'Proceeds',
    'Revenue',
    'Sales',
    'Amount',
    'Total',
  ];
  
  const amountIndices = parsed.headers
    .map((h, i) => ({ name: h, index: i }))
    .filter(({ name }) => {
      const lower = name.toLowerCase();
      return amountColumnNames.some((colName) =>
        lower.includes(colName.toLowerCase())
      );
    });
  
  if (finalCurrencyIndex === -1) {
    const defaultCurrency = 'USD';
    if (amountIndices.length > 0) {
      const { name, index } = amountIndices[0];
      for (const row of parsed.rows) {
        const amountStr = row[index] || '0';
        const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
        if (amount !== 0) {
          const transactionDateStr =
            transactionDateIndex !== -1 ? row[transactionDateIndex] : undefined;
          const transactionMonth = calculateTransactionMonth(
            transactionDateStr,
            reportDate
          );
          const displayDate = transactionDateStr || reportDate;
          const transactionDateForAPI = convertDateToYYYYMMDD(transactionDateStr);
          const amountUSD = await convertToUSD(amountStr, defaultCurrency, transactionDateForAPI);
          
          data.push({
            date: transactionMonth,
            transactionDate: displayDate,
            amount,
            currency: defaultCurrency,
            amountUSD,
            type: name,
          });
        }
      }
    }
    return data;
  }
  
  if (amountIndices.length === 0) {
    return data;
  }
  
  const extendedPartnerShareIndex = parsed.headers.findIndex((h) =>
    h.toLowerCase().includes('extended partner share')
  );
  
  for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex++) {
    const row = parsed.rows[rowIndex];
    const currency = row[finalCurrencyIndex]?.trim() || 'USD';
    
    const transactionDateStr =
      transactionDateIndex !== -1 ? row[transactionDateIndex] : undefined;
    const transactionMonth = calculateTransactionMonth(
      transactionDateStr,
      reportDate
    );
    const displayDate = transactionDateStr || reportDate;
    const transactionDateForAPI = convertDateToYYYYMMDD(transactionDateStr);
    
    if (extendedPartnerShareIndex !== -1) {
      const amountStr = row[extendedPartnerShareIndex] || '0';
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
      if (amount !== 0) {
        const amountUSD = await convertToUSD(amountStr, currency, transactionDateForAPI);
        data.push({
          date: transactionMonth,
          transactionDate: displayDate,
          amount,
          currency,
          amountUSD,
          type: 'Extended Partner Share',
        });
      }
    } else if (amountIndices.length > 0) {
      const { name, index } = amountIndices[0];
      const amountStr = row[index] || '0';
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
      if (amount !== 0) {
        const amountUSD = await convertToUSD(amountStr, currency, transactionDateForAPI);
        data.push({
          date: transactionMonth,
          transactionDate: displayDate,
          amount,
          currency,
          amountUSD,
          type: name,
        });
      }
    }
  }
  
  return data;
}

// Fetch finance report from App Store Connect API
async function fetchFinanceReport(
  token: string,
  vendorNumber: string,
  reportType: string,
  regionCode: string,
  reportDate: string
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    const params = new URLSearchParams({
      'filter[vendorNumber]': vendorNumber,
      'filter[reportType]': reportType,
      'filter[regionCode]': regionCode,
      'filter[reportDate]': reportDate,
    });

    const url = `https://api.appstoreconnect.apple.com/v1/financeReports?${params.toString()}`;
    console.log(`[DEBUG] Fetching report: ${reportType}/${regionCode}/${reportDate}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/a-gzip',
      },
    });

    console.log(`[DEBUG] Response status for ${reportType}/${regionCode}/${reportDate}: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors[0].detail || errorMessage;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.log(`[DEBUG] Error fetching ${reportType}/${regionCode}/${reportDate}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[DEBUG] Received compressed data, size: ${arrayBuffer.byteLength} bytes`);
    
    // Decompress gzip data using Deno's built-in decompression
    const decompressed = await new Response(
      new Blob([arrayBuffer]).stream().pipeThrough(
        new DecompressionStream('gzip')
      )
    ).arrayBuffer();
    const data = new TextDecoder().decode(decompressed);

    console.log(`[DEBUG] Successfully decompressed data, size: ${data.length} characters`);
    return { success: true, data };
  } catch (error) {
    console.error(`[DEBUG] Exception fetching ${reportType}/${regionCode}/${reportDate}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get latest date from existing chart data
async function getLatestChartDataDate(
  supabase: ReturnType<typeof createClient>,
  copanyId: number
): Promise<string | null> {
  console.log(`[DEBUG] Getting latest chart data date for copany ${copanyId}`);
  
  const { data, error } = await supabase
    .from('app_store_finance_chart_data')
    .select('date')
    .eq('copany_id', copanyId)
    .order('date', { ascending: false })
    .limit(1);

  if (error) {
    console.log(`[DEBUG] Error querying latest date for copany ${copanyId}:`, error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`[DEBUG] No existing chart data found for copany ${copanyId}`);
    return null;
  }

  const latestDate = data[0].date;
  console.log(`[DEBUG] Latest chart data date for copany ${copanyId}: ${latestDate}`);
  return latestDate;
}

// Check if report data already exists
async function reportDataExists(
  supabase: ReturnType<typeof createClient>,
  copanyId: number,
  reportType: string,
  regionCode: string,
  reportDate: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_store_finance_data')
    .select('id')
    .eq('copany_id', copanyId)
    .eq('report_type', reportType)
    .eq('region_code', regionCode)
    .eq('report_date', reportDate)
    .limit(1);

  if (error) {
    return false;
  }

  return data && data.length > 0;
}

// Sync finance data for a single copany
async function syncCopanyFinanceData(
  supabase: ReturnType<typeof createClient>,
  copanyId: number
): Promise<{
  success: boolean;
  newReports: number;
  newChartData: number;
  error?: string;
}> {
  console.log(`[DEBUG] Starting sync for copany ${copanyId}`);
  
  try {
    // Get credentials
    const credentials = await getCredentials(supabase, copanyId);
    if (!credentials) {
      console.log(`[DEBUG] No credentials found for copany ${copanyId}, skipping`);
      return {
        success: false,
        newReports: 0,
        newChartData: 0,
        error: 'No credentials found',
      };
    }

    // Get latest date
    const latestDate = await getLatestChartDataDate(supabase, copanyId);
    const reportDates = getReportDates(latestDate || undefined);

    if (reportDates.length === 0) {
      console.log(`[DEBUG] No new report dates to fetch for copany ${copanyId}`);
      return {
        success: true,
        newReports: 0,
        newChartData: 0,
      };
    }

    console.log(`[DEBUG] Will fetch ${reportDates.length} report date(s) for copany ${copanyId}`);

    // Generate JWT token
    const token = await generateJWTToken(
      credentials.privateKey,
      credentials.keyId,
      credentials.issuerId
    );

    // Fetch all reports
    const reportPromises: Promise<{
      reportType: string;
      regionCode: string;
      reportDate: string;
      result: Awaited<ReturnType<typeof fetchFinanceReport>>;
    }>[] = [];

    for (const reportType of REPORT_TYPES) {
      const regionCodes = getRegionCodesForReportType(reportType);
      for (const regionCode of regionCodes) {
        for (const reportDate of reportDates) {
          reportPromises.push(
            fetchFinanceReport(token, credentials.vendorNumber, reportType, regionCode, reportDate).then(
              (result) => ({
                reportType,
                regionCode,
                reportDate,
                result,
              })
            )
          );
        }
      }
    }

    console.log(`[DEBUG] Fetching ${reportPromises.length} reports for copany ${copanyId}`);
    const results = await Promise.allSettled(reportPromises);
    console.log(`[DEBUG] All reports fetched for copany ${copanyId}, processing results...`);

    // Process results
    const newReports: FinanceReportData[] = [];
    const allFinancialData: FinanceChartData['transactions'] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { reportType, regionCode, reportDate, result: fetchResult } = result.value;
        if (fetchResult.success) {
          // Check if report already exists
          const exists = await reportDataExists(
            supabase,
            copanyId,
            reportType,
            regionCode,
            reportDate
          );

          if (exists) {
            console.log(`[DEBUG] Report ${reportType}/${regionCode}/${reportDate} already exists for copany ${copanyId}, skipping`);
            skippedCount++;
            continue;
          }

          console.log(`[DEBUG] Processing new report ${reportType}/${regionCode}/${reportDate} for copany ${copanyId}`);
          const parsed = parseTSV(fetchResult.data);
          console.log(`[DEBUG] Parsed TSV: ${parsed.headers.length} headers, ${parsed.rows.length} rows`);
          
          const filtered = filterByAppSKU(parsed, credentials.appSKU);
          console.log(`[DEBUG] After filtering by App SKU "${credentials.appSKU}": ${filtered.rows.length} rows`);

          if (filtered.rows.length > 0) {
            const financialData = await extractFinancialData(filtered, reportDate);
            console.log(`[DEBUG] Extracted ${financialData.length} financial data items`);
            allFinancialData.push(...financialData);

            newReports.push({
              reportType,
              regionCode,
              reportDate,
              rawData: fetchResult.data,
              parsedData: parsed.headers.length > 0 ? parsed : undefined,
              filteredData: filtered.headers.length > 0 ? filtered : undefined,
            });
            successCount++;
          } else {
            console.log(`[DEBUG] No rows after filtering for ${reportType}/${regionCode}/${reportDate}`);
          }
        } else {
          failedCount++;
          console.log(`[DEBUG] Failed to fetch ${reportType}/${regionCode}/${reportDate}: ${fetchResult.error}`);
        }
      } else {
        failedCount++;
        console.error(`[DEBUG] Promise rejected for copany ${copanyId}:`, result.reason);
      }
    }

    console.log(`[DEBUG] Processed reports for copany ${copanyId}: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped, ${newReports.length} new reports`);

    // Save new report data
    let savedReports = 0;
    if (newReports.length > 0) {
      console.log(`[DEBUG] Saving ${newReports.length} new report(s) for copany ${copanyId}`);
      const reportRows = newReports.map((report) => ({
        copany_id: copanyId,
        report_type: report.reportType,
        region_code: report.regionCode,
        report_date: report.reportDate,
        raw_data: report.rawData || null,
        parsed_data: report.parsedData || null,
        filtered_data: report.filteredData || null,
      }));

      const { error: insertError } = await supabase
        .from('app_store_finance_data')
        .insert(reportRows);

      if (insertError) {
        console.error(`[DEBUG] Error inserting report data for copany ${copanyId}:`, insertError);
      } else {
        savedReports = newReports.length;
        console.log(`[DEBUG] Successfully saved ${savedReports} report(s) for copany ${copanyId}`);
      }
    }

    // Aggregate financial data by date
    console.log(`[DEBUG] Aggregating ${allFinancialData.length} financial data items by date for copany ${copanyId}`);
    const monthlyData: Record<
      string,
      {
        date: string;
        totalUSD: number;
        count: number;
        transactions: FinanceChartData['transactions'];
      }
    > = {};

    allFinancialData.forEach((item) => {
      if (!monthlyData[item.date]) {
        monthlyData[item.date] = {
          date: item.date,
          totalUSD: 0,
          count: 0,
          transactions: [],
        };
      }
      monthlyData[item.date].totalUSD += item.amountUSD;
      monthlyData[item.date].count += 1;
      monthlyData[item.date].transactions.push(item);
    });

    console.log(`[DEBUG] Aggregated into ${Object.keys(monthlyData).length} month(s) for copany ${copanyId}`);

    // Save chart data (upsert)
    const chartRows = Object.values(monthlyData).map((item) => ({
      copany_id: copanyId,
      date: item.date,
      amount_usd: item.totalUSD,
      transaction_count: item.count,
      transactions: item.transactions,
    }));

    let savedChartData = 0;
    if (chartRows.length > 0) {
      console.log(`[DEBUG] Upserting ${chartRows.length} chart data row(s) for copany ${copanyId}`);
      const { error: upsertError } = await supabase
        .from('app_store_finance_chart_data')
        .upsert(chartRows, {
          onConflict: 'copany_id,date',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(`[DEBUG] Error upserting chart data for copany ${copanyId}:`, upsertError);
      } else {
        savedChartData = chartRows.length;
        console.log(`[DEBUG] Successfully upserted ${savedChartData} chart data row(s) for copany ${copanyId}`);
      }
    }

    console.log(`[DEBUG] Completed sync for copany ${copanyId}: ${savedReports} new reports, ${savedChartData} chart data rows`);
    return {
      success: true,
      newReports: savedReports,
      newChartData: savedChartData,
    };
  } catch (error) {
    console.error(`[DEBUG] Error syncing finance data for copany ${copanyId}:`, error);
    return {
      success: false,
      newReports: 0,
      newChartData: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all copanies with credentials
    const { data: credentialsList, error: fetchError } = await supabase
      .from('app_store_connect_credentials')
      .select('copany_id');

    if (fetchError) {
      throw new Error(`Failed to fetch credentials: ${fetchError.message}`);
    }

    if (!credentialsList || credentialsList.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No copanies with App Store Connect credentials found',
          processed: 0,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[DEBUG] Found ${credentialsList.length} copanies with credentials`);

    // Process each copany
    const results: Array<{
      copanyId: number;
      success: boolean;
      newReports: number;
      newChartData: number;
      error?: string;
    }> = [];

    for (let i = 0; i < credentialsList.length; i++) {
      const cred = credentialsList[i];
      console.log(`[DEBUG] Processing copany ${cred.copany_id} (${i + 1}/${credentialsList.length})`);
      const result = await syncCopanyFinanceData(supabase, cred.copany_id);
      results.push({
        copanyId: cred.copany_id,
        ...result,
      });
      console.log(`[DEBUG] Completed copany ${cred.copany_id}: success=${result.success}, newReports=${result.newReports}, newChartData=${result.newChartData}`);
    }

    const successful = results.filter((r) => r.success).length;
    const totalNewReports = results.reduce((sum, r) => sum + r.newReports, 0);
    const totalNewChartData = results.reduce((sum, r) => sum + r.newChartData, 0);
    const errors = results.filter((r) => !r.success);

    console.log(`[DEBUG] Final summary: Processed ${results.length} copanies: ${successful} successful, ${errors.length} failed`);
    console.log(`[DEBUG] Total new reports: ${totalNewReports}, Total new chart data: ${totalNewChartData}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Finance data sync completed',
        processed: results.length,
        successful,
        failed: errors.length,
        totalNewReports,
        totalNewChartData,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in sync app store finance:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

