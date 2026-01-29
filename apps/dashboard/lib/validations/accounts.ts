import { z } from 'zod'

// -----------------------------------------------------------------------------
// Company Account Validation
// -----------------------------------------------------------------------------

export const companyAccountSchema = z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    contactPerson: z.string().optional(),
    contactNumber: z
        .string()
        .regex(/^[0-9]{10}$/, 'Must be a valid 10-digit phone number')
        .optional()
        .or(z.literal('')),
    email: z
        .string()
        .email('Invalid email address')
        .optional()
        .or(z.literal('')),
    creditLimit: z.coerce.number().min(0, 'Credit limit must be 0 or greater'),
})

export type CompanyAccountFormData = z.infer<typeof companyAccountSchema>

// -----------------------------------------------------------------------------
// Card Terminal Validation
// -----------------------------------------------------------------------------

export const terminalSchema = z.object({
    provider: z.union([z.literal('VISA/MASTER'), z.literal('AMEX')]),
    terminalId: z
        .string()
        .min(4, 'Terminal ID must be at least 4 characters'),
    bankAccount: z
        .string()
        .min(4, 'Bank account must be at least 4 characters'),
})

export type TerminalFormData = z.infer<typeof terminalSchema>

// -----------------------------------------------------------------------------
// Card Settlement Validation
// -----------------------------------------------------------------------------

export const settlementSchema = z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    terminalId: z.string().min(1, 'Terminal selection is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().optional(),
    amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
    shift: z.union([z.literal('Day'), z.literal('Night')]),
})

export type SettlementFormData = z.infer<typeof settlementSchema>

// -----------------------------------------------------------------------------
// Cash Deposit Validation
// -----------------------------------------------------------------------------

export const depositSchema = z.object({
    bank: z.string().min(1, 'Bank is required'),
    method: z.string().min(1, 'Deposit method is required'),
    amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
    ref: z.string().min(1, 'Reference number is required'),
    date: z.string().optional(),
    shift: z.union([z.literal('Day'), z.literal('Night')]),
})

export type DepositFormData = z.infer<typeof depositSchema>

// -----------------------------------------------------------------------------
// Helper to extract errors from ZodError
// -----------------------------------------------------------------------------

export function extractZodErrors(error: z.ZodError): Record<string, string> {
    const errors: Record<string, string> = {}
    error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (path && typeof path === 'string') {
            errors[path] = issue.message
        }
    })
    return errors
}
