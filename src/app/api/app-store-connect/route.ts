import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { gunzipSync } from "zlib";
import { createSupabaseClient } from "@/utils/supabase/server";
import { AppStoreConnectCredentialsService } from "@/services/appStoreConnectCredentials.service";
import { AppStoreFinanceDataService } from "@/services/appStoreFinanceData.service";

interface FinanceReportRequest {
  copanyId: string;
  privateKey: string;
  keyId: string;
  issuerId: string;
  vendorNumber: string;
  appSKU: string;
}

// Get region codes based on report type
// FINANCIAL uses "ZZ" for aggregated summary data
// FINANCE_DETAIL uses "Z1" for all countries/regions detailed data
function getRegionCodesForReportType(reportType: string): string[] {
  if (reportType === "FINANCIAL") {
    // Use "ZZ" for FINANCIAL reports to get aggregated summary data
    return ["ZZ"];
  } else if (reportType === "FINANCE_DETAIL") {
    // Use "Z1" for FINANCE_DETAIL reports to get all countries/regions detailed data
    // "Z1" is the region code for all countries/regions in detailed reports
    return ["Z1"];
  }
  // Default: try "ZZ" for summary reports
  return ["ZZ"];
}

// Report types
const REPORT_TYPES = ["FINANCE_DETAIL"];

// Generate JWT token for App Store Connect API
function generateJWTToken(privateKey: string, keyId: string, issuerId: string): string {
  console.log("[DEBUG API] generateJWTToken called with:", {
    keyId,
    issuerId,
    privateKeyLength: privateKey.length,
    privateKeyStart: privateKey.substring(0, 50),
    privateKeyEnd: privateKey.substring(privateKey.length - 50),
  });

  // Ensure private key is in correct format (remove any extra whitespace)
  const cleanedKey = privateKey.trim();
  
  // Check if key already has headers/footers
  const hasHeaders = cleanedKey.includes("-----BEGIN");
  
  if (!hasHeaders) {
    console.log("[DEBUG API] Private key appears to be raw format, adding headers");
    // If key doesn't have headers, it might be just the base64 content
    // But for ES256, we need the full PEM format
    console.warn("[DEBUG API] Warning: Private key should include BEGIN/END markers");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: "appstoreconnect-v1",
  };

  console.log("[DEBUG API] JWT payload:", payload);

  try {
    const token = jwt.sign(
      payload,
      cleanedKey,
      {
        algorithm: "ES256",
        keyid: keyId, // Use keyid option instead of header
      }
    );
    
    // Decode token to verify structure
    const decoded = jwt.decode(token, { complete: true });
    console.log("[DEBUG API] JWT token generated successfully");
    console.log("[DEBUG API] Token header:", decoded?.header);
    console.log("[DEBUG API] Token payload:", decoded?.payload);
    console.log("[DEBUG API] Token length:", token.length);
    
    return token;
  } catch (error) {
    console.error("[DEBUG API] JWT signing error:", error);
    throw error;
  }
}

// Get report dates for the last 12 months
function getReportDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    dates.push(`${year}-${month}`);
  }
  return dates;
}

// Parse TSV data to structured format
// FINANCE_DETAIL reports may have metadata rows before the actual header row
// The actual header row contains "Transaction Date"
function parseTSV(tsvData: string): { headers: string[]; rows: string[][] } {
  const lines = tsvData.trim().split("\n");
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Find the header row (contains "Transaction Date")
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes("transaction date") && line.includes("settlement date")) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    // Fallback: use first line as header
    console.log("[DEBUG API] Warning: Could not find header row with 'Transaction Date', using first line");
    headerRowIndex = 0;
  }
  
  const headers = lines[headerRowIndex].split("\t");
  const dataStartIndex = headerRowIndex + 1;
  
  // Find where data ends (look for summary rows like "Country Of Sale")
  let dataEndIndex = lines.length;
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    // Summary rows typically start with "Country Of Sale" or are empty
    if (line.includes("country of sale") && line.includes("partner share currency")) {
      dataEndIndex = i;
      break;
    }
    // Also stop at empty lines that might separate summary sections
    if (line.trim() === "" && i > dataStartIndex) {
      // Check if next non-empty line looks like a summary row
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine === "") continue;
        if (nextLine.toLowerCase().includes("country of sale")) {
          dataEndIndex = i;
          break;
        }
        break; // Not a summary row, continue processing
      }
      if (dataEndIndex < lines.length) break;
    }
  }
  
  const rows = lines
    .slice(dataStartIndex, dataEndIndex)
    .filter((line) => line.trim() !== "") // Remove empty lines
    .map((line) => line.split("\t"));
  
  console.log(
    `[DEBUG API] Parsed TSV: header at line ${headerRowIndex}, data from ${dataStartIndex} to ${dataEndIndex}, ${rows.length} data rows`
  );
  
  return { headers, rows };
}

