export interface TickerInfo {
  ticker: string;
  name: string;
  sector: string;
}

export const SUPPORTED_TICKERS: TickerInfo[] = [
  // Technology
  { ticker: "AAPL", name: "Apple", sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft", sector: "Technology" },
  { ticker: "GOOGL", name: "Alphabet", sector: "Technology" },
  { ticker: "META", name: "Meta Platforms", sector: "Technology" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology" },
  { ticker: "AVGO", name: "Broadcom", sector: "Technology" },
  { ticker: "ORCL", name: "Oracle", sector: "Technology" },
  { ticker: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { ticker: "INTC", name: "Intel", sector: "Technology" },
  { ticker: "QCOM", name: "Qualcomm", sector: "Technology" },
  { ticker: "CRM", name: "Salesforce", sector: "Technology" },
  { ticker: "ADBE", name: "Adobe", sector: "Technology" },
  { ticker: "NOW", name: "ServiceNow", sector: "Technology" },
  { ticker: "INTU", name: "Intuit", sector: "Technology" },
  { ticker: "TXN", name: "Texas Instruments", sector: "Technology" },
  { ticker: "IBM", name: "IBM", sector: "Technology" },
  // Consumer Discretionary
  { ticker: "AMZN", name: "Amazon", sector: "Consumer Discretionary" },
  { ticker: "TSLA", name: "Tesla", sector: "Consumer Discretionary" },
  { ticker: "HD", name: "Home Depot", sector: "Consumer Discretionary" },
  { ticker: "MCD", name: "McDonald's", sector: "Consumer Discretionary" },
  { ticker: "NKE", name: "Nike", sector: "Consumer Discretionary" },
  { ticker: "SBUX", name: "Starbucks", sector: "Consumer Discretionary" },
  { ticker: "LOW", name: "Lowe's", sector: "Consumer Discretionary" },
  { ticker: "TGT", name: "Target", sector: "Consumer Discretionary" },
  // Consumer Staples
  { ticker: "WMT", name: "Walmart", sector: "Consumer Staples" },
  { ticker: "COST", name: "Costco", sector: "Consumer Staples" },
  { ticker: "KO", name: "Coca-Cola", sector: "Consumer Staples" },
  { ticker: "PEP", name: "PepsiCo", sector: "Consumer Staples" },
  { ticker: "PG", name: "Procter & Gamble", sector: "Consumer Staples" },
  { ticker: "PM", name: "Philip Morris", sector: "Consumer Staples" },
  // Financials — US Banks
  { ticker: "BRK.B", name: "Berkshire Hathaway B", sector: "Financials" },
  { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { ticker: "BAC", name: "Bank of America", sector: "Financials" },
  { ticker: "WFC", name: "Wells Fargo", sector: "Financials" },
  { ticker: "C", name: "Citigroup", sector: "Financials" },
  { ticker: "USB", name: "U.S. Bancorp", sector: "Financials" },
  { ticker: "PNC", name: "PNC Financial Services", sector: "Financials" },
  { ticker: "TFC", name: "Truist Financial", sector: "Financials" },
  { ticker: "COF", name: "Capital One", sector: "Financials" },
  { ticker: "GS", name: "Goldman Sachs", sector: "Financials" },
  { ticker: "MS", name: "Morgan Stanley", sector: "Financials" },
  { ticker: "SCHW", name: "Charles Schwab", sector: "Financials" },
  { ticker: "BX", name: "Blackstone", sector: "Financials" },
  { ticker: "KKR", name: "KKR & Co.", sector: "Financials" },
  // Financials — Payments & Credit
  { ticker: "V", name: "Visa", sector: "Financials" },
  { ticker: "MA", name: "Mastercard", sector: "Financials" },
  { ticker: "AXP", name: "American Express", sector: "Financials" },
  { ticker: "PYPL", name: "PayPal", sector: "Financials" },
  // Financials — Canadian Banks
  { ticker: "RY", name: "Royal Bank of Canada", sector: "Financials" },
  { ticker: "TD", name: "Toronto-Dominion Bank", sector: "Financials" },
  { ticker: "BNS", name: "Bank of Nova Scotia", sector: "Financials" },
  { ticker: "BMO", name: "Bank of Montreal", sector: "Financials" },
  { ticker: "CM", name: "CIBC", sector: "Financials" },
  { ticker: "NA", name: "National Bank of Canada", sector: "Financials" },
  // Healthcare
  { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { ticker: "UNH", name: "UnitedHealth", sector: "Healthcare" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { ticker: "ABBV", name: "AbbVie", sector: "Healthcare" },
  { ticker: "MRK", name: "Merck", sector: "Healthcare" },
  { ticker: "PFE", name: "Pfizer", sector: "Healthcare" },
  { ticker: "TMO", name: "Thermo Fisher Scientific", sector: "Healthcare" },
  { ticker: "ABT", name: "Abbott Laboratories", sector: "Healthcare" },
  // Communication Services
  { ticker: "NFLX", name: "Netflix", sector: "Communication Services" },
  { ticker: "DIS", name: "Disney", sector: "Communication Services" },
  { ticker: "CMCSA", name: "Comcast", sector: "Communication Services" },
  { ticker: "T", name: "AT&T", sector: "Communication Services" },
  { ticker: "VZ", name: "Verizon", sector: "Communication Services" },
  // Industrials
  { ticker: "CAT", name: "Caterpillar", sector: "Industrials" },
  { ticker: "BA", name: "Boeing", sector: "Industrials" },
  { ticker: "GE", name: "GE Aerospace", sector: "Industrials" },
  { ticker: "HON", name: "Honeywell", sector: "Industrials" },
  { ticker: "UPS", name: "UPS", sector: "Industrials" },
  { ticker: "RTX", name: "RTX Corporation", sector: "Industrials" },
  { ticker: "LMT", name: "Lockheed Martin", sector: "Industrials" },
  // Energy
  { ticker: "XOM", name: "ExxonMobil", sector: "Energy" },
  { ticker: "CVX", name: "Chevron", sector: "Energy" },
  { ticker: "COP", name: "ConocoPhillips", sector: "Energy" },
  // Materials
  { ticker: "LIN", name: "Linde", sector: "Materials" },
  { ticker: "SHW", name: "Sherwin-Williams", sector: "Materials" },
  // Real Estate
  { ticker: "AMT", name: "American Tower", sector: "Real Estate" },
  { ticker: "EQIX", name: "Equinix", sector: "Real Estate" },
  { ticker: "PLD", name: "Prologis", sector: "Real Estate" },
  // Special
  { ticker: "SPCX", name: "SpaceX", sector: "Aerospace" },
];
