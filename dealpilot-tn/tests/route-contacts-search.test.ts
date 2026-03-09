const fs = require('fs')
const path = require('path')
const p = path.resolve(__dirname, '../web/src/app/api/contacts/search/route.ts')

test('contacts search route file exists', ()=>{
  expect(fs.existsSync(p)).toBe(true)
})
