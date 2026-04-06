import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DPI = 150
const PT_PER_INCH = 72
const SCALE = PT_PER_INCH / DPI // 0.48

const testFields = [
  { fieldId: 'buyer_1_name_p1', label: 'buyer_1_name', page: 1, x: 190, y: 352 },
  { fieldId: 'buyer_2_name_p1', label: 'buyer_2_name', page: 1, x: 587, y: 354 },
  { fieldId: 'seller_1_name_p1', label: 'seller_1_name', page: 1, x: 350, y: 376 },
  { fieldId: 'seller_2_name_p1', label: 'seller_2_name', page: 1, x: 634, y: 376 },
  { fieldId: 'property_address_p1', label: 'property_address', page: 1, x: 447, y: 422 },
  { fieldId: 'property_city_p1', label: 'property_city', page: 1, x: 323, y: 448 },
  { fieldId: 'property_zip_p1', label: 'property_zip', page: 1, x: 847, y: 447 },
]

const testValues = {
  buyer_1_name: 'John Test',
  buyer_2_name: 'Jane Test',
  seller_1_name: 'Jack Fake',
  seller_2_name: 'Sue Fake',
  property_address: '102 Lookout Pointe',
  property_city: 'Johnson City',
  property_zip: '37660',
}

async function main() {
  const pdfPath = path.join(__dirname, 'public/forms/rf401-blank-decrypted.pdf')
  const outPath = path.join(__dirname, '../web/public/forms/rf401-test.pdf')

  const pdfBytes = fs.readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()

  for (const field of testFields) {
    const page = pages[field.page - 1]
    const { height } = page.getSize()

    const pdfX = field.x * SCALE
    const pdfY = height - (field.y * SCALE)

    const value = testValues[field.label] ?? field.label

    page.drawText(value, {
      x: pdfX,
      y: pdfY,
      size: 9,
      font,
      color: rgb(0, 0, 0.8),
    })
  }

  const outBytes = await pdfDoc.save()
  fs.writeFileSync(outPath, outBytes)
  console.log('Wrote', outPath)
}

main().catch(console.error)
