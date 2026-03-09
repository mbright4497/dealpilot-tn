import { GET } from '@/app/api/communications/hub/route'

jest.mock('@supabase/auth-helpers-nextjs', ()=>({ createRouteHandlerClient: jest.fn() }))
jest.mock('next/headers', ()=>({ cookies: {} }))

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

describe('GET /api/communications/hub', ()=>{
  it('returns grouped contacts for deal', async ()=>{
    const mockSupabase:any = {
      auth: { getUser: async ()=>({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValueOnce({ data: [{ role: 'client', contacts: { id: '1', name: 'John', email: 'j@e.com', phone: '555' } }] }),
      eq: jest.fn().mockReturnThis(),
    }
    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)

    const url = 'http://localhost/api/communications/hub?deal_id=123'
    const res:any = await GET(new Request(url))
    const json = await res.json()
    expect(json.grouped).toBeDefined()
    expect(json.grouped.client[0].name).toBe('John')
  })
})
