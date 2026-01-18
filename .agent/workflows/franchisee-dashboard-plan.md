# Franchisee Dashboard Implementation Plan

## Status Legend
- [ ] Not Started
- [🔄] In Progress
- [✅] Complete

---

## Phase 1: HTML Pages Setup
- [✅] Dashboard page (simplified KPIs, only + New Shipment button)
- [✅] Shipments page (copy of admin shipments structure with Hold/RTO)
- [✅] Pickup Requests page (renamed from Bookings)
- [✅] Staff page (with Add Staff button, table, edit/toggle)
- [✅] Finance page (total revenue, recent shipments)
- [✅] Settings page (profile, franchise address, password)

## Phase 2: Backend API Endpoints
All endpoints should filter by `organization_id` from the logged-in franchisee's session.

### Shipments API
- [✅] `GET /api/dashboard/franchisee/shipments` - List all shipments for this franchise
- [✅] `POST /api/dashboard/franchisee/shipments/create` - Create new shipment (auto-assign org_id)
- [✅] `POST /api/dashboard/franchisee/shipments/update-status` - Update shipment status

### Pickup Requests API
- [✅] `GET /api/dashboard/franchisee/pickup-requests` - Get pending pickups from assigned pincodes
- [✅] `POST /api/dashboard/franchisee/pickup-requests/approve` - Approve request (with remarks)
- [✅] `POST /api/dashboard/franchisee/pickup-requests/reject` - Reject request (with remarks)

### Staff API
- [✅] `GET /api/dashboard/franchisee/staff` - List staff for this franchise
- [✅] `POST /api/dashboard/franchisee/staff/create` - Add new staff member
- [✅] `POST /api/dashboard/franchisee/staff/update` - Edit staff details
- [✅] `POST /api/dashboard/franchisee/staff/status` - Enable/disable staff

### Stats API
- [✅] `GET /api/dashboard/franchisee/stats` - Dashboard KPIs (total shipments, pending pickups, revenue)

## Phase 3: Frontend Logic (franchisee-core.js)

### Dashboard Initializer
- [✅] Basic structure
- [✅] Fetch and display only 2 KPIs (Total Shipments, Pending Pickups)
- [✅] + New Shipment button triggers createShipment modal

### Shipments Initializer
- [✅] Full table rendering (same as admin)
- [✅] Search by tracking ID
- [✅] Filter by status
- [✅] Filter by date
- [✅] Pagination
- [✅] Create shipment modal
- [✅] View shipment details modal
- [✅] Update status modal (with Hold, RTO statuses)

### Pickup Requests Initializer
- [✅] Fetch pickup requests from assigned pincodes
- [✅] Render table with customer, address, package info
- [✅] Approve button (with remarks modal)
- [✅] Reject button (with remarks modal)

### Staff Initializer
- [✅] Fetch staff list for this franchise
- [✅] Add Staff modal (name, username, password, phone, role)
- [✅] Edit Staff modal
- [✅] Enable/Disable staff toggle

### Finance Initializer
- [✅] Total revenue from shipments
- [✅] Monthly revenue display

### Settings Initializer
- [✅] Profile form (name, phone)
- [✅] Password change form
- [✅] Franchise info display

## Phase 4: Status Updates
- [✅] Add "Hold" and "RTO" status to shipment status options (franchisee)
- [✅] Update admin page status dropdown to include Hold/RTO

## Phase 5: Print Label
- [✅] Print label linked in View Shipment modal (uses existing print-label.html)

## Phase 6: Security & Access Control
- [✅] All endpoints check organization_id matches
- [✅] Added pickup-requests to role hierarchy

---

## Summary of Changes Made

### Files Modified:
1. `js/franchisee-core.js` - Complete rewrite with full CRUD for shipments, staff management, settings
2. `js/dashboard-guard.js` - Added pickup-requests to role hierarchy
3. `backend/routes/dashboard.js` - Added franchisee endpoints for shipments, pickup requests, staff
4. `admin/shipments.html` - Added Hold/RTO status to filter dropdown

### Files Created/Updated:
1. `franchisee/dashboard.html` - Simplified KPIs
2. `franchisee/shipments.html` - Full shipment management
3. `franchisee/pickup-requests.html` - Pickup request management
4. `franchisee/staff.html` - Staff management with sidebar
5. `franchisee/finance.html` - Revenue tracking with sidebar
6. `franchisee/settings.html` - Profile/password/franchise settings with sidebar

---

## Next Steps (Future Enhancement)
- [ ] Automatic logout after inactivity
- [ ] Disabled franchisee login message enhancement
- [ ] Export reports (if needed later)
