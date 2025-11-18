// Exchange rate cache to avoid repeated API calls for the same date
const exchangeRateCache = new Map<string, number>();

// Get historical exchange rate from API
// 
// IMPORTANT NOTES:
// 1. Multiple API fallback strategy (in order of preference):
//    - exchangerate.host: Completely free, no limits, reliable (preferred)
//    - frankfurter.app: Free, based on ECB data, very stable (fallback)
//    - exchangerate-api.com: Free tier: 1500/month (backup)
//    - If all APIs fail, use fixed rates as fallback
// 
// 2. Optimization strategies:
//    - If currency is USD, no conversion needed (return 1.0 directly)
//    - Use cache to avoid repeated requests for the same date
//    - Multiple APIs automatically fallback to ensure high availability
export async function getHistoricalExchangeRateToUSD(
  currency: string,
  date: string // YYYY-MM-DD format
): Promise<number> {
  const upperCurrency = currency.toUpperCase();
  
  // If currency is USD, no conversion needed
  if (upperCurrency === "USD") {
    return 1.0;
  }
  
  // Check cache first to avoid repeated API calls
  const cacheKey = `${upperCurrency}-${date}`;
  if (exchangeRateCache.has(cacheKey)) {
    return exchangeRateCache.get(cacheKey)!;
  }
  
  // Try multiple free APIs in order of preference (fallback strategy)
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
          `[Currency] ${api.name} failed for ${date} (status: ${response.status}), trying next API...`
        );
        continue; // Try next API
      }
      
      const data = await response.json();
      const rate = api.parse(data);
      
      if (rate === undefined || rate === null) {
        console.warn(
          `[Currency] Currency ${upperCurrency} not found in ${api.name} for ${date}, trying next API...`
        );
        continue; // Try next API
      }
      
      // Success! Cache the rate and return it
      exchangeRateCache.set(cacheKey, rate);
      console.log(
        `[Currency] Historical exchange rate for ${upperCurrency} on ${date} from ${api.name}: ${rate}`
      );
      
      return rate;
    } catch (error) {
      // Handle network errors, timeouts, etc.
      console.warn(
        `[Currency] Error fetching from ${api.name} for ${upperCurrency} on ${date}:`,
        error instanceof Error ? error.message : error
      );
      // Continue to next API
      continue;
    }
  }
  
  // All APIs failed, use fallback rates
  console.warn(
    `[Currency] All exchange rate APIs failed for ${upperCurrency} on ${date}, using fallback rates`
  );
  return getFallbackExchangeRateToUSD(upperCurrency);
}

// Fallback exchange rates (approximate, used when API is unavailable)
// These are approximate rates and should be replaced with actual historical rates
export function getFallbackExchangeRateToUSD(currency: string): number {
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
      `[Currency] Unknown currency: ${currency}, using rate 1.0 (assuming USD)`
    );
    return 1.0;
  }
  
  return rate;
}

// Convert amount to USD using historical exchange rate
// date should be in YYYY-MM-DD format (from transaction date)
export async function convertToUSD(
  amount: number,
  currency: string,
  date?: string // Optional: transaction date in YYYY-MM-DD format for historical rates
): Promise<number> {
  const upperCurrency = currency.toUpperCase();
  
  // If currency is USD, no conversion needed
  if (upperCurrency === "USD") {
    return amount;
  }
  
  // If date is provided, use historical exchange rate
  if (date) {
    const rate = await getHistoricalExchangeRateToUSD(upperCurrency, date);
    return amount * rate;
  }
  
  // Fallback to approximate rates if no date provided
  const rate = getFallbackExchangeRateToUSD(upperCurrency);
  return amount * rate;
}

