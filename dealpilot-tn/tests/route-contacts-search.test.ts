const { GET } = require('../web/src/app/api/contacts/search/route')

test('contacts search route exports GET handler', ()=>{
  expect(typeof GET).toBe('function')
})
