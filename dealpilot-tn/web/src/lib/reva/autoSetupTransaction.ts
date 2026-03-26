import { setupTransactionIntelligence } from './transactionIntelligence'

export async function autoSetupTransaction(
  transaction: any,
  supabase: any
): Promise<void> {
  await setupTransactionIntelligence(transaction, supabase)
}
