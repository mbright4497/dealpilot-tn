const fs = require('fs')
const path = require('path')
const p = path.resolve(__dirname, '../web/src/app/api/ghl/contacts/sync/route.ts')

test('ghl contacts sync route file exists', ()=>{
  expect(fs.existsSync(p)).toBe(true)
})
