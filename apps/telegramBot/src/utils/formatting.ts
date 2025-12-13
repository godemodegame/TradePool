export function formatSuiAmount(amount: string | number, decimals: number = 9): string {
  const num = typeof amount === 'string' ? BigInt(amount) : BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

export function parseSuiAmount(amount: string, decimals: number = 9): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction)).toString();
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function shortenAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimestamp(timestamp: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function calculatePriceImpact(
  inputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint
): number {
  const outputAmount = (inputAmount * outputReserve) / (inputReserve + inputAmount);
  const priceWithoutImpact = outputReserve / inputReserve;
  const priceWithImpact = outputAmount / inputAmount;
  return Number(((priceWithoutImpact - priceWithImpact) / priceWithoutImpact) * BigInt(10000)) / 100;
}

export function calculateMinimumReceived(amount: string, slippageTolerance: number): string {
  const amountBigInt = BigInt(amount);
  const slippageFactor = BigInt(Math.floor((100 - slippageTolerance) * 100));
  return ((amountBigInt * slippageFactor) / BigInt(10000)).toString();
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
