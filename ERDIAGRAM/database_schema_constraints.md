# Database Table Structures

### Table: users

| ATTRIBUTE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | DATATYPE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | CONSTRAINTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; |
|:---------------------------------------------|:----------------------------------------------------|:---------------------------------------------|
| user_id                                      | bigserial                                           | NOT NULL                                     |
| username                                     | character varying(255)                              | PRIMARY KEY                                  |
| password_hash                                | character varying(255)                              | NOT NULL                                     |
| role                                         | public.user_role                                    | DEFAULT 'user'                               |
| status                                       | public.user_status                                  | DEFAULT 'active'                             |
| security_answers                             | jsonb                                               | DEFAULT '{}'                                 |
| created_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| updated_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| last_login_at                                | timestamp with time zone                            | NULL                                         |
| organization_id                              | bigint                                              | FOREIGN KEY                                  |
| full_name                                    | character varying(100)                              | NULL                                         |
| phone                                        | character varying(50)                               | CHECK                                        |
| staff_role                                   | text                                                | NULL                                         |
| staff_status                                 | text                                                | DEFAULT 'Active'                             |

<br>

### Table: shipments

| ATTRIBUTE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | DATATYPE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | CONSTRAINTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; |
|:---------------------------------------------|:----------------------------------------------------|:---------------------------------------------|
| shipment_id                                  | bigserial                                           | NOT NULL                                     |
| tracking_id                                  | character varying(50)                               | PRIMARY KEY                                  |
| sender_name                                  | character varying(100)                              | NULL                                         |
| receiver_name                                | character varying(100)                              | NULL                                         |
| origin_address                               | text                                                | NULL                                         |
| destination_address                          | text                                                | NULL                                         |
| status                                       | character varying(50)                               | DEFAULT 'pending'                            |
| current_location                             | character varying(100)                              | NULL                                         |
| price                                        | numeric(10, 2)                                      | DEFAULT 0.00                                 |
| created_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| updated_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| organization_id                              | bigint                                              | FOREIGN KEY                                  |
| sender_phone                                 | character varying(20)                               | CHECK                                        |
| receiver_phone                               | character varying(20)                               | CHECK                                        |
| sender_address                               | text                                                | NULL                                         |
| receiver_address                             | text                                                | NULL                                         |
| sender_pincode                               | character varying(10)                               | CHECK                                        |
| receiver_pincode                             | character varying(10)                               | CHECK                                        |
| weight                                       | numeric(10, 2)                                      | DEFAULT 1.0                                  |
| creator_username                             | character varying(255)                              | FOREIGN KEY                                  |
| assigned_staff_id                            | integer                                             | NULL                                         |

<br>

### Table: organizations

| ATTRIBUTE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | DATATYPE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | CONSTRAINTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; |
|:---------------------------------------------|:----------------------------------------------------|:---------------------------------------------|
| organization_id                              | bigserial                                           | PRIMARY KEY                                  |
| name                                         | text                                                | NOT NULL                                     |
| type                                         | text                                                | DEFAULT 'franchise'                          |
| created_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| updated_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| status                                       | character varying(50)                               | DEFAULT 'active'                             |
| pincodes                                     | text                                                | NULL                                         |
| full_address                                 | text                                                | NULL                                         |

<br>

### Table: password_resets

| ATTRIBUTE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | DATATYPE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | CONSTRAINTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; |
|:---------------------------------------------|:----------------------------------------------------|:---------------------------------------------|
| reset_id                                     | bigserial                                           | PRIMARY KEY                                  |
| token_hash                                   | text                                                | NOT NULL                                     |
| expires_at                                   | timestamp with time zone                            | NOT NULL                                     |
| used                                         | boolean                                             | DEFAULT false                                |
| created_at                                   | timestamp with time zone                            | DEFAULT now()                                |
| username                                     | character varying(255)                              | FOREIGN KEY                                  |