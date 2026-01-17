# MoveX - Database Table Design

This document contains the complete database schema for the MoveX Logistics Management System.

---

## ENUM TYPES

### user_role
```
VALUES: 'admin', 'franchisee', 'staff', 'user'
```

### user_status
```
VALUES: 'active', 'disabled', 'suspended'
```a

---

## TABLE: ORGANIZATIONS

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| organization_id | BIGSERIAL | PRIMARY KEY |
| name | TEXT | NOT NULL |
| type | TEXT | NOT NULL, DEFAULT 'franchise' |
| status | VARCHAR(50) | DEFAULT 'active' |
| pincodes | TEXT | — |
| non_serviceable_areas | TEXT | — |
| full_address | TEXT | — |
| performance | NUMERIC(5,2) | DEFAULT 0.00 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |

---

## TABLE: USERS

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| user_id | BIGSERIAL | NOT NULL |
| username | VARCHAR(255) | PRIMARY KEY, UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| role | user_role | NOT NULL, DEFAULT 'user' |
| status | user_status | NOT NULL, DEFAULT 'active' |
| full_name | VARCHAR(100) | — |
| phone | VARCHAR(50) | — |
| organization_id | BIGINT | FOREIGN KEY → organizations(organization_id) ON DELETE SET NULL |
| security_answers | JSONB | DEFAULT '{}' |
| staff_role | TEXT | — |
| staff_status | TEXT | DEFAULT 'Active' |
| last_login_at | TIMESTAMP WITH TIME ZONE | — |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |

---

## TABLE: SESSIONS

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| session_id | SERIAL | PRIMARY KEY |
| username | VARCHAR(255) | FOREIGN KEY → users(username) ON UPDATE CASCADE ON DELETE CASCADE |
| role | VARCHAR(50) | — |
| token | VARCHAR(255) | UNIQUE |
| created_at | BIGINT | — |
| expires_at | BIGINT | — |
| last_accessed_at | BIGINT | — |

---

## TABLE: PASSWORD_RESETS

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| reset_id | BIGSERIAL | PRIMARY KEY |
| username | VARCHAR(255) | FOREIGN KEY → users(username) ON UPDATE CASCADE ON DELETE CASCADE |
| token_hash | TEXT | NOT NULL |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL |
| used | BOOLEAN | NOT NULL, DEFAULT FALSE |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |

---

## TABLE: SHIPMENTS

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| shipment_id | BIGSERIAL | NOT NULL |
| tracking_id | VARCHAR(50) | PRIMARY KEY, UNIQUE, NOT NULL |
| sender_name | VARCHAR(100) | — |
| sender_phone | VARCHAR(20) | — |
| sender_mobile | VARCHAR(20) | — |
| sender_address | TEXT | — |
| sender_pincode | VARCHAR(10) | — |
| receiver_name | VARCHAR(100) | — |
| receiver_phone | VARCHAR(20) | — |
| receiver_mobile | VARCHAR(20) | — |
| receiver_address | TEXT | — |
| receiver_pincode | VARCHAR(10) | — |
| origin_address | TEXT | — |
| destination_address | TEXT | — |
| status | VARCHAR(50) | DEFAULT 'pending' |
| current_location | VARCHAR(100) | — |
| weight | NUMERIC(10,2) | DEFAULT 1.0 |
| price | NUMERIC(10,2) | DEFAULT 0.00 |
| estimated_delivery | TIMESTAMP WITH TIME ZONE | — |
| creator_username | VARCHAR(255) | FOREIGN KEY → users(username) ON UPDATE CASCADE ON DELETE SET NULL |
| organization_id | BIGINT | FOREIGN KEY → organizations(organization_id) ON UPDATE CASCADE ON DELETE SET NULL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |

---

## TABLE: SERVICEABLE_CITIES

| COLUMN NAME | DATATYPE | CONSTRAINTS |
|-------------|----------|-------------|
| city_id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | UNIQUE, NOT NULL |

---

## FOREIGN KEY RELATIONSHIPS

| FROM TABLE | COLUMN | REFERENCES | ON UPDATE | ON DELETE |
|------------|--------|------------|-----------|-----------|
| users | organization_id | organizations(organization_id) | — | SET NULL |
| sessions | username | users(username) | CASCADE | CASCADE |
| password_resets | username | users(username) | CASCADE | CASCADE |
| shipments | creator_username | users(username) | CASCADE | SET NULL |
| shipments | organization_id | organizations(organization_id) | CASCADE | SET NULL |

---

## PRIMARY KEYS SUMMARY

| TABLE | PRIMARY KEY |
|-------|-------------|
| organizations | organization_id |
| users | username |
| sessions | session_id |
| password_resets | reset_id |
| shipments | tracking_id |
| serviceable_cities | city_id |

---

## FOREIGN KEYS SUMMARY

| FOREIGN KEY NAME | TABLE | COLUMN | REFERENCES |
|------------------|-------|--------|------------|
| organization_id | users | organization_id | organizations(organization_id) |
| organization_id | shipments | organization_id | organizations(organization_id) |
| username | sessions | username | users(username) |
| username | password_resets | username | users(username) |
| creator_username | shipments | creator_username | users(username) |

---

## RELATIONSHIP DIAGRAM (Text)

```
┌─────────────────────────┐
│     ORGANIZATIONS       │
│   PK: organization_id   │◄─────────────────────────────────────┐
└───────────┬─────────────┘                                      │
            │                                                    │
            │ FK: organization_id                                │ FK: organization_id
            ▼                                                    │
┌─────────────────────────┐                            ┌─────────┴───────────────┐
│         USERS           │                            │       SHIPMENTS         │
│    PK: username         │◄───────────────────────────│    PK: tracking_id      │
└───────────┬─────────────┘  FK: creator_username      └─────────────────────────┘
            │
            │ FK: username
            │
┌───────────┴───────────────────────┐
│                                   │
▼                                   ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│        SESSIONS         │  │     PASSWORD_RESETS     │
│    PK: session_id       │  │    PK: reset_id         │
│    FK: username         │  │    FK: username         │
└─────────────────────────┘  └─────────────────────────┘

┌─────────────────────────┐
│   SERVICEABLE_CITIES    │ (Standalone Lookup Table)
│    PK: city_id          │
└─────────────────────────┘
```

---

## NOTES

1. **PRIMARY KEYS:**
   - `username` is the PRIMARY KEY for users (not `user_id`)
   - `tracking_id` is the PRIMARY KEY for shipments (not `shipment_id`)
   - All other tables use their respective `_id` columns as PRIMARY KEY

2. **FOREIGN KEY ACTIONS:**
   - `ON DELETE CASCADE`: When parent is deleted, child records are also deleted (sessions, password_resets)
   - `ON DELETE SET NULL`: When parent is deleted, foreign key is set to NULL (users.organization_id, shipments)
   - `ON UPDATE CASCADE`: When parent key is updated, child foreign key is also updated

3. **WEAK ENTITIES:**
   - `sessions` and `password_resets` are weak entities (depend on users table)

---

*Last Updated: 2026-01-16*