// Filter rows by App SKU(s)
// Supports multiple SKUs separated by commas (e.g., "app.bundle.id,iap.product1,iap.product2")
// This allows matching both the app itself and its in-app purchase products
function filterByAppSKU(
  parsed: { headers: string[]; rows: string[][] },
  appSKU: string
): { headers: string[]; rows: string[][] } {
  // Parse multiple SKUs from comma-separated string
  const skuList = appSKU
    .split(",")
    .map((sku) => sku.trim())
    .filter((sku) => sku.length > 0)
    .map((sku) => sku.toLowerCase());
  
  console.log(`[DEBUG API] filterByAppSKU called with appSKU: "${appSKU}"`);
  console.log(`[DEBUG API] Parsed SKU list (${skuList.length} SKUs):`, skuList);
  console.log(`[DEBUG API] Headers:`, parsed.headers);
  
  // Find the column index for App SKU
  // For App Store Connect finance reports, App SKU is typically in "Vendor Identifier" column
  // "Product Type Identifier" is the product type code (IAY, IA9, 1F, etc.), not the App SKU
  const skuColumnNames = [
    "Vendor Identifier", // This is usually the App Bundle ID or SKU
    "SKU",
    "App SKU",
    "Product Identifier",
    "Bundle ID",
  ];
  
  const skuColumnIndex = parsed.headers.findIndex((header) =>
    skuColumnNames.some((name) =>
      header.toLowerCase().includes(name.toLowerCase())
    )
  );
  
  console.log(`[DEBUG API] SKU column index: ${skuColumnIndex}`);
  if (skuColumnIndex !== -1) {
    console.log(`[DEBUG API] SKU column name: "${parsed.headers[skuColumnIndex]}"`);
  }
  
  // Also check Product Type Identifier to show what values are there
  const productTypeIndex = parsed.headers.findIndex((h) =>
    h.toLowerCase().includes("product type identifier")
  );
  if (productTypeIndex !== -1 && parsed.rows.length > 0) {
    console.log(`[DEBUG API] Product Type Identifier column index: ${productTypeIndex}`);
    console.log(`[DEBUG API] Sample Product Type Identifier values:`, 
      parsed.rows.slice(0, 5).map((row) => row[productTypeIndex]).filter(Boolean)
    );
  }
  
  // Show sample values from all potential columns
  if (parsed.rows.length > 0) {
    console.log(`[DEBUG API] Sample row values for debugging:`);
    parsed.headers.forEach((header, index) => {
      const sampleValues = parsed.rows
        .slice(0, 3)
        .map((row) => row[index])
        .filter((v) => v && v.trim() !== "")
        .slice(0, 3);
      if (sampleValues.length > 0) {
        console.log(`  ${header} (index ${index}):`, sampleValues);
      }
    });
  }
  
  if (skuColumnIndex === -1) {
    // If no SKU column found, return all data
    console.log(`[DEBUG API] No SKU column found, returning all ${parsed.rows.length} rows`);
    return parsed;
  }
  
  // Filter rows where the SKU column matches any of the provided SKUs
  const filteredRows = parsed.rows.filter((row) => {
    const rowSKU = row[skuColumnIndex]?.trim() || "";
    const rowSKULower = rowSKU.toLowerCase();
    
    // Check if this row matches any of the provided SKUs
    const matches = skuList.some((appSKUTrimmed) => {
      // Try multiple matching strategies for each SKU:
      // 1. Exact match (case-insensitive)
      // 2. Contains match (either direction)
      // 3. Domain-based match (e.g., "jinhonn.com.DeskDraw" matches "jinhonn.com.DeskDraw.xxx")
      const exactMatch = rowSKULower === appSKUTrimmed;
      const containsMatch = rowSKULower.includes(appSKUTrimmed) || appSKUTrimmed.includes(rowSKULower);
      
      // For domain-based matching: check if the appSKU is a prefix of the rowSKU
      // This handles cases like "jinhonn.com.DeskDraw" matching "jinhonn.com.DeskDraw.ProductName"
      const domainMatch = rowSKULower.startsWith(appSKUTrimmed + ".") || 
                          appSKUTrimmed.startsWith(rowSKULower + ".");
      
      return exactMatch || containsMatch || domainMatch;
    });
    
    if (parsed.rows.indexOf(row) < 5) {
      console.log(`[DEBUG API] Row ${parsed.rows.indexOf(row)} SKU: "${rowSKU}", matches: ${matches}`);
    }
    return matches;
  });
  
  console.log(`[DEBUG API] Filtered from ${parsed.rows.length} to ${filteredRows.length} rows`);
  
  if (filteredRows.length === 0 && parsed.rows.length > 0) {
    // Show what values are actually in the SKU column
    const uniqueSKUs = Array.from(
      new Set(parsed.rows.map((row) => row[skuColumnIndex]?.trim()).filter(Boolean))
    );
    console.log(`[DEBUG API] No matches found for SKU list: [${skuList.join(", ")}]. Available SKU values in column "${parsed.headers[skuColumnIndex]}":`, uniqueSKUs);
    
    // Check if any SKU contains part of any search term
    const partialMatches = uniqueSKUs.filter(sku => 
      skuList.some(searchSKU => 
        sku.toLowerCase().includes(searchSKU) || searchSKU.includes(sku.toLowerCase())
      )
    );
    if (partialMatches.length > 0) {
      console.log(`[DEBUG API] Found partial matches (might be related):`, partialMatches);
    }
    
    // Show all unique SKUs for debugging
    console.log(`[DEBUG API] All unique SKUs in this report (for debugging):`, uniqueSKUs);
  }
  
  return {
    headers: parsed.headers,
    rows: filteredRows,
  };
}

