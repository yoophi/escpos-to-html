export type BarcodeModules = (0 | 1)[]

// Code 128 폭 테이블(값 0-105), 각 항목은 bar/space 교대 6런 = 11모듈
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
]
const CODE128_STOP = '2331112'
const CODE128_START_B = 104

const pushPattern = (bits: BarcodeModules, pattern: string) => {
  for (let index = 0; index < pattern.length; index += 1) {
    const width = Number(pattern[index])
    const bit: 0 | 1 = index % 2 === 0 ? 1 : 0
    for (let k = 0; k < width; k += 1) bits.push(bit)
  }
}

export function encodeCode128(raw: string): BarcodeModules | null {
  let data = raw
  if (/^\{[ABC]/.test(data)) data = data.slice(2)
  data = data.replace(/\{\{/g, '{')
  if (data.length === 0) return null

  const codes: number[] = []
  for (const char of data) {
    const code = char.charCodeAt(0)
    if (code < 0x20 || code > 0x7e) return null
    codes.push(code - 0x20)
  }

  let checksum = CODE128_START_B
  codes.forEach((code, index) => {
    checksum += code * (index + 1)
  })

  const bits: BarcodeModules = []
  pushPattern(bits, CODE128_PATTERNS[CODE128_START_B])
  codes.forEach((code) => pushPattern(bits, CODE128_PATTERNS[code]))
  pushPattern(bits, CODE128_PATTERNS[checksum % 103])
  pushPattern(bits, CODE128_STOP)
  return bits
}

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const EAN_R = EAN_L.map((pattern) => pattern.replace(/[01]/g, (bit) => (bit === '0' ? '1' : '0')))
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function encodeEan13(raw: string): BarcodeModules | null {
  if (!/^\d{12,13}$/.test(raw)) return null

  const digits = raw.slice(0, 12).split('').map(Number)
  const check = (10 - (digits.reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0) % 10)) % 10
  if (raw.length === 13 && Number(raw[12]) !== check) return null

  const all = [...digits, check]
  const parity = EAN_PARITY[all[0]]
  const parts: string[] = ['101']
  for (let index = 1; index <= 6; index += 1) {
    parts.push((parity[index - 1] === 'L' ? EAN_L : EAN_G)[all[index]])
  }
  parts.push('01010')
  for (let index = 7; index <= 12; index += 1) {
    parts.push(EAN_R[all[index]])
  }
  parts.push('101')
  return parts.join('').split('').map((bit) => (bit === '1' ? 1 : 0))
}

export function encodeBarcodeModules(symbology: string, data: string): BarcodeModules | null {
  if (symbology === 'CODE128' || symbology === 'GS1-128') return encodeCode128(data)
  if (symbology === 'EAN13') return encodeEan13(data)
  return null
}
