import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {

    const body = await req.json()
    const { file } = body

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const prompt = `
You are a Tennessee real estate transaction assistant.

A PDF contract (RF401 Purchase & Sale Agreement) has been uploaded.

Extract the following structured data:

propertyAddress
buyerNames
sellerNames
purchasePrice
earnestMoney
bindingDate
closingDate
inspectionEndDate
financingContingencyDate
specialStipulations
contractType (buyer or seller)

Also extract a timeline array with objects:

{
  label: string,
  date: string,
  status: "pending" | "complete"
}

Only return valid JSON.

Example format:

{
  "propertyAddress": "",
  "buyerNames": [],
  "sellerNames": [],
  "purchasePrice": 0,
  "earnestMoney": 0,
  "bindingDate": "",
  "closingDate": "",
  "inspectionEndDate": "",
  "financingContingencyDate": "",
  "specialStipulations": "",
  "contractType": "buyer",
  "timeline": [
    {
      "label": "Inspection Period Ends",
      "date": "",
      "status": "pending"
    }
  ]
}
`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You extract structured contract data from Tennessee RF401 PDFs.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${file}`
                }
              }
            ]
          }
        ]
      })
    })

    const data = await openaiRes.json()

    const text = data.choices?.[0]?.message?.content

    if (!text) {
      return NextResponse.json(
        { error: 'AI returned no content' },
        { status: 500 }
      )
    }

    let parsed

    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text }
    }

    return NextResponse.json(parsed)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: 'Contract parsing failed' },
      { status: 500 }
    )
  }
}