// Exchange rate cache to avoid repeated API calls for the same date
const exchangeRateCache = new Map<string, number>();

// Get historical exchange rate from API
// 
// IMPORTANT NOTES:
// 1. App Store Connect 财务报告中不包含汇率数据
//    - 报告中只有 "Partner Share Currency"（结算货币）和 "Customer Currency"（客户支付货币）
//    - Apple 在结算时已经将客户货币转换为结算货币，但报告中没有显示使用的汇率
//    - 大多数开发者的结算货币是 USD，所以 "Partner Share Currency" 通常是 USD
// 
// 2. 多 API 降级策略（按优先级顺序）：
//    - exchangerate.host: 完全免费，无限制，稳定可靠（优先使用）
//    - frankfurter.app: 免费，基于欧洲央行数据，非常稳定（备选）
//    - exchangerate-api.com: 免费版本每月 1500 次请求（最后备选）
//    - 如果所有 API 都失败，使用固定汇率作为降级方案
// 
// 3. 优化策略：
//    - 如果 "Partner Share Currency" 已经是 USD，不需要转换（直接返回 1.0）
//    - 使用缓存避免重复请求相同日期的汇率
//    - 多个 API 自动降级，确保高可用性
async function getHistoricalExchangeRateToUSD(
  currency: string,
  date: string // YYYY-MM-DD format
): Promise<number> {
  const upperCurrency = currency.toUpperCase();
  
  // If currency is USD, no conversion needed
  // Most developers use USD as their settlement currency in App Store Connect
  if (upperCurrency === "USD") {
    return 1.0;
  }
  
  // Check cache first to avoid repeated API calls
  const cacheKey = `${upperCurrency}-${date}`;
  if (exchangeRateCache.has(cacheKey)) {
    return exchangeRateCache.get(cacheKey)!;
  }
  
  // Try multiple free APIs in order of preference (fallback strategy)
  // 1. exchangerate.host - Completely free, no limits, reliable
  // 2. frankfurter.app - Free, based on ECB data, very stable
  // 3. exchangerate-api.com - Free tier: 1500/month (backup)
  
  const apis = [
    {
      name: "exchangerate.host",
      url: `https://api.exchangerate.host/${date}?base=USD`,
      parse: (data: any) => {
        // exchangerate.host returns { rates: { EUR: 0.92, ... } }
        return data.rates?.[upperCurrency];
      },
    },
    {
      name: "frankfurter.app",
      url: `https://api.frankfurter.app/${date}?from=${upperCurrency}&to=USD`,
      parse: (data: any) => {
        // frankfurter.app returns { rates: { USD: 1.08 } } when converting from EUR to USD
        // This gives us the rate to convert from target currency to USD
        return data.rates?.USD;
      },
    },
    {
      name: "exchangerate-api.com",
      url: `https://api.exchangerate-api.com/v4/historical/${date}`,
      parse: (data: any) => {
        // exchangerate-api.com returns { rates: { EUR: 0.92, ... } } relative to USD
        return data.rates?.[upperCurrency];
      },
    },
  ];
  
  for (const api of apis) {
    try {
      // Create timeout controller for fetch request (5 second timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(api.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(
          `[DEBUG API] ${api.name} failed for ${date} (status: ${response.status}), trying next API...`
        );
        continue; // Try next API
      }
      
      const data = await response.json();
      const rate = api.parse(data);
      
      if (rate === undefined || rate === null) {
        console.warn(
          `[DEBUG API] Currency ${upperCurrency} not found in ${api.name} for ${date}, trying next API...`
        );
        continue; // Try next API
      }
      
      // Success! Cache the rate and return it
      exchangeRateCache.set(cacheKey, rate);
      console.log(
        `[DEBUG API] Historical exchange rate for ${upperCurrency} on ${date} from ${api.name}: ${rate}`
      );
      
      return rate;
    } catch (error) {
      // Handle network errors, timeouts, etc.
      console.warn(
        `[DEBUG API] Error fetching from ${api.name} for ${upperCurrency} on ${date}:`,
        error instanceof Error ? error.message : error
      );
      // Continue to next API
      continue;
    }
  }
  
  // All APIs failed, use fallback rates
  console.warn(
    `[DEBUG API] All exchange rate APIs failed for ${upperCurrency} on ${date}, using fallback rates`
  );
  return getFallbackExchangeRateToUSD(upperCurrency);
}

