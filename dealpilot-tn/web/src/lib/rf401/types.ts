export interface PDFFieldCoord {
  fieldId: string
  page: number
  x: number
  y: number
  type: 'text' | 'checkbox'
  fontSize: number
  maxWidth: number
}
