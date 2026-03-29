# MoveX Simplification Phase 4: Standardized Database Schema
**Current Status:** Simplification (Local Exam-Grade)

The simplified database is reduced to 3 primary tables. All complex JSONB and password reset tables are removed. Relationships are standardized via simple IDs.

### 1. **Users Table**
`PRIMARY KEY (user_id)`
| Column | Type | Description |
|---|---|---|
| `user_id` | SERIAL (PK) | Auto-increment ID |
| `username` | VARCHAR(255) | Unique identifier for login |
| `password_hash` | VARCHAR(255) | BCrypt (Cost 10) |
| `full_name` | VARCHAR(100) | Full Name |
| `role` | ENUM | admin, franchisee, staff, user |
| `status` | TEXT | active, disabled |
| `organization_id` | INT | Links to organizations (if franchise/staff) |

### 2. **Organizations (Franchises)**
`PRIMARY KEY (organization_id)`
| Column | Type | Description |
|---|---|---|
| `organization_id` | SERIAL (PK) | Auto-increment ID |
| `name` | TEXT | Franchise/Hub name |
| `pincodes` | TEXT | Comma-separated coverage |
| `status` | TEXT | active, inactive |

### 3. **Shipments**
`PRIMARY KEY (shipment_id)`
| Column | Type | Description |
|---|---|---|
| `shipment_id` | SERIAL (PK) | Primary shipment number |
| `tracking_id` | VARCHAR(50) | Logic: 'MX-' + shipment_id |
| `status` | VARCHAR(50) | pending, picked up, in transit, delivered |
| `sender_name` | VARCHAR(100) | Name |
| `receiver_name` | VARCHAR(100) | Name |
| `weight` | NUMERIC | Weight (kg) |
| `price` | NUMERIC | Price directly input by user |
| `creator_username` | VARCHAR(255) | Who booked it |
| `organization_id` | INT | Assigned Hub |
| `assigned_staff_id` | INT | Assigned Delivery Person |
