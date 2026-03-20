# MoveX Database Schema

## Table: `public.organizations`

| NAME | DATATYPE | CONSTRAINTS |
| :--- | :--- | :--- |
| `organization_id` | `bigserial` | PRIMARY KEY |
| `name` | `text` | NOT NULL |
| `type` | `text` | NOT NULL, DEFAULT 'franchise' |
| `non_serviceable_areas` | `text` | NULL |
| `created_at` | `timestamp with time zone` | DEFAULT now() |
| `updated_at` | `timestamp with time zone` | DEFAULT now() |
| `status` | `character varying(50)` | DEFAULT 'active' |
| `pincodes` | `text` | NULL |
| `full_address` | `text` | NULL |

---

## Table: `public.shipments`

| NAME | DATATYPE | CONSTRAINTS |
| :--- | :--- | :--- |
| `shipment_id` | `bigserial` | NOT NULL |
| `tracking_id` | `character varying(50)` | PRIMARY KEY |
| `sender_name` | `character varying(100)` | NULL |
| `receiver_name` | `character varying(100)` | NULL |
| `origin_address` | `text` | NULL |
| `destination_address` | `text` | NULL |
| `status` | `character varying(50)` | DEFAULT 'pending' |
| `current_location` | `character varying(100)` | NULL |
| `price` | `numeric(10, 2)` | DEFAULT 0.00 |
| `created_at` | `timestamp with time zone` | DEFAULT now() |
| `updated_at` | `timestamp with time zone` | DEFAULT now() |
| `organization_id` | `bigint` | FOREIGN KEY (organizations) |
| `sender_phone` | `character varying(20)` | CHECK (10 digits) |
| `receiver_phone` | `character varying(20)` | CHECK (10 digits) |
| `sender_address` | `text` | NULL |
| `receiver_address` | `text` | NULL |
| `sender_pincode` | `character varying(10)` | CHECK (6 digits) |
| `receiver_pincode` | `character varying(10)` | CHECK (6 digits) |
| `weight` | `numeric(10, 2)` | DEFAULT 1.0 |
| `creator_username` | `character varying(255)` | FOREIGN KEY (users) |
| `assigned_staff_id` | `integer` | NULL |

---

## Table: `public.users`

| NAME | DATATYPE | CONSTRAINTS |
| :--- | :--- | :--- |
| `user_id` | `bigserial` | NOT NULL |
| `username` | `character varying(255)` | PRIMARY KEY, UNIQUE |
| `password_hash` | `character varying(255)` | NOT NULL |
| `role` | `public.user_role` | NOT NULL, DEFAULT 'user' |
| `status` | `public.user_status` | NOT NULL, DEFAULT 'active' |
| `security_answers` | `jsonb` | DEFAULT '{}' |
| `created_at` | `timestamp with time zone` | DEFAULT now() |
| `updated_at` | `timestamp with time zone` | DEFAULT now() |
| `last_login_at` | `timestamp with time zone` | NULL |
| `organization_id` | `bigint` | FOREIGN KEY (organizations) |
| `full_name` | `character varying(100)` | NULL |
| `phone` | `character varying(50)` | CHECK (10 digits) |

---

## Table: `public.password_resets`

| NAME | DATATYPE | CONSTRAINTS |
| :--- | :--- | :--- |
| `reset_id` | `bigserial` | PRIMARY KEY |
| `token_hash` | `text` | NOT NULL |
| `expires_at` | `timestamp with time zone` | NOT NULL |
| `used` | `boolean` | NOT NULL, DEFAULT false |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() |
| `username` | `character varying(255)` | FOREIGN KEY (users) |
