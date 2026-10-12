# AXIS Dashboard – Data Model

Money is stored as integer minor units (SCR cents / USD cents) with an explicit currency code.
Percentages are basis points (1000 = 10%). Hours are stored as integer minutes.
Lead statuses: new_prospect | pitch_sent | meeting_scheduled | won | lost

| Collection | Key fields | Admin | Sales Associate | Developer |
|---|---|---|---|---|
| users/{uid} | email, role, active, commission_rate_bps, pending_commission {SCR, USD} | all | own doc only | own doc only |
| clients/{id} | name, domain, tier, included_minutes, used_minutes, assigned_developer_uids[], lead_id, health fields | all | none | assigned only (health fields write) |
| client_billing/{id} | retainer_amount_minor, currency, next_renewal_date, payment_status (Paid/Pending/Overdue) | all | none | none |
| hour_logs/{id} | client_id, dev_uid, minutes, date, note | all | none | own logs (read) |
| leads/{id} | company_name, contact_name, contact_email, contact_phone, domain, status, owner_uid, notes, converted_client_id | all | own leads | none |
| commissions/{id} | sales_uid, lead_id, client_id, retainer_amount_minor, currency, commission_rate_bps, earned_commission_minor | all | own (read) | none |
| settings/fx | scr_per_usd, updated_at | read/write | read | read |
| settings/* | system settings | read/write | none | none |

Server-only writes (Admin SDK, bypass rules, run in transactions): leads -> won, clients create, client_billing create, commissions, hour_logs create, pending_commission increments.
