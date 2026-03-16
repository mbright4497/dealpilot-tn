import { shouldShowTransactionEmptyState, shouldShowTransactionSkeleton } from '@/components/TransactionList'

describe('TransactionList loading helpers', () => {
  it('shows a skeleton when there are no transactions and loading is true', () => {
    expect(shouldShowTransactionSkeleton([], true)).toBe(true)
    expect(shouldShowTransactionSkeleton([], false)).toBe(false)
  })

  it('shows an empty state when there are no transactions and loading is false', () => {
    expect(shouldShowTransactionEmptyState([], false)).toBe(true)
    expect(shouldShowTransactionEmptyState([], true)).toBe(false)
  })
})
