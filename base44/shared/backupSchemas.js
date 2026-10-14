export const schemas = {
  "BudgetExpense": {
    "name": "BudgetExpense",
    "type": "object",
    "properties": {
      "budgetId": {
        "type": "string",
        "description": "ID of the associated Budget record"
      },
      "projectId": {
        "type": "string",
        "description": "ID of the associated project"
      },
      "date": {
        "type": "string",
        "format": "date",
        "description": "Date of the budget expense"
      },
      "description": {
        "type": "string",
        "description": "Description of the budget expense"
      },
      "amount": {
        "type": "number",
        "description": "Amount of the budget expense in project currency"
      },
      "category": {
        "type": "string",
        "description": "Optional category for the budget expense"
      },
      "notes": {
        "type": "string",
        "description": "Optional notes about this budget expense"
      }
    },
    "required": [
      "budgetId",
      "projectId",
      "date",
      "description",
      "amount"
    ]
  },
  "ProjectSnapshot": {
    "name": "ProjectSnapshot",
    "type": "object",
    "properties": {
      "projectId": {
        "type": "string",
        "description": "ID of the original project"
      },
      "projectName": {
        "type": "string",
        "description": "Name of the project at the time of snapshot"
      },
      "snapshotDate": {
        "type": "string",
        "format": "date-time",
        "description": "When the snapshot was taken"
      },
      "triggeredBy": {
        "type": "string",
        "description": "Email of user who triggered the snapshot, or 'scheduled'"
      },
      "data": {
        "type": "object",
        "description": "Full project data at the time of snapshot"
      }
    },
    "required": [
      "projectId",
      "projectName",
      "snapshotDate",
      "data"
    ],
    "x-security": {
      "notes": [
        "CRITICAL: Contains complete project data including potentially sensitive information",
        "Should only be created by service role (scheduled tasks or admin actions)",
        "Users should NOT be able to create snapshots directly",
        "Users should NOT be able to update or delete snapshots",
        "Read access: Users can only see snapshots of projects they have access to",
        "Super admins can see all snapshots",
        "Access should check if user has access to the project referenced in 'data.created_by' and 'data.sharedWith'"
      ]
    }
  },
  "Expense": {
    "name": "Expense",
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "Description of the expense"
      },
      "amount": {
        "type": "number",
        "description": "Amount paid so far (deposit or full amount) in project currency"
      },
      "totalAmount": {
        "type": "number",
        "description": "Total quoted amount for the expense in project currency"
      },
      "depositAmount": {
        "type": "number",
        "description": "Deposit amount paid in project currency"
      },
      "taxAmount": {
        "type": "number",
        "description": "Tax/VAT amount shown on the invoice in project currency"
      },
      "paymentStatus": {
        "type": "string",
        "enum": [
          "unpaid",
          "deposit_paid",
          "fully_paid"
        ],
        "default": "unpaid",
        "description": "Payment status of the expense"
      },
      "depositPaidAt": {
        "type": "string",
        "format": "date-time",
        "description": "Timestamp when the deposit was paid"
      },
      "category": {
        "type": "string",
        "description": "Expense category"
      },
      "date": {
        "type": "string",
        "format": "date",
        "description": "Date of expense"
      },
      "vendor": {
        "type": "string",
        "description": "Vendor or supplier name"
      },
      "photos": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Photo URLs"
      },
      "notes": {
        "type": "string",
        "description": "Additional notes"
      },
      "projectId": {
        "type": "string",
        "description": "ID of the associated project - SECURITY: Immutable after creation"
      },
      "updated_by": {
        "type": "string",
        "description": "Email of the user who last updated this expense - SECURITY: Auto-set, not user-editable"
      },
      "isPaid": {
        "type": "boolean",
        "default": false,
        "description": "Whether the expense has been fully paid"
      },
      "paidAt": {
        "type": "string",
        "format": "date-time",
        "description": "Timestamp when the expense was marked as fully paid"
      },
      "paidBy": {
        "type": "string",
        "description": "Email of the user who marked the expense as paid"
      },
      "paidCash": {
        "type": "boolean",
        "default": false,
        "description": "Whether the expense was paid in cash"
      },
      "createdByName": {
        "type": "string",
        "description": "Full name of the user who created this expense"
      },
      "updatedByName": {
        "type": "string",
        "description": "Full name of the user who last updated this expense"
      },
      "isDeleted": {
        "type": "boolean",
        "default": false,
        "description": "True while the expense is in Recently Deleted. Missing means active."
      },
      "deletedAt": {
        "type": "string",
        "format": "date-time",
        "description": "When the expense was moved to Recently Deleted"
      },
      "deletedBy": {
        "type": "string",
        "description": "Email of the user who deleted the expense"
      },
      "purgeAfter": {
        "type": "string",
        "format": "date-time",
        "description": "Earliest time the expense may be permanently deleted (deletedAt + 5 days)"
      }
    },
    "required": [
      "description",
      "amount",
      "category",
      "date",
      "projectId"
    ],
    "x-security": {
      "notes": [
        "projectId must be set on creation and cannot be changed - prevents moving expenses between projects",
        "created_by is auto-set and immutable - establishes who created the expense",
        "Access should inherit from parent Project entity",
        "Users can only CRUD expenses if they have appropriate access to the associated project"
      ]
    }
  },
  "Budget": {
    "name": "Budget",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Budget name (e.g. Cabinets, Labor, Plumbing)"
      },
      "projectId": {
        "type": "string",
        "description": "ID of the associated project"
      },
      "month": {
        "type": "string",
        "description": "Optional month for the budget in YYYY-MM format"
      },
      "amount": {
        "type": "number",
        "description": "Budget limit in project currency"
      },
      "notes": {
        "type": "string",
        "description": "Optional notes about this budget"
      }
    },
    "required": [
      "name",
      "projectId",
      "amount"
    ]
  },
  "ActivityLog": {
    "name": "ActivityLog",
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "description": "Action performed (e.g. created_expense, deleted_project, updated_role)"
      },
      "entityType": {
        "type": "string",
        "description": "Type of entity affected (expense, project, user)"
      },
      "entityId": {
        "type": "string",
        "description": "ID of the affected entity"
      },
      "entityLabel": {
        "type": "string",
        "description": "Human-readable label of the affected entity"
      },
      "performedBy": {
        "type": "string",
        "description": "Email of the user who performed the action - SECURITY: Auto-set, immutable"
      },
      "performedByName": {
        "type": "string",
        "description": "Full name of the user who performed the action - SECURITY: Auto-set, immutable"
      },
      "details": {
        "type": "string",
        "description": "Additional details about the action"
      }
    },
    "required": [
      "action",
      "entityType",
      "performedBy"
    ],
    "x-security": {
      "notes": [
        "CRITICAL: This is an audit log - should be append-only",
        "Users should NOT be able to create ActivityLog entries directly - only via service role",
        "Users should NOT be able to update or delete log entries",
        "Read access: Super admins can see all logs, regular users can only see logs for entities they have access to",
        "created_date is auto-set and provides immutable timestamp"
      ]
    }
  },
  "Project": {
    "name": "Project",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Project name"
      },
      "description": {
        "type": "string",
        "description": "Project description"
      },
      "status": {
        "type": "string",
        "enum": [
          "active",
          "completed",
          "on_hold"
        ],
        "default": "active",
        "description": "Project status"
      },
      "currency": {
        "type": "string",
        "enum": [
          "EUR",
          "USD",
          "GBP",
          "CAD",
          "CHF"
        ],
        "default": "EUR",
        "description": "Currency used for this project"
      },
      "startDate": {
        "type": "string",
        "format": "date",
        "description": "Project start date"
      },
      "endDate": {
        "type": "string",
        "format": "date",
        "description": "Project end date"
      },
      "sharedWith": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string"
            },
            "role": {
              "type": "string",
              "enum": [
                "admin",
                "editor",
                "viewer"
              ]
            }
          },
          "required": [
            "email",
            "role"
          ]
        },
        "default": [],
        "description": "List of users with access and their roles - SECURITY: Only owner/admin can modify"
      }
    },
    "required": [
      "name"
    ],
    "x-security": {
      "notes": [
        "created_by field is auto-set and immutable - establishes ownership",
        "sharedWith should only be modifiable by project owner or super admin",
        "Users should only see projects where: created_by = user OR user in sharedWith OR role = admin"
      ]
    }
  },
  "Payment": {
    "name": "Payment",
    "type": "object",
    "properties": {
      "expenseId": {
        "type": "string",
        "description": "ID of the associated expense - SECURITY: Immutable after creation"
      },
      "amount": {
        "type": "number",
        "description": "Payment amount in project currency"
      },
      "date": {
        "type": "string",
        "format": "date",
        "description": "Date payment was made"
      },
      "method": {
        "type": "string",
        "enum": [
          "Bank Transfer",
          "Credit Card",
          "Cash",
          "Check",
          "Deposit",
          "Other"
        ],
        "description": "Payment method"
      },
      "referenceNumber": {
        "type": "string",
        "description": "Reference number, check number, or transaction ID"
      },
      "notes": {
        "type": "string",
        "description": "Additional notes about this payment"
      },
      "photos": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Receipt or proof of payment photo URLs"
      },
      "paidBy": {
        "type": "string",
        "description": "Email of the user who recorded the payment - SECURITY: Auto-set, not user-editable"
      },
      "paidByName": {
        "type": "string",
        "description": "Full name of the user who recorded the payment - SECURITY: Auto-set, not user-editable"
      }
    },
    "required": [
      "expenseId",
      "amount",
      "date",
      "method"
    ],
    "x-security": {
      "notes": [
        "expenseId must be set on creation and cannot be changed",
        "Access should inherit from parent Expense > Project chain",
        "paidBy and paidByName should be auto-set from authenticated user",
        "Users can only see/manage payments for expenses they have access to"
      ]
    }
  }
};

