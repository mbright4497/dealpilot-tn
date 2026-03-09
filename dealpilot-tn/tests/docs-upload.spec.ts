import { POST } from '../web/src/app/api/docs/upload/route'

test('upload route exports POST handler', () => {
  expect(typeof POST).toBe('function')
})
