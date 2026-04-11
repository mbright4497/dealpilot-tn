/** Whole-dollar purchase price as words for RF401 (matches PDF generate route). */
export function numberToWords(n: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000)
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1000000)
    return (
      numberToWords(Math.floor(n / 1000)) +
      ' Thousand' +
      (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
    )
  return (
    numberToWords(Math.floor(n / 1000000)) +
    ' Million' +
    (n % 1000000 ? ' ' + numberToWords(n % 1000000) : '')
  )
}

export function priceToWords(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const n = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  if (isNaN(n)) return ''
  const dollars = Math.floor(n)
  return numberToWords(dollars) + ' Dollars'
}
