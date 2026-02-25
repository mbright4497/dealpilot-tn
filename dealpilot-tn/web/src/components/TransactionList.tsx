'use client'
import React, {useState} from 'react'

interface Transaction {
  id: number
  address: string
  client: string
  type: string
  status: string
  binding: string
  closing: string
}

interface Props {
  transactions: Transaction[]
  onViewChecklist: (txId: number) => void
  onOpenDeal?: (txId: number) => void
}

export default function TransactionList({ transactions, onViewChecklist, onOpenDeal }: Props){
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<number|null>(null)
  const list = transactions.filter(m=> filter==='All' || m.status===filter)