// Fallback exchange rates (approximate, used when API is unavailable)
// These are approximate rates and should be replaced with actual historical rates
function getFallbackExchangeRateToUSD(currency: string): number {
  const rates: Record<string, number> = {
    USD: 1.0,
    CNY: 0.14, // Chinese Yuan (approximate)
    JPY: 0.0067, // Japanese Yen (approximate)
    GBP: 1.27, // British Pound (approximate)
    EUR: 1.08, // Euro (approximate)
    AUD: 0.66, // Australian Dollar (approximate)
    CAD: 0.73, // Canadian Dollar (approximate)
    KRW: 0.00075, // South Korean Won (approximate)
    INR: 0.012, // Indian Rupee (approximate)
    BRL: 0.19, // Brazilian Real (approximate)
    MXN: 0.059, // Mexican Peso (approximate)
    TWD: 0.031, // Taiwan Dollar (approximate)
    HKD: 0.128, // Hong Kong Dollar (approximate)
    SGD: 0.74, // Singapore Dollar (approximate)
    THB: 0.027, // Thai Baht (approximate)
    MYR: 0.21, // Malaysian Ringgit (approximate)
    PHP: 0.018, // Philippine Peso (approximate)
    IDR: 0.000064, // Indonesian Rupiah (approximate)
    VND: 0.000041, // Vietnamese Dong (approximate)
    NZD: 0.61, // New Zealand Dollar (approximate)
    ZAR: 0.054, // South African Rand (approximate)
    AED: 0.27, // UAE Dirham (approximate)
    SAR: 0.27, // Saudi Riyal (approximate)
    ILS: 0.27, // Israeli Shekel (approximate)
    CHF: 1.11, // Swiss Franc (approximate)
    SEK: 0.095, // Swedish Krona (approximate)
    NOK: 0.093, // Norwegian Krone (approximate)
    DKK: 0.14, // Danish Krone (approximate)
    PLN: 0.25, // Polish Zloty (approximate)
    TRY: 0.031, // Turkish Lira (approximate)
    RUB: 0.011, // Russian Ruble (approximate)
    CZK: 0.043, // Czech Koruna (approximate)
    HUF: 0.0028, // Hungarian Forint (approximate)
    RON: 0.22, // Romanian Leu (approximate)
    CLP: 0.0011, // Chilean Peso (approximate)
    ARS: 0.0012, // Argentine Peso (approximate)
    COP: 0.00025, // Colombian Peso (approximate)
    PEN: 0.27, // Peruvian Sol (approximate)
    VES: 0.000028, // Venezuelan Bolivar (approximate)
  };
  
  const rate = rates[currency];
  
  if (rate === undefined) {
    console.warn(
      `[DEBUG API] Unknown currency: ${currency}, using rate 1.0 (assuming USD)`
    );
    return 1.0;
  }
  
  return rate;
}

// Convert amount to USD using historical exchange rate
// date should be in YYYY-MM-DD format (from transaction date)
async function convertToUSD(
  amount: string,
  currency: string,
  date?: string // Optional: transaction date in YYYY-MM-DD format for historical rates
): Promise<number> {
  const numAmount = parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0;
  
  const upperCurrency = currency.toUpperCase();
  
  // If currency is USD, no conversion needed
  if (upperCurrency === "USD") {
    return numAmount;
  }
  
  // If date is provided, use historical exchange rate
  if (date) {
    const rate = await getHistoricalExchangeRateToUSD(upperCurrency, date);
    return numAmount * rate;
  }
  
  // Fallback to approximate rates if no date provided
  const rate = getFallbackExchangeRateToUSD(upperCurrency);
  return numAmount * rate;
}

