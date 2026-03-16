import { RF401_FORM } from './definitions/rf401'
import { RF653_FORM } from './definitions/rf653'
import { RF621_FORM } from './definitions/rf621'
import type { FormDefinition, FormFieldDefinition, FormStepDefinition } from './types'

const registry: Record<string, FormDefinition> = {
  [RF401_FORM.id]: RF401_FORM,
  [RF653_FORM.id]: RF653_FORM,
  [RF621_FORM.id]: RF621_FORM,
}

export const FORM_REGISTRY: Record<string, FormDefinition> = registry
export const FORM_LIST: FormDefinition[] = Object.values(registry)

export function getFormDefinition(id?: string): FormDefinition | undefined {
  if (!id) return undefined
  const key = id.toLowerCase()
  return registry[id] || registry[key]
}

export function ensureFormDefinition(id?: string): FormDefinition {
  const def = getFormDefinition(id)
  if (!def) {
    throw new Error(`Form definition for "${id}" not found.`)
  }
  return def
}

export function findStep(definition: FormDefinition, stepId: string): FormStepDefinition | undefined {
  return definition.steps.find((step) => step.id === stepId)
}

export function findField(definition: FormDefinition, fieldId: string): FormFieldDefinition | undefined {
  return definition.fields.find((field) => field.id === fieldId)
}

export type { FormDefinition, FormFieldDefinition, FormStepDefinition } from './types'
