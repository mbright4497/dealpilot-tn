const { POST } = require('../web/src/app/api/ghl/contacts/sync/route')

test('ghl contacts sync route exports POST handler', ()=>{
  expect(typeof POST).toBe('function')
})