// Parse MM/DD/YYYY format date string
function parseDateMMDDYYYY(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }
  
  // Match MM/DD/YYYY format
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const month = parseInt(match[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  // Validate the date is valid
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  return date;
}

// Convert MM/DD/YYYY format to YYYY-MM-DD format for API calls
function convertDateToYYYYMMDD(dateStr: string | undefined): string | undefined {
  if (!dateStr) {
    return undefined;
  }
  
  const date = parseDateMMDDYYYY(dateStr);
  if (!date) {
    return undefined;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

// Calculate transaction month from Transaction Date, return as YYYY-MM format
function calculateTransactionMonth(
  transactionDateStr: string | undefined,
  fallbackDate: string
): string {
  const transactionDate = transactionDateStr
    ? parseDateMMDDYYYY(transactionDateStr)
    : null;

  if (transactionDate) {
    const year = transactionDate.getFullYear();
    const month = String(transactionDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  // Fallback to reportDate if Transaction Date is missing or invalid
  if (!transactionDate) {
    console.log(
      `[DEBUG API] Missing or invalid Transaction Date: ${transactionDateStr}, using fallback: ${fallbackDate}`
    );
  }

  return fallbackDate;
}

// Extract financial data for chart
async function extractFinancialData(
  parsed: { headers: string[]; rows: string[][] },
  reportDate: string
): Promise<Array<{
  date: string; // YYYY-MM format for grouping
  transactionDate: string; // MM/DD/YYYY format for display
  amount: number;
  currency: string;
  amountUSD: number;
  type: string;
}>> {
  console.log(`[DEBUG API] extractFinancialData called for ${reportDate}`);
  const data: Array<{
    date: string; // YYYY-MM format for grouping
    transactionDate: string; // MM/DD/YYYY format for display
    amount: number;
    currency: string;
    amountUSD: number;
    type: string;
  }> = [];
  
  // Find Transaction Date column
  const transactionDateIndex = parsed.headers.findIndex((h) =>
    h.toLowerCase().includes("transaction date")
  );
  
  console.log(`[DEBUG API] Transaction Date column index: ${transactionDateIndex}`);
  
  if (transactionDateIndex !== -1) {
    console.log(
      `[DEBUG API] Found Transaction Date column: "${parsed.headers[transactionDateIndex]}"`
    );
    // Show sample date values for debugging
    if (parsed.rows.length > 0) {
      const sampleTransactionDate = parsed.rows[0][transactionDateIndex];
      console.log(
        `[DEBUG API] Sample Transaction Date: "${sampleTransactionDate}"`
      );
      if (sampleTransactionDate) {
        const sampleMonth = calculateTransactionMonth(
          sampleTransactionDate,
          reportDate
        );
        console.log(
          `[DEBUG API] Calculated transaction month from sample: ${sampleMonth}`
        );
      }
    }
  } else {
    console.log(
      `[DEBUG API] Warning: Transaction Date column not found, will use reportDate as fallback`
    );
  }
  
  // Find relevant column indices
  // Look for currency column (Partner Share Currency is the correct one for Extended Partner Share)
  // Prefer "Partner Share Currency" over "Customer Currency" to match with Extended Partner Share
  const currencyIndex = parsed.headers.findIndex((h) => {
    const lower = h.toLowerCase();
    return lower.includes("partner share currency");
  });
  
  // Fallback to any currency column if Partner Share Currency not found
  const fallbackCurrencyIndex =
    currencyIndex === -1
      ? parsed.headers.findIndex((h) => h.toLowerCase().includes("currency"))
      : -1;
  
  const finalCurrencyIndex = currencyIndex !== -1 ? currencyIndex : fallbackCurrencyIndex;
  
  // Look for amount columns (Extended Partner Share is the total revenue)
  const amountColumnNames = [
    "Extended Partner Share", // This is the total revenue per transaction
    "Partner Share",
    "Proceeds",
    "Revenue",
    "Sales",
    "Amount",
    "Total",
  ];
  
  const amountIndices = parsed.headers
    .map((h, i) => ({ name: h, index: i }))
    .filter(({ name }) => {
      const lower = name.toLowerCase();
      return amountColumnNames.some((colName) =>
        lower.includes(colName.toLowerCase())
      );
    });
  
  console.log(`[DEBUG API] Currency column index: ${finalCurrencyIndex} (Partner Share Currency: ${currencyIndex}, fallback: ${fallbackCurrencyIndex})`);
  console.log(`[DEBUG API] Amount column indices:`, amountIndices);
  
    if (finalCurrencyIndex === -1) {
      console.log(`[DEBUG API] No currency column found`);
      // Try to use a default currency
      const defaultCurrency = "USD";
      // Only use the first amount column to avoid duplicate counting
      if (amountIndices.length > 0) {
        const { name, index } = amountIndices[0];
        // Use for...of loop instead of forEach to support await
        for (const row of parsed.rows) {
          const amountStr = row[index] || "0";
          const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
          if (amount !== 0) {
            // Calculate transaction month from Transaction Date
            const transactionDateStr =
              transactionDateIndex !== -1
                ? row[transactionDateIndex]
                : undefined;
            const transactionMonth = calculateTransactionMonth(
              transactionDateStr,
              reportDate
            );
            // Keep original transaction date for display (MM/DD/YYYY format)
            const displayDate = transactionDateStr || reportDate;
            // Convert transaction date to YYYY-MM-DD format for historical exchange rate
            const transactionDateForAPI = convertDateToYYYYMMDD(transactionDateStr);
            const amountUSD = await convertToUSD(amountStr, defaultCurrency, transactionDateForAPI);
            console.log(
              `[DEBUG API] Row amount=${amountStr}, currency=${defaultCurrency}, amountUSD=${amountUSD}, transactionMonth=${transactionMonth}, transactionDate=${displayDate}`
            );
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
      console.log(`[DEBUG API] Extracted ${data.length} items without currency column`);
      return data;
    }
  
  if (amountIndices.length === 0) {
    console.log(`[DEBUG API] No amount columns found`);
    return data;
  }
  
  // Prefer "Extended Partner Share" as it's the total revenue
  const extendedPartnerShareIndex = parsed.headers.findIndex((h) =>
    h.toLowerCase().includes("extended partner share")
  );
  
  // Process rows sequentially to avoid too many concurrent API calls
  for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex++) {
    const row = parsed.rows[rowIndex];
    const currency = row[finalCurrencyIndex]?.trim() || "USD";
    
    // Calculate transaction month from Transaction Date for this row
    const transactionDateStr =
      transactionDateIndex !== -1 ? row[transactionDateIndex] : undefined;
    const transactionMonth = calculateTransactionMonth(
      transactionDateStr,
      reportDate
    );
    // Keep original transaction date for display (MM/DD/YYYY format)
    const displayDate = transactionDateStr || reportDate;
    // Convert transaction date to YYYY-MM-DD format for historical exchange rate
    const transactionDateForAPI = convertDateToYYYYMMDD(transactionDateStr);
    
    // Use Extended Partner Share if available, otherwise use first amount column only
    // This ensures each row is only counted once to avoid duplicate revenue
    if (extendedPartnerShareIndex !== -1) {
      const amountStr = row[extendedPartnerShareIndex] || "0";
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
      if (amount !== 0) {
        const amountUSD = await convertToUSD(amountStr, currency, transactionDateForAPI);
        console.log(
          `[DEBUG API] Row ${rowIndex}: amount=${amountStr}, currency=${currency}, amountUSD=${amountUSD}, transactionMonth=${transactionMonth}, transactionDate=${displayDate}`
        );
        data.push({
          date: transactionMonth,
          transactionDate: displayDate,
          amount,
          currency,
          amountUSD,
          type: "Extended Partner Share",
        });
      }
    } else if (amountIndices.length > 0) {
      // Only use the first amount column to avoid duplicate counting
      const { name, index } = amountIndices[0];
      const amountStr = row[index] || "0";
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
      if (amount !== 0) {
        const amountUSD = await convertToUSD(amountStr, currency, transactionDateForAPI);
        console.log(
          `[DEBUG API] Row ${rowIndex}: amount=${amountStr}, currency=${currency}, amountUSD=${amountUSD}, transactionMonth=${transactionMonth}, transactionDate=${displayDate}, type=${name}`
        );
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
  
  console.log(`[DEBUG API] Extracted ${data.length} financial data items`);
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
      "filter[vendorNumber]": vendorNumber,
      "filter[reportType]": reportType,
      "filter[regionCode]": regionCode,
      "filter[reportDate]": reportDate,
    });

    const url = `https://api.appstoreconnect.apple.com/v1/financeReports?${params.toString()}`;
    console.log(`[DEBUG API] Fetching: ${reportType}/${regionCode}/${reportDate}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/a-gzip",
      },
    });

    console.log(`[DEBUG API] Response status for ${reportType}/${regionCode}/${reportDate}: ${response.status}`);

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
      console.log(`[DEBUG API] Error for ${reportType}/${regionCode}/${reportDate}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const decompressed = gunzipSync(buffer);
    const data = decompressed.toString("utf-8");

    console.log(`[DEBUG API] Successfully fetched ${reportType}/${regionCode}/${reportDate}, data length: ${data.length}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[DEBUG API] Exception fetching ${reportType}/${regionCode}/${reportDate}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  console.log("[DEBUG API] POST request received");
  try {
    const body: FinanceReportRequest = await request.json();
    
    // Parse appSKU - support comma-separated multiple SKUs
    const appSKUList = body.appSKU
      ?.split(",")
      .map((sku) => sku.trim())
      .filter((sku) => sku.length > 0) || [];
    
    console.log("[DEBUG API] Request body received:", {
      copanyId: body.copanyId,
      hasPrivateKey: !!body.privateKey,
      keyId: body.keyId,
      issuerId: body.issuerId,
      vendorNumber: body.vendorNumber,
      appSKU: body.appSKU,
      appSKUList: appSKUList,
      appSKUCount: appSKUList.length,
      privateKeyLength: body.privateKey?.length || 0,
    });

    const { copanyId, privateKey, keyId, issuerId, vendorNumber } = body;

    // Validate input
    if (!copanyId || !privateKey || !keyId || !issuerId || !vendorNumber || !body.appSKU || appSKUList.length === 0) {
      console.error("[DEBUG API] Missing required fields:", {
        copanyId: !!copanyId,
        privateKey: !!privateKey,
        keyId: !!keyId,
        issuerId: !!issuerId,
        vendorNumber: !!vendorNumber,
        appSKU: !!body.appSKU,
        appSKUListLength: appSKUList.length,
      });
      return NextResponse.json(
        { error: "Missing required fields: copanyId, privateKey, keyId, issuerId, vendorNumber, appSKU (supports comma-separated multiple SKUs)" },
        { status: 400 }
      );
    }

    // Verify user authentication and copany ownership
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[DEBUG API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is copany owner
    const { data: copany, error: copanyError } = await supabase
      .from("copany")
      .select("created_by")
      .eq("id", copanyId)
      .single();

    if (copanyError || !copany) {
      console.error("[DEBUG API] Copany not found:", copanyError);
      return NextResponse.json(
        { error: "Copany not found" },
        { status: 404 }
      );
    }

    if (copany.created_by !== user.id) {
      console.error("[DEBUG API] User is not copany owner:", {
        userId: user.id,
        ownerId: copany.created_by,
      });
      return NextResponse.json(
        { error: "Only copany owner can save credentials" },
        { status: 403 }
      );
    }

    // Generate JWT token
    let token: string;
    try {
      console.log("[DEBUG API] Generating JWT token...");
      console.log("[DEBUG API] Private key preview:", {
        first50: privateKey.substring(0, 50),
        last50: privateKey.substring(Math.max(0, privateKey.length - 50)),
        hasBegin: privateKey.includes("-----BEGIN"),
        hasEnd: privateKey.includes("-----END"),
        lineCount: privateKey.split("\n").length,
      });
      token = generateJWTToken(privateKey, keyId, issuerId);
      console.log("[DEBUG API] JWT token generated successfully, length:", token.length);
      console.log("[DEBUG API] Token preview:", token.substring(0, 50) + "...");
    } catch (error) {
      console.error("[DEBUG API] Failed to generate JWT token:", error);
      if (error instanceof Error) {
        console.error("[DEBUG API] Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
      return NextResponse.json(
        { error: `Failed to generate JWT token: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 400 }
      );
    }

    // Get all report dates
    const reportDates = getReportDates();
    console.log("[DEBUG API] Report dates:", reportDates.length, "dates");
    const totalReports = REPORT_TYPES.reduce((sum, reportType) => {
      const regionCodes = getRegionCodesForReportType(reportType);
      return sum + regionCodes.length * reportDates.length;
    }, 0);
    console.log(
      `[DEBUG API] Will fetch ${totalReports} reports across ${REPORT_TYPES.length} report type(s)`
    );

    // Fetch all reports concurrently
    const reportPromises: Promise<{
      reportType: string;
      regionCode: string;
      reportDate: string;
      result: Awaited<ReturnType<typeof fetchFinanceReport>>;
    }>[] = [];

    for (const reportType of REPORT_TYPES) {
      const regionCodes = getRegionCodesForReportType(reportType);
      console.log(
        `[DEBUG API] Using ${regionCodes.length} region codes for ${reportType}:`,
        regionCodes.slice(0, 10),
        regionCodes.length > 10 ? `... (${regionCodes.length} total)` : ""
      );
      for (const regionCode of regionCodes) {
        for (const reportDate of reportDates) {
          reportPromises.push(
            fetchFinanceReport(token, vendorNumber, reportType, regionCode, reportDate).then(
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

    // Wait for all requests to complete
    console.log("[DEBUG API] Waiting for all requests to complete...");
    const results = await Promise.allSettled(reportPromises);
    console.log("[DEBUG API] All requests completed. Total results:", results.length);

    // Process results
    const reports: Array<{
      reportType: string;
      regionCode: string;
      reportDate: string;
      data: string;
      parsed?: { headers: string[]; rows: string[][] };
      filtered?: { headers: string[]; rows: string[][] };
      financialData?: Array<{
        date: string; // YYYY-MM format for grouping
        transactionDate: string; // MM/DD/YYYY format for display
        amount: number;
        currency: string;
        amountUSD: number;
        type: string;
      }>;
    }> = [];

    const errors: Array<{
      reportType: string;
      regionCode: string;
      reportDate: string;
      error: string;
    }> = [];

    // Aggregate financial data for chart
    const allFinancialData: Array<{
      date: string; // YYYY-MM format for grouping
      transactionDate: string; // MM/DD/YYYY format for display
      amount: number;
      currency: string;
      amountUSD: number;
      type: string;
    }> = [];

    let successCount = 0;
    let failedCount = 0;
    let filteredOutCount = 0;

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { reportType, regionCode, reportDate, result: fetchResult } = result.value;
        if (fetchResult.success) {
          console.log(`[DEBUG API] Successfully fetched: ${reportType}/${regionCode}/${reportDate}`);
          const parsed = parseTSV(fetchResult.data);
          console.log(`[DEBUG API] Parsed TSV: ${parsed.headers.length} headers, ${parsed.rows.length} rows`);
          
          // Filter by App SKU(s) - supports comma-separated multiple SKUs
          const filtered = filterByAppSKU(parsed, body.appSKU);
          console.log(`[DEBUG API] After filtering by App SKU(s) "${body.appSKU}": ${filtered.rows.length} rows`);
          
          // Extract financial data (now async due to historical exchange rate API calls)
          const financialData = await extractFinancialData(filtered, reportDate);
          console.log(`[DEBUG API] Extracted financial data: ${financialData.length} items`);
          
          if (filtered.rows.length > 0) {
            reports.push({
              reportType,
              regionCode,
              reportDate,
              data: fetchResult.data,
              parsed: parsed.headers.length > 0 ? parsed : undefined,
              filtered: filtered.headers.length > 0 ? filtered : undefined,
              financialData: financialData.length > 0 ? financialData : undefined,
            });
            successCount++;
            // Add to aggregate data
            allFinancialData.push(...financialData);
          } else {
            filteredOutCount++;
            console.log(`[DEBUG API] No rows after filtering for ${reportType}/${regionCode}/${reportDate}`);
          }
        } else {
          failedCount++;
          errors.push({
            reportType,
            regionCode,
            reportDate,
            error: fetchResult.error,
          });
        }
      } else {
        failedCount++;
        errors.push({
          reportType: "unknown",
          regionCode: "unknown",
          reportDate: "unknown",
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    // Collect all unique SKUs found across all reports for debugging
    const allUniqueSKUs = new Set<string>();
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { result: fetchResult } = result.value;
        if (fetchResult.success) {
          const parsed = parseTSV(fetchResult.data);
          const skuColumnIndex = parsed.headers.findIndex((h) =>
            h.toLowerCase().includes("vendor identifier")
          );
          if (skuColumnIndex !== -1) {
            parsed.rows.forEach((row) => {
              const sku = row[skuColumnIndex]?.trim();
              if (sku) allUniqueSKUs.add(sku);
            });
          }
        }
      }
    }

    console.log("[DEBUG API] Processing summary:", {
      total: results.length,
      success: successCount,
      failed: failedCount,
      filteredOut: filteredOutCount,
      reportsFound: reports.length,
      financialDataItems: allFinancialData.length,
      searchedAppSKU: body.appSKU,
      searchedAppSKUList: appSKUList,
      totalUniqueSKUsFound: allUniqueSKUs.size,
      allUniqueSKUs: Array.from(allUniqueSKUs).sort(),
    });
    
    if (allFinancialData.length === 0 && allUniqueSKUs.size > 0) {
      console.warn(`[DEBUG API] WARNING: No data found for appSKU(s) "${body.appSKU}".`);
      console.warn(`[DEBUG API] The app may not have financial data in the requested period, or the Bundle ID might be different.`);
      console.warn(`[DEBUG API] Available SKUs in reports:`, Array.from(allUniqueSKUs).sort());
    }

    // Aggregate financial data by date with detailed transactions
    const monthlyData: Record<
      string,
      {
        date: string;
        totalUSD: number;
        count: number;
        transactions: Array<{
          date: string; // YYYY-MM format for grouping
          transactionDate: string; // MM/DD/YYYY format for display
          amount: number;
          currency: string;
          amountUSD: number;
          type: string;
        }>;
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

    // Sort by date (YYYY-MM format)
    const chartData = Object.values(monthlyData)
      .map((item) => ({
        date: item.date,
        amountUSD: item.totalUSD,
        count: item.count,
        transactions: item.transactions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log("[DEBUG API] Final response:", {
      reportsCount: reports.length,
      errorsCount: errors.length,
      chartDataCount: chartData.length,
      summary: {
        total: results.length,
        success: reports.length,
        failed: errors.length,
      },
    });

    // Save credentials and finance data to database
    try {
      console.log("[DEBUG API] Saving credentials and finance data to database...");
      
      // Save credentials (this will delete old credentials first)
      await AppStoreConnectCredentialsService.saveCredentials(
        copanyId,
        user.id,
        {
          privateKey,
          keyId,
          issuerId,
          vendorNumber,
          appSKU: body.appSKU,
        }
      );
      console.log("[DEBUG API] Credentials saved successfully");

      // Prepare finance reports data for saving
      const financeReports = reports.map((report) => ({
        reportType: report.reportType,
        regionCode: report.regionCode,
        reportDate: report.reportDate,
        rawData: report.data,
        parsedData: report.parsed,
        filteredData: report.filtered,
      }));

      // Prepare chart data for saving
      const financeChartData = chartData.map((item) => ({
        date: item.date,
        amountUSD: item.amountUSD,
        count: item.count,
        transactions: item.transactions,
      }));

      // Save finance data (this will delete old data first)
      await AppStoreFinanceDataService.saveFinanceData(
        copanyId,
        financeReports,
        financeChartData
      );
      console.log("[DEBUG API] Finance data saved successfully");
    } catch (saveError) {
      console.error("[DEBUG API] Error saving data to database:", saveError);
      // Continue to return the response even if save fails
      // The user should still see the fetched data
    }

    return NextResponse.json({
      success: true,
      reports,
      errors,
      summary: {
        total: results.length,
        success: reports.length,
        failed: errors.length,
      },
      chartData,
    });
  } catch (error) {
    console.error("App Store Connect API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET method to check connection status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");

    if (!copanyId) {
      return NextResponse.json(
        { error: "Missing copanyId parameter" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[DEBUG API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if credentials exist for this copany
    const credentials = await AppStoreConnectCredentialsService.getCredentials(copanyId);
    const connected = credentials !== null;

    return NextResponse.json({ connected });
  } catch (error) {
    console.error("App Store Connect GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE method to disconnect App Store Connect
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");

    if (!copanyId) {
      return NextResponse.json(
        { error: "Missing copanyId parameter" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[DEBUG API] Authentication error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is copany owner
    const { data: copany, error: copanyError } = await supabase
      .from("copany")
      .select("created_by")
      .eq("id", copanyId)
      .single();

    if (copanyError || !copany) {
      console.error("[DEBUG API] Copany not found:", copanyError);
      return NextResponse.json(
        { error: "Copany not found" },
        { status: 404 }
      );
    }

    if (copany.created_by !== user.id) {
      console.error("[DEBUG API] User is not copany owner:", {
        userId: user.id,
        ownerId: copany.created_by,
      });
      return NextResponse.json(
        { error: "Only copany owner can disconnect" },
        { status: 403 }
      );
    }

    // Delete credentials
    await AppStoreConnectCredentialsService.deleteCredentials(copanyId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("App Store Connect DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

