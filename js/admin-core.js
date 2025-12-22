/**
 * MoveX Admin Core Logic
 * Handles functionality for all admin sections.
 */

window.MoveXAdmin = (function () {
    'use strict';

    // Pagination State
    let SHIP_PAGE = 1;
    const SHIP_LIMIT = 10;

    // --- MOCK DATA ---
    const MOCK_DATA = {
        stats: {
            totalShipments: 12450,
            shipmentTrend: '+12.5% vs last month',
            activeFranchises: 48,
            franchiseTrend: '+2 New this week',
            totalRevenue: 845200,
            revenueTrend: '+8.2% vs last month',
            failedDeliveries: 1.2,
            failedTrend: '-0.5% Improved'
        },
        shipments: [
            { id: 'MX29801', status: 'In Transit', origin: 'Mumbai, MH', destination: 'Delhi, NCR', date: 'Dec 19, 2025', amount: 1240.00, customer: 'Arjun Verma', email: 'arjun.v@gmail.com' },
            { id: 'MX29802', status: 'Delivered', origin: 'Bangalore, KA', destination: 'Chennai, TN', date: 'Dec 18, 2025', amount: 890.50, customer: 'Priya Sharma', email: 'priya.s@outlook.com' },
            { id: 'MX29803', status: 'Pending', origin: 'Hyderabad, TS', destination: 'Pune, MH', date: 'Dec 19, 2025', amount: 450.00, customer: 'Rohan Gupta', email: 'rohan.g@yahoo.in' },
            { id: 'MX29804', status: 'Failed', origin: 'Kolkata, WB', destination: 'Ahmedabad, GJ', date: 'Dec 17, 2025', amount: 2100.00, customer: 'Anjali Das', email: 'anjali.das@gmail.com' },
            { id: 'MX29805', status: 'In Transit', origin: 'Surat, GJ', destination: 'Jaipur, RJ', date: 'Dec 19, 2025', amount: 3150.00, customer: 'Vikram Singh', email: 'v.singh@rediffmail.com' },
            { id: 'MX29806', status: 'Delivered', origin: 'Lucknow, UP', destination: 'Bhopal, MP', date: 'Dec 16, 2025', amount: 750.00, customer: 'Sneha Kapoor', email: 'sneha.k@gmail.com' },
            { id: 'MX29807', status: 'Pending', origin: 'Indore, MP', destination: 'Nagpur, MH', date: 'Dec 19, 2025', amount: 120.00, customer: 'Amit Mishra', email: 'amit.mishra@live.com' },
            { id: 'MX29808', status: 'In Transit', origin: 'Chandigarh, CH', destination: 'Amritsar, PB', date: 'Dec 19, 2025', amount: 560.00, customer: 'Gurpreet Singh', email: 'g.singh@gmail.com' },
            { id: 'MX29809', status: 'Delivered', origin: 'Patna, BR', destination: 'Ranchi, JH', date: 'Dec 15, 2025', amount: 1800.00, customer: 'Ravi Kumar', email: 'ravi.k@protonmail.com' },
            { id: 'MX29810', status: 'In Transit', origin: 'Guwahati, AS', destination: 'Shillong, ML', date: 'Dec 19, 2025', amount: 940.00, customer: 'Deepika Bora', email: 'd.bora@gmail.com' },
            { id: 'MX29811', status: 'Delivered', origin: 'Thiruvananthapuram, KL', destination: 'Kochi, KL', date: 'Dec 14, 2025', amount: 320.00, customer: 'Rahul Nair', email: 'rahul.nair@gmail.com' },
            { id: 'MX29812', status: 'Pending', origin: 'Bhubaneswar, OR', destination: 'Visakhapatnam, AP', date: 'Dec 19, 2025', amount: 1550.00, customer: 'Sagar Mohanty', email: 'sagar.m@gmail.com' },
            { id: 'MX29813', status: 'Failed', origin: 'Panaji, GA', destination: 'Mangalore, KA', date: 'Dec 13, 2025', amount: 2800.00, customer: 'Kevin Dsouza', email: 'kevin.d@gmail.com' },
            { id: 'MX29814', status: 'In Transit', origin: 'Dehradun, UK', destination: 'Shimla, HP', date: 'Dec 19, 2025', amount: 670.00, customer: 'Neha Rawat', email: 'neha.rawat@gmail.com' },
            { id: 'MX29815', status: 'Delivered', origin: 'Varanasi, UP', destination: 'Agra, UP', date: 'Dec 12, 2025', amount: 1100.00, customer: 'Sandip Yadav', email: 'sandip.y@gmail.com' },
            { id: 'MX29816', status: 'In Transit', origin: 'Mysore, KA', destination: 'Bangalore, KA', date: 'Dec 19, 2025', amount: 450.00, customer: 'Kavita Reddy', email: 'k.reddy@gmail.com' },
            { id: 'MX29817', status: 'Pending', origin: 'Udaipur, RJ', destination: 'Jodhpur, RJ', date: 'Dec 19, 2025', amount: 890.00, customer: 'Sanjay Jain', email: 'sanjay.j@gmail.com' },
            { id: 'MX29818', status: 'Delivered', origin: 'Vijayawada, AP', destination: 'Guntur, AP', date: 'Dec 11, 2025', amount: 230.00, customer: 'Lokesh Babu', email: 'lokesh.b@gmail.com' },
            { id: 'MX29819', status: 'In Transit', origin: 'Madurai, TN', destination: 'Coimbatore, TN', date: 'Dec 19, 2025', amount: 540.00, customer: 'Meena Iyer', email: 'meena.i@gmail.com' },
            { id: 'MX29820', status: 'Failed', origin: 'Jamshedpur, JH', destination: 'Dhanbad, JH', date: 'Dec 10, 2025', amount: 1250.00, customer: 'Abhishek Mahto', email: 'a.mahto@gmail.com' },
            { id: 'MX29821', status: 'In Transit', origin: 'Rajkot, GJ', destination: 'Vadodara, GJ', date: 'Dec 19, 2025', amount: 780.00, customer: 'Parth Patel', email: 'parth.p@gmail.com' },
            { id: 'MX29822', status: 'Delivered', origin: 'Nashik, MH', destination: 'Aurangabad, MH', date: 'Dec 09, 2025', amount: 650.00, customer: 'Pooja Kulkarni', email: 'pooja.k@gmail.com' },
            { id: 'MX29823', status: 'Pending', origin: 'Kanpur, UP', destination: 'Meerut, UP', date: 'Dec 19, 2025', amount: 1400.00, customer: 'Varun Tiwari', email: 'v.tiwari@gmail.com' },
            { id: 'MX29824', status: 'In Transit', origin: 'Jammu, JK', destination: 'Srinagar, JK', date: 'Dec 19, 2025', amount: 2100.00, customer: 'Irfan Sheikh', email: 'irfan.s@gmail.com' },
            { id: 'MX29825', status: 'Delivered', origin: 'Siliguri, WB', destination: 'Darjeeling, WB', date: 'Dec 08, 2025', amount: 900.00, customer: 'Tenzing Norgay', email: 'tenzing.n@gmail.com' },
            { id: 'MX29826', status: 'In Transit', origin: 'Gwalior, MP', destination: 'Jabalpur, MP', date: 'Dec 19, 2025', amount: 560.00, customer: 'Yash Sharma', email: 'yash.s@gmail.com' },
            { id: 'MX29827', status: 'Pending', origin: 'Salem, TN', destination: 'Trichy, TN', date: 'Dec 19, 2025', amount: 320.00, customer: 'Sathish Kumar', email: 'sathish.k@gmail.com' },
            { id: 'MX29828', status: 'Delivered', origin: 'Raipur, CT', destination: 'Bilaspur, CT', date: 'Dec 07, 2025', amount: 1200.00, customer: 'Alok Singh', email: 'alok.s@gmail.com' },
            { id: 'MX29829', status: 'In Transit', origin: 'Bikaner, RJ', destination: 'Kota, RJ', date: 'Dec 19, 2025', amount: 890.00, customer: 'Kiran Rathore', email: 'kiran.r@gmail.com' },
            { id: 'MX29830', status: 'Failed', origin: 'Patiala, PB', destination: 'Ludhiana, PB', date: 'Dec 06, 2025', amount: 1500.00, customer: 'Amandeep Kaur', email: 'a.kaur@gmail.com' },
            { id: 'MX29831', status: 'In Transit', origin: 'Kollam, KL', destination: 'Alappuzha, KL', date: 'Dec 19, 2025', amount: 430.00, customer: 'Vishnu Prasad', email: 'vishnu.p@gmail.com' },
            { id: 'MX29832', status: 'Delivered', origin: 'Warangal, TS', destination: 'Nizamabad, TS', date: 'Dec 05, 2025', amount: 780.00, customer: 'Sravani Rao', email: 'sravani.r@gmail.com' },
            { id: 'MX29833', status: 'Pending', origin: 'Agartala, TR', destination: 'Aizawl, MZ', date: 'Dec 19, 2025', amount: 2200.00, customer: 'Biplab Deb', email: 'biplab.d@gmail.com' },
            { id: 'MX29834', status: 'In Transit', origin: 'Mathura, UP', destination: 'Jhansi, UP', date: 'Dec 19, 2025', amount: 540.00, customer: 'Radhika Rani', email: 'radhika.r@gmail.com' },
            { id: 'MX29835', status: 'Delivered', origin: 'Ujjain, MP', destination: 'Ratlam, MP', date: 'Dec 04, 2025', amount: 310.00, customer: 'Deepak Chouhan', email: 'deepak.c@gmail.com' },
            { id: 'MX29836', status: 'In Transit', origin: 'Tirupati, AP', destination: 'Nellore, AP', date: 'Dec 19, 2025', amount: 670.00, customer: 'Venkatesh Rao', email: 'venkatesh.r@gmail.com' },
            { id: 'MX29837', status: 'Pending', origin: 'Ajmer, RJ', destination: 'Pushkar, RJ', date: 'Dec 19, 2025', amount: 120.00, customer: 'Sameer Khan', email: 'sameer.k@gmail.com' },
            { id: 'MX29838', status: 'Delivered', origin: 'Bareilly, UP', destination: 'Moradabad, UP', date: 'Dec 03, 2025', amount: 890.00, customer: 'Shweta Pandey', email: 'shweta.p@gmail.com' },
            { id: 'MX29839', status: 'In Transit', origin: 'Solapur, MH', destination: 'Kolhapur, MH', date: 'Dec 19, 2025', amount: 560.00, customer: 'Rahul Patil', email: 'rahul.p@gmail.com' },
            { id: 'MX29840', status: 'Failed', origin: 'Gaya, BR', destination: 'Muzaffarpur, BR', date: 'Dec 02, 2025', amount: 1100.00, customer: 'Sanjeev Jha', email: 'sanjeev.j@gmail.com' },
            { id: 'MX29841', status: 'In Transit', origin: 'Amravati, MH', destination: 'Akola, MH', date: 'Dec 19, 2025', amount: 340.00, customer: 'Manoj Deshmukh', email: 'manoj.d@gmail.com' },
            { id: 'MX29842', status: 'Delivered', origin: 'Durgapur, WB', destination: 'Asansol, WB', date: 'Dec 01, 2025', amount: 720.00, customer: 'Bimal Roy', email: 'bimal.r@gmail.com' },
            { id: 'MX29843', status: 'Pending', origin: 'Tumkur, KA', destination: 'Hassan, KA', date: 'Dec 19, 2025', amount: 450.00, customer: 'Latha Gowda', email: 'latha.g@gmail.com' },
            { id: 'MX29844', status: 'In Transit', origin: 'Vellore, TN', destination: 'Kanchipuram, TN', date: 'Dec 19, 2025', amount: 230.00, customer: 'Arun Prakash', email: 'arun.p@gmail.com' },
            { id: 'MX29845', status: 'Delivered', origin: 'Rohtak, HR', destination: 'Panipat, HR', date: 'Nov 30, 2025', amount: 560.00, customer: 'Sunil Hooda', email: 'sunil.h@gmail.com' },
            { id: 'MX29846', status: 'In Transit', origin: 'Imphal, MN', destination: 'Kohima, NL', date: 'Dec 19, 2025', amount: 1800.00, customer: 'Ngangom Singh', email: 'ngangom.s@gmail.com' },
            { id: 'MX29847', status: 'Pending', origin: 'Kurnool, AP', destination: 'Kadapa, AP', date: 'Dec 19, 2025', amount: 670.00, customer: 'Srinivasulu P', email: 'srinivas.p@gmail.com' },
            { id: 'MX29848', status: 'Delivered', origin: 'Shimoga, KA', destination: 'Hubli, KA', date: 'Nov 29, 2025', amount: 890.00, customer: 'Geetha Bhat', email: 'geetha.b@gmail.com' },
            { id: 'MX29849', status: 'In Transit', origin: 'Anand, GJ', destination: 'Nadiad, GJ', date: 'Dec 19, 2025', amount: 150.00, customer: 'Hitesh Shah', email: 'hitesh.s@gmail.com' },
            { id: 'MX29850', status: 'Failed', origin: 'Sangli, MH', destination: 'Satara, MH', date: 'Nov 28, 2025', amount: 980.00, customer: 'Sudhir Joshi', email: 'sudhir.j@gmail.com' },
            { id: 'MX29851', status: 'In Transit', origin: 'Kakinada, AP', destination: 'Eluru, AP', date: 'Dec 19, 2025', amount: 450.00, customer: 'Raju Naidu', email: 'raju.n@gmail.com' }
        ],
        users: [
            { id: 1, name: 'System Administrator', email: 'admin@movex.com', role: 'admin', org: 'MoveX HQ', status: 'active', joined: 'Oct 15, 2023' },
            { id: 2, name: 'John Doe', email: 'john.doe@hub1.com', role: 'franchisee', org: 'Mumbai Hub', status: 'active', joined: 'Jan 10, 2024' },
            { id: 3, name: 'Jane Smith', email: 'jane.smith@support.com', role: 'staff', org: 'Delhi Branch', status: 'active', joined: 'Mar 05, 2024' },
            { id: 4, name: 'Mike Ross', email: 'mike.ross@delivery.com', role: 'staff', org: 'Bangalore Hub', status: 'disabled', joined: 'May 12, 2024' },
            { id: 5, name: 'Sarah Connor', email: 'sarah.c@user.com', role: 'customer', org: 'Direct', status: 'active', joined: 'Jun 20, 2024' }
        ],
        franchises: [
            { id: 'F-001', name: 'West Zone Logistics', owner: 'Robert Fox', location: 'Mumbai, MH', status: 'active', revenue: 45000 },
            { id: 'F-002', name: 'North India Couriers', owner: 'Jenny Wilson', location: 'Delhi, NCR', status: 'active', revenue: 32000 },
            { id: 'F-003', name: 'South Express', owner: 'Cameron Williamson', location: 'Chennai, TN', status: 'pending', revenue: 0 },
            { id: 'F-004', name: 'Gujarat Speed', owner: 'Guy Hawkins', location: 'Ahmedabad, GJ', status: 'active', revenue: 28000 }
        ],
        auditLogs: [
            { id: 1, user: 'admin@movex.com', action: 'Login Success', details: 'User logged in from 192.168.1.1', timestamp: '2025-10-24 10:30:15' },
            { id: 2, user: 'john.doe@hub1.com', action: 'Update Shipment', details: 'Shipment MX290012 status changed to In Transit', timestamp: '2025-10-24 11:15:22' },
            { id: 3, user: 'admin@movex.com', action: 'Create User', details: 'New staff user mike.ross@delivery.com created', timestamp: '2025-10-24 09:45:10' }
        ]
    };

    const INDIAN_CITIES = [
        "Mumbai, MH", "Delhi, NCR", "Bangalore, KA", "Hyderabad, TS", "Ahmedabad, GJ", "Chennai, TN", "Kolkata, WB", "Surat, GJ",
        "Pune, MH", "Jaipur, RJ", "Lucknow, UP", "Kanpur, UP", "Nagpur, MH", "Indore, MP", "Thane, MH", "Bhopal, MP",
        "Visakhapatnam, AP", "Pimpri-Chinchwad, MH", "Patna, BR", "Vadodara, GJ", "Ghaziabad, UP", "Ludhiana, PB", "Agra, UP",
        "Nashik, MH", "Faridabad, HR", "Meerut, UP", "Rajkot, GJ", "Kalyan-Dombivli, MH", "Vasai-Virar, MH", "Varanasi, UP",
        "Srinagar, JK", "Aurangabad, MH", "Dhanbad, JH", "Amritsar, PB", "Navi Mumbai, MH", "Allahabad, UP", "Howrah, WB",
        "Ranchi, JH", "Gwalior, MP", "Jabalpur, MP", "Coimbatore, TN", "Vijayawada, AP", "Jodhpur, RJ", "Madurai, TN",
        "Raipur, CT", "Chandigarh, CH", "Guwahati, AS", "Solapur, MH", "Hubli-Dharwad, KA", "Mysore, KA", "Tiruchirappalli, TN",
        "Bareilly, UP", "Aligarh, UP", "Tiruppur, TN", "Gurgaon, HR", "Moradabad, UP", "Jalandhar, PB", "Bhubaneswar, OR",
        "Salem, TN", "Warangal, TS", "Mira-Bhayandar, MH", "Thiruvananthapuram, KL", "Bhiwandi, MH", "Saharanpur, UP",
        "Guntur, AP", "Amravati, MH", "Bikaner, RJ", "Noida, UP", "Jamshedpur, JH", "Bhilai, CT", "Cuttack, OR", "Firozabad, UP",
        "Kochi, KL", "Nellore, AP", "Bhavnagar, GJ", "Dehradun, UK", "Durgapur, WB", "Asansol, WB", "Rourkela, OR", "Nanded, MH",
        "Kolhapur, MH", "Ajmer, RJ", "Akola, MH", "Gulbarga, KA", "Jamnagar, GJ", "Ujjain, MP", "Loni, UP", "Siliguri, WB",
        "Jhansi, UP", "Ulhasnagar, MH", "Jammu, JK", "Sangli-Miraj & Kupwad, MH", "Mangalore, KA", "Erode, TN", "Belgaum, KA",
        "Ambattur, TN", "Tirunelveli, TN", "Malegaon, MH", "Gaya, BR", "Jalgaon, MH", "Udaipur, RJ", "Maheshtala, WB"
    ];

    // --- UI UTILITIES ---

    function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = prefix + value.toLocaleString() + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function staggerEntries(selector, delay = 100) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, i) => {
            el.classList.add('staggered-item');
            setTimeout(() => {
                el.classList.add('visible');
            }, i * delay);
        });
    }

    function showSkeletons(containerSelector, type = 'table') {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        if (type === 'table') {
            const tbody = container.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = Array(4).fill(0).map(() => `
                    <tr>
                        ${Array(6).fill(0).map(() => '<td><div class="skeleton" style="height:20px; width:80%;"></div></td>').join('')}
                    </tr>
                `).join('');
            }
        } else if (type === 'cards') {
            const cards = container.querySelectorAll('.card');
            cards.forEach(card => {
                const header = card.querySelector('.card-header');
                const value = card.querySelector('.card-value');
                if (value) value.innerHTML = '<div class="skeleton" style="height:32px; width:100px; border-radius:4px;"></div>';
            });
        }
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Use SVG icons for premium feel
        const icons = {
            success: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            error: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
            info: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--brand-primary)'};
            color: white;
            padding: 0.875rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 600;
            font-size: 0.9rem;
            animation: slideInRight 0.4s var(--easing-spring);
        `;
        // SECURITY: Use textContent for message to prevent XSS
        const iconContainer = document.createElement('span');
        iconContainer.innerHTML = icons[type] || icons.info; // Safe - controlled icons only
        toast.appendChild(iconContainer);

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // Safe - no HTML injection possible
        toast.appendChild(messageSpan);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s var(--easing-smooth) forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    function initCityPicker(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'city-picker-wrapper';
        wrapper.style.cssText = 'position: relative; width: 100%;';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const dropdown = document.createElement('div');
        dropdown.className = 'city-picker-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--surface-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            max-height: 200px;
            overflow-y: auto;
            z-index: 10001;
            display: none;
            margin-top: 4px;
        `;
        wrapper.appendChild(dropdown);

        const renderCities = (filter = '') => {
            const filtered = INDIAN_CITIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div style="padding: 0.75rem; color: var(--text-tertiary); font-size: 0.85rem;">No cities found</div>';
            } else {
                dropdown.innerHTML = filtered.map(city => `
                    <div class="city-option" style="padding: 0.75rem 1rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;" 
                         onmouseover="this.style.background='var(--brand-primary-soft)'; this.style.paddingLeft='1.25rem';" 
                         onmouseout="this.style.background='none'; this.style.paddingLeft='1rem';">
                        <span>${city}</span>
                        <span style="font-size: 0.7rem; color: var(--brand-primary); font-weight: 700; text-transform: uppercase;">Select</span>
                    </div>
                `).join('');

                dropdown.querySelectorAll('.city-option').forEach(opt => {
                    opt.addEventListener('mousedown', (e) => {
                        input.value = opt.textContent.trim();
                        dropdown.style.display = 'none';
                    });
                });
            }
        };

        input.addEventListener('focus', () => {
            renderCities(input.value);
            dropdown.style.display = 'block';
        });

        input.addEventListener('input', () => {
            renderCities(input.value);
            dropdown.style.display = 'block';
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { dropdown.style.display = 'none'; }, 200);
        });
    }

    function createModal(title, content, actions = []) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-content card';
        modal.style.cssText = `
            width: 100%;
            max-width: 520px;
            padding: 0;
            transform: scale(0.95) translateY(20px);
            transition: all 0.3s var(--easing-spring);
            background: var(--surface-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl); /* 16px - Standard premium curve */
            box-shadow: var(--shadow-2xl);
            overflow: hidden; /* Clips internal square headers */
        `;

        const headerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center; background: var(--surface-secondary); border-top-left-radius: inherit; border-top-right-radius: inherit;">
                <h3 style="margin:0; font-size: 1.25rem; font-weight: 700;">${title}</h3>
                <button class="modal-close" style="background:var(--surface-primary); border:1px solid var(--border-subtle); cursor:pointer; color: var(--text-secondary); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;

        const bodyHTML = `<div style="padding: 2rem;">${content}</div>`;

        const footerHTML = actions.length ? `
            <div style="padding: 1.5rem; border-top: 1px solid var(--border-default); display: flex; justify-content: flex-end; gap: 1rem; background: var(--surface-secondary); border-bottom-left-radius: inherit; border-bottom-right-radius: inherit;">
                ${actions.map((a, i) => `
                    <button data-index="${i}" class="${a.primary ? 'btn-primary' : 'btn-secondary'}" 
                        style="padding: 0.625rem 1.5rem; border-radius: var(--radius-md); border: ${a.primary ? 'none' : '1px solid var(--border-default)'}; cursor: pointer; font-weight: 600; font-family:inherit; transition: all 0.2s;
                        ${a.primary ? 'background: var(--brand-primary); color: white;' : 'background: var(--surface-primary); color: var(--text-primary);'}">
                        ${a.label}
                    </button>
                `).join('')}
            </div>
        ` : '';

        modal.innerHTML = headerHTML + bodyHTML + footerHTML;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Hover animations for buttons
        modal.querySelectorAll('button').forEach(btn => {
            btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.filter = 'brightness(1.1)'; };
            btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; btn.style.filter = 'none'; };
        });

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1) translateY(0)';
        });

        const close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.95) translateY(20px)';
            setTimeout(() => overlay.remove(), 300);
        };

        overlay.querySelector('.modal-close').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        actions.forEach((a, i) => {
            const btn = modal.querySelector(`button[data-index="${i}"]`);
            if (btn) btn.onclick = () => {
                btn.innerHTML = 'Processing...';
                btn.disabled = true;
                a.onClick(() => {
                    btn.innerHTML = a.label;
                    btn.disabled = false;
                    close();
                });
            };
        });

        return { close };
    }

    // --- INITIALIZERS FOR EACH SECTION ---

    const initializers = {
        'dashboard.html': function () {
            // Show Skeletons first
            showSkeletons('.grid-kpi', 'cards');
            showSkeletons('.data-table-container', 'table');

            // Simulate data fetch
            setTimeout(() => {
                const kpiCards = document.querySelectorAll('.grid-kpi .card');
                if (kpiCards.length >= 4) {
                    // Number Counter Animations
                    animateValue(kpiCards[0].querySelector('.card-value'), 0, MOCK_DATA.stats.totalShipments, 1500);
                    animateValue(kpiCards[1].querySelector('.card-value'), 0, MOCK_DATA.stats.activeFranchises, 1000);
                    animateValue(kpiCards[2].querySelector('.card-value'), 0, MOCK_DATA.stats.totalRevenue / 1000, 2000, '₹', 'k');
                    animateValue(kpiCards[3].querySelector('.card-value'), 0, MOCK_DATA.stats.failedDeliveries, 1000, '', '%');

                    kpiCards[0].querySelector('.card-trend span').textContent = MOCK_DATA.stats.shipmentTrend;
                    kpiCards[1].querySelector('.card-trend span').textContent = MOCK_DATA.stats.franchiseTrend;
                    kpiCards[2].querySelector('.card-trend span').textContent = MOCK_DATA.stats.revenueTrend;
                    kpiCards[3].querySelector('.card-trend span').textContent = MOCK_DATA.stats.failedTrend;
                }

                const tbody = document.querySelector('.data-table tbody');
                if (tbody) {
                    tbody.innerHTML = MOCK_DATA.shipments.slice(0, 4).map(s => `
                        <tr>
                            <td style="font-family: monospace; font-weight: 600; color: var(--brand-primary);">${s.id}</td>
                            <td><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                            <td>${s.origin}</td>
                            <td>${s.destination}</td>
                            <td>${s.date}</td>
                            <td><strong style="font-family: monospace;">₹${s.amount.toFixed(2)}</strong></td>
                        </tr>
                    `).join('');

                    tbody.querySelectorAll('tr').forEach((row, i) => {
                        row.onclick = () => showShipmentDetails(MOCK_DATA.shipments[i]);
                    });

                    // Staggered table row entry
                    staggerEntries('.data-table tbody tr', 50);
                }

                // Staggered card entrance
                staggerEntries('.grid-kpi .card', 100);
            }, 600); // Artificial delay to show skeletons

            // Add "Last Updated" timestamp
            const header = document.querySelector('.page-header');
            if (header && !header.querySelector('.live-indicator')) {
                const updated = document.createElement('div');
                updated.className = 'live-indicator';
                updated.style.cssText = 'font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.4rem;';
                updated.innerHTML = '<span style="width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span> System Live • Last updated just now';
                header.appendChild(updated);
            }

            const viewAllBtn = document.querySelector('.card button');
            if (viewAllBtn && viewAllBtn.textContent.includes('View All')) {
                viewAllBtn.onclick = () => document.querySelector('a[href="admin-shipments.html"]')?.click();
            }
        },

        'users.html': function () {
            renderUserTable();
            const addBtn = document.querySelector('.page-header button');
            if (addBtn) {
                addBtn.onclick = () => {
                    createModal('Add New User', `
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Full Name</label><input type="text" id="new_name" placeholder="Enter name" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Email</label><input type="email" id="new_email" placeholder="email@movex.com" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Role</label>
                                <select id="new_role" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);">
                                    <option value="user">User</option>
                                    <option value="staff">Staff</option>
                                    <option value="franchisee">Franchisee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                    `, [
                        { label: 'Cancel', onClick: (close) => close() },
                        {
                            label: 'Create User', primary: true, onClick: (close) => {
                                const name = document.getElementById('new_name').value;
                                if (!name) return showToast('Name is required', 'error');
                                showToast(`User ${name} created successfully!`, 'success');
                                close();
                            }
                        }
                    ]);
                };
            }
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    const val = e.target.value.toLowerCase();
                    const items = MOCK_DATA.users.filter(u => u.name.toLowerCase().includes(val) || u.email.toLowerCase().includes(val));
                    renderUserTable(items);
                };
            }
        },

        'franchises.html': function () {
            renderFranchiseTable();
            const addBtn = document.querySelector('.page-header button');
            if (addBtn) addBtn.onclick = () => showToast('Franchise onboarding module opened', 'info');
        },

        'shipments.html': function () {
            renderShipmentTable();

            // Create New Shipment Event
            const addBtn = document.getElementById('createNewShipment');
            if (addBtn) {
                addBtn.onclick = () => {
                    createModal('Create New Shipment', `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.2rem;">
                            <div style="grid-column: span 2;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Customer Name</label>
                                <input type="text" id="ship_customer" placeholder="Full Name" style="width:100%;" autocomplete="off">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Customer Email</label>
                                <input type="email" id="ship_email" placeholder="email@example.com" style="width:100%;" autocomplete="off">
                            </div>
                            <div style="position: relative;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Origin City</label>
                                <input type="text" id="loc_origin_val" placeholder="Select City" style="width:100%;" autocomplete="new-password" name="no-fill-origin">
                            </div>
                            <div style="position: relative;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Destination City</label>
                                <input type="text" id="loc_dest_val" placeholder="Select City" style="width:100%;" autocomplete="new-password" name="no-fill-destination">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Amount (₹)</label>
                                <input type="number" id="ship_amount" placeholder="0.00" style="width:100%;" autocomplete="off">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Ship Date</label>
                                <input type="date" id="ship_date" style="width:100%;">
                            </div>
                        </div>
                    `, [
                        { label: 'Cancel', onClick: (close) => close() },
                        {
                            label: 'Create Shipment', primary: true, onClick: (close) => {
                                const customer = document.getElementById('ship_customer').value;
                                if (!customer) return showToast('Customer name is required', 'error');

                                const newShipment = {
                                    id: 'MX' + Math.floor(100000 + Math.random() * 900000),
                                    status: 'Pending',
                                    customer: customer,
                                    email: document.getElementById('ship_email').value || 'n/a',
                                    origin: document.getElementById('loc_origin_val').value || 'Mumbai, MH',
                                    destination: document.getElementById('loc_dest_val').value || 'Delhi, NCR',
                                    amount: parseFloat(document.getElementById('ship_amount').value) || 0,
                                    date: document.getElementById('ship_date').value || 'Today'
                                };

                                MOCK_DATA.shipments.unshift(newShipment);
                                renderShipmentTable();
                                showToast(`Shipment ${newShipment.id} created!`, 'success');
                                close();
                            }
                        }
                    ]);

                    // Initialize custom city pickers with updated IDs
                    initCityPicker('loc_origin_val');
                    initCityPicker('loc_dest_val');

                    // Re-init flatpickr inside modal
                    window.MoveXAdmin.init('modal-date');
                };
            }

            // Search & Filter functionality
            const searchInput = document.getElementById('shipmentSearchInput');
            const statusSelect = document.getElementById('shipmentStatusFilter');
            const dateInput = document.getElementById('shipmentDateFilter');
            const searchBtn = document.getElementById('shipmentSearchBtn');

            if (searchInput || statusSelect || dateInput || searchBtn) {
                const performSearch = (showToastMessage = false) => {
                    const query = (searchInput?.value || '').toLowerCase().trim();
                    const statusFilter = (statusSelect?.value || 'All Status').toLowerCase();
                    const dateVal = dateInput?.value || '';

                    const filtered = MOCK_DATA.shipments.filter(s => {
                        // 1. Text Query (ID, Customer, Email)
                        const matchesQuery = !query ||
                            String(s.id).toLowerCase().includes(query) ||
                            String(s.customer).toLowerCase().includes(query) ||
                            String(s.email).toLowerCase().includes(query);

                        // 2. Status match (Case insensitive)
                        const matchesStatus = statusFilter === 'all status' ||
                            String(s.status).toLowerCase() === statusFilter;

                        // 3. Date match (Strict string match for Mmm DD, YYYY)
                        let matchesDate = true;
                        if (dateVal && dateVal !== '') {
                            try {
                                // Convert YYYY-MM-DD (input) to "Dec 19, 2025" (mock data format)
                                const [year, month, day] = dateVal.split('-');
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                // Ensure day is handled correctly (input is 01-31, mock is 01-31)
                                const formattedInputDate = `${months[parseInt(month) - 1]} ${day}, ${year}`;

                                matchesDate = String(s.date).trim() === formattedInputDate;
                            } catch (e) {
                                console.warn('Date parsing error', e);
                                matchesDate = false;
                            }
                        }


                        return matchesQuery && matchesStatus && matchesDate;
                    });

                    renderShipmentTable(filtered, 1);

                    if (showToastMessage && query) {
                        showToast(`Found ${filtered.length} matches for "${query}"`, 'info');
                    }
                };

                if (searchBtn) searchBtn.onclick = () => performSearch(true);
                if (searchInput) {
                    searchInput.oninput = () => performSearch(false);
                    searchInput.onkeydown = (e) => {
                        if (e.key === 'Enter') performSearch(true);
                    };
                }
                if (statusSelect) statusSelect.onchange = () => performSearch(false);
                if (dateInput) dateInput.onchange = () => performSearch(false);
            }
        },

        'staff.html': function () {
            renderStaffTable();
        },

        'bookings.html': function () {
            renderBookingTable();
        },

        'finance.html': function () {
            const kpis = document.querySelectorAll('.card-value');
            if (kpis.length >= 3) {
                kpis[0].textContent = '₹' + (MOCK_DATA.stats.totalRevenue * 2.8 / 1000000).toFixed(1) + 'M';
                kpis[1].textContent = '₹45,200';
                kpis[2].textContent = '₹128k';
            }
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td style="font-family: monospace;">TX-9901</td><td>Oct 24, 10:30 AM</td><td>Shipment Payment</td><td>Customer: Alice</td><td style="color: var(--success);">+₹45.00</td><td><span class="status-badge status-active">Paid</span></td></tr>
                    <tr><td style="font-family: monospace;">TX-9902</td><td>Oct 24, 09:15 AM</td><td>Franchise Payout</td><td>Mumbai Hub</td><td style="color: var(--text-primary);">-₹1,250.00</td><td><span class="status-badge status-warn">Processing</span></td></tr>
                `;
            }
            const exportBtn = document.querySelector('.page-header button');
            if (exportBtn) exportBtn.onclick = () => showToast('Financial report exported', 'success');
        },

        'reports.html': function () {
            const buttons = document.querySelectorAll('.page-header button');
            if (buttons.length >= 2) {
                buttons[0].onclick = () => showToast('Date range selector opened', 'info');
                buttons[1].onclick = () => showToast('Exporting report as PDF...', 'success');
            }
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td>Oct 24, 2025</td><td>1,240</td><td>1,150</td><td style="color: var(--warning);">5</td><td>₹24,500</td></tr>
                    <tr><td>Oct 23, 2025</td><td>1,180</td><td>1,100</td><td style="color: var(--warning);">2</td><td>₹22,100</td></tr>
                    <tr><td>Oct 22, 2025</td><td>1,050</td><td>1,020</td><td style="color: var(--warning);">0</td><td>₹19,800</td></tr>
                `;
            }
        },

        'settings.html': function () {
            const saveBtn = document.querySelector('button[style*="background: var(--brand-primary)"]');
            if (saveBtn) saveBtn.onclick = () => showToast('Settings saved successfully', 'success');

            const toggles = document.querySelectorAll('input[type="checkbox"]');
            toggles.forEach(t => {
                t.onchange = () => showToast(`${t.parentElement.textContent.trim()} ${t.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        },

        'audit-logs.html': function () {
            renderAuditLogs();
            const filterBtn = document.querySelector('.card button');
            if (filterBtn) filterBtn.onclick = () => showToast('Logs filtered', 'info');
        }
    };

    function renderUserTable(data = MOCK_DATA.users) {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = data.map(u => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 40px; height: 40px; background: var(--brand-primary-soft); color: var(--brand-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                            ${u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${u.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge" style="background: ${getRoleBg(u.role)}; color: white; opacity: 0.9;">${u.role}</span></td>
                <td>${u.org}</td>
                <td><span class="status-badge status-${u.status}">${u.status}</span></td>
                <td>${u.joined}</td>
                <td>
                    <button class="action-btn" data-id="${u.id}" style="border:none; background:none; cursor:pointer; color:var(--text-secondary);"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = () => showUserActions(MOCK_DATA.users.find(u => u.id == btn.getAttribute('data-id')));
        });
    }

    function getRoleBg(role) {
        switch (role) {
            case 'admin': return 'var(--accent-purple)';
            case 'franchisee': return 'var(--info)';
            case 'staff': return 'var(--brand-primary)';
            default: return 'var(--text-secondary)';
        }
    }

    function showUserActions(user) {
        createModal(`User: ${user.name}`, `<p>Manage access for <strong>${user.email}</strong>.</p>`, [
            { label: 'Close', onClick: close => close() },
            {
                label: user.status === 'active' ? 'Disable' : 'Enable', primary: true, onClick: close => {
                    user.status = user.status === 'active' ? 'disabled' : 'active';
                    showToast(`User ${user.status}`, 'success');
                    renderUserTable();
                    close();
                }
            }
        ]);
    }

    function showShipmentDetails(s) {
        createModal(`Shipment: ${s.id}`, `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <!-- Status Banner -->
                <div style="background: var(--brand-primary-soft); padding: 1.5rem; border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--brand-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Current Status</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: var(--brand-primary);">${s.status}</div>
                    </div>
                    <div class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                        Live Tracking
                    </div>
                </div>

                <!-- Info Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 700;">Customer Details</label>
                        <div style="font-weight: 600; font-size: 1rem;">${s.customer}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">${s.email}</div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.4rem; font-weight: 700;">Financials</label>
                        <div style="font-weight: 600; font-size: 1rem; color: var(--success);">₹${typeof s.amount === 'number' ? s.amount.toFixed(2) : s.amount}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Paid via Razorpay</div>
                    </div>
                    <div style="grid-column: span 2; padding: 1rem; background: var(--surface-secondary); border-radius: var(--radius-md); display: flex; align-items: center; gap: 1rem;">
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.2rem;">Origin</label>
                            <div style="font-weight: 600;">${s.origin}</div>
                        </div>
                        <svg width="24" height="24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 12h15"/></svg>
                        <div style="flex: 1; text-align: right;">
                            <label style="display: block; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.2rem;">Destination</label>
                            <div style="font-weight: 600;">${s.destination}</div>
                        </div>
                    </div>
                </div>

                <!-- Simple Timeline -->
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 1rem; font-weight: 700;">Activity Timeline</label>
                    <div style="display: flex; flex-direction: column; gap: 1rem; position: relative; padding-left: 1.5rem;">
                        <div style="position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; background: var(--border-default);"></div>
                        
                        <div style="position: relative;">
                            <div style="position: absolute; left: -21px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--success); border: 3px solid var(--surface-primary);"></div>
                            <div style="font-size: 0.875rem; font-weight: 600;">Shipment Dispatched</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.date} • 10:30 AM</div>
                        </div>
                        <div style="position: relative;">
                            <div style="position: absolute; left: -21px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--brand-primary); border: 3px solid var(--surface-primary);"></div>
                            <div style="font-size: 0.875rem; font-weight: 600;">Order Processed</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.date} • 09:15 AM</div>
                        </div>
                    </div>
                </div>
            </div>
        `, [
            { label: 'Print Label', onClick: close => { showToast('Generating label...', 'info'); close(); } },
            { label: 'Update Status', primary: true, onClick: close => { showToast('Status update module opened', 'info'); close(); } }
        ]);
    }

    function renderFranchiseTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = MOCK_DATA.franchises.map(f => `
            <tr>
                <td><strong>${f.id}</strong></td>
                <td>${f.name}</td>
                <td>${f.owner}</td>
                <td>${f.location}</td>
                <td><span class="status-badge status-${f.status}">${f.status}</span></td>
                <td>₹${f.revenue.toLocaleString()}</td>
                <td><button class="btn-view" style="background:none; border:none; color:var(--brand-primary); cursor:pointer; font-weight:600;">View</button></td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.btn-view').forEach((btn, i) => btn.onclick = () => showFranchiseDetails(MOCK_DATA.franchises[i]));
    }

    function showFranchiseDetails(f) {
        createModal(f.name, `<p>Location: ${f.location}</p><p>Owner: ${f.owner}</p>`, [
            { label: 'Close', onClick: close => close() },
            { label: 'Contact', primary: true, onClick: close => { showToast('Opening messenger...', 'info'); close(); } }
        ]);
    }

    function renderShipmentTable(data = MOCK_DATA.shipments, page = null) {
        // Update Page if provided
        if (page !== null) SHIP_PAGE = page;

        const targetBody = document.querySelector('.data-table tbody');
        if (!targetBody) return;

        // Calculate Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / SHIP_LIMIT) || 1;

        // Ensure valid page
        if (SHIP_PAGE < 1) SHIP_PAGE = 1;
        if (SHIP_PAGE > totalPages) SHIP_PAGE = totalPages;

        const startIndex = (SHIP_PAGE - 1) * SHIP_LIMIT;
        const endIndex = startIndex + SHIP_LIMIT;
        const slicedData = data.slice(startIndex, endIndex);

        if (slicedData.length === 0) {
            targetBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 4rem; color: var(--text-tertiary); font-weight: 500;">No shipments found matching your criteria.</td></tr>`;
            const controls = document.getElementById('paginationControls');
            if (controls) controls.innerHTML = '';
            return;
        }

        // Render rows 
        targetBody.innerHTML = slicedData.map(s => `
            <tr style="display: table-row !important; visibility: visible !important; opacity: 1 !important; border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 1rem; font-family: monospace; font-weight: 600; color: var(--brand-primary);">${s.id}</td>
                <td style="padding: 1rem;"><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 600; color: var(--text-primary);">${s.customer}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.email}</div>
                </td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.origin}</td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.destination}</td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.date}</td>
                <td style="padding: 1rem; color: var(--text-primary);"><strong style="font-family: monospace;">₹${typeof s.amount === 'number' ? s.amount.toFixed(2) : s.amount}</strong></td>
                <td style="padding: 1rem;">
                    <button class="track-btn" style="background:none; border:none; color:var(--brand-primary); cursor:pointer; font-weight:600; padding: 0.5rem; border-radius: 4px; transition: all 0.2s;">View</button>
                </td>
            </tr>
        `).join('');

        // Re-attach event listeners (using slicedData)
        targetBody.querySelectorAll('.track-btn').forEach((btn, i) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showShipmentDetails(slicedData[i]);
            };
        });

        targetBody.querySelectorAll('tr').forEach((row, i) => {
            row.onclick = () => showShipmentDetails(slicedData[i]);
        });

        // Render Pagination Controls
        const controls = document.getElementById('paginationControls');
        if (controls) {
            controls.innerHTML = ''; // Clear previous

            // Previous Button
            const prevBtn = document.createElement('button');
            prevBtn.innerText = 'Previous';
            prevBtn.className = 'btn-secondary'; // Use existing class if available or style directly
            prevBtn.style.cssText = `padding: 0.5rem 1rem; border: 1px solid var(--border-default); background: var(--surface-secondary); color: var(--text-primary); border-radius: 6px; cursor: pointer; ${SHIP_PAGE === 1 ? 'opacity: 0.5; pointer-events: none;' : ''}`;
            prevBtn.onclick = () => renderShipmentTable(data, SHIP_PAGE - 1);

            // Info Text
            const info = document.createElement('span');
            info.innerText = `Page ${SHIP_PAGE} of ${totalPages} (${totalItems} items)`;
            info.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);';

            // Next Button
            const nextBtn = document.createElement('button');
            nextBtn.innerText = 'Next';
            nextBtn.style.cssText = `padding: 0.5rem 1rem; border: 1px solid var(--border-default); background: var(--surface-secondary); color: var(--text-primary); border-radius: 6px; cursor: pointer; ${SHIP_PAGE === totalPages ? 'opacity: 0.5; pointer-events: none;' : ''}`;
            nextBtn.onclick = () => renderShipmentTable(data, SHIP_PAGE + 1);

            controls.appendChild(prevBtn);
            controls.appendChild(info);
            controls.appendChild(nextBtn);
        }
    }

    function renderStaffTable() {
        const staffData = [
            { id: 'MXSTF001', name: 'Amit Patel', role: 'Driver', org: 'Andheri East, Mumbai', status: 'On Duty', contact: '+91 98765 00001' },
            { id: 'MXSTF002', name: 'Rohit Sharma', role: 'Manager', org: 'Bhiwandi Warehouse', status: 'Active', contact: '+91 98765 00002' },
            { id: 'MXSTF003', name: 'Priya Singh', role: 'Support Agent', org: 'HQ Call Center', status: 'Active', contact: '+91 98765 00003' }
        ];
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = staffData.map(s => `
            <tr>
                <td>
                    <div style="font-weight: 600;">${s.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">ID: ${s.id}</div>
                </td>
                <td><span class="status-badge" style="background: var(--surface-tertiary); color: var(--text-primary);">${s.role}</span></td>
                <td>${s.org}</td>
                <td><span class="status-badge status-active">${s.status}</span></td>
                <td>${s.contact}</td>
                <td><button class="edit-btn" style="border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Edit</button></td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.edit-btn').forEach((btn, i) => {
            btn.onclick = () => showToast(`Editing staff: ${staffData[i].name}`, 'info');
        });
        const addBtn = document.querySelector('.page-header button');
        if (addBtn) addBtn.onclick = () => showToast('Staff onboarding modal', 'info');
    }

    function renderBookingTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = MOCK_DATA.shipments.map(s => `
            <tr>
                <td>${s.id.replace('MX', 'BK')}</td>
                <td>${s.customer}</td>
                <td>${s.origin}</td>
                <td>${s.date}</td>
                <td><span class="status-badge status-warn">Pending</span></td>
                <td>
                    <button class="app-btn" style="color:var(--success); border:none; background:none; cursor:pointer; font-weight:600;">Approve</button>
                    <button class="rej-btn" style="color:var(--status-error); border:none; background:none; cursor:pointer; font-weight:600; margin-left:10px;">Reject</button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.app-btn').forEach(btn => btn.onclick = () => showToast('Booking Approved', 'success'));
        tbody.querySelectorAll('.rej-btn').forEach(btn => btn.onclick = () => showToast('Booking Rejected', 'error'));
    }

    function renderAuditLogs() {
        const logs = [
            { timestamp: 'Oct 24, 14:32:01', user: 'admin@movex.com', action: 'Updated System Settings', ip: '192.168.1.1', status: 'Success' },
            { timestamp: 'Oct 24, 14:05:22', user: 'john.doe@franchise.com', action: 'Login Attempt', ip: '10.0.0.52', status: 'Failed' },
            { timestamp: 'Oct 24, 13:55:00', user: 'system', action: 'Cron Job: Invoice Gen', ip: 'localhost', status: 'Success' }
        ];
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-family: monospace;">${l.timestamp}</td>
                <td>${l.user}</td>
                <td>${l.action}</td>
                <td style="font-family: monospace;">${l.ip}</td>
                <td><span class="status-badge status-${l.status === 'Success' ? 'active' : 'error'}">${l.status}</span></td>
            </tr>
        `).join('');
    }

    function initCustomSelects() {
        const selects = document.querySelectorAll('select:not(.custom-initialized)');
        selects.forEach(select => {
            select.classList.add('custom-initialized');
            select.style.display = 'none';

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';

            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.innerHTML = `<span>${select.options[select.selectedIndex].text}</span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`;

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-options';

            Array.from(select.options).forEach((option, index) => {
                const opt = document.createElement('div');
                opt.className = `custom-option ${index === select.selectedIndex ? 'selected' : ''}`;
                opt.textContent = option.text;
                opt.onclick = () => {
                    select.selectedIndex = index;
                    trigger.querySelector('span').textContent = option.text;
                    optionsContainer.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    wrapper.classList.remove('open');
                    select.dispatchEvent(new Event('change'));
                };
                optionsContainer.appendChild(opt);
            });

            trigger.onclick = (e) => {
                e.stopPropagation();
                const wasOpen = wrapper.classList.contains('open');

                // Close all other dropdowns
                document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                    w.classList.remove('open');
                    w.closest('.card')?.classList.remove('has-open-dropdown');
                });

                if (!wasOpen) {
                    wrapper.classList.add('open');
                    wrapper.closest('.card')?.classList.add('has-open-dropdown');
                }
            };

            wrapper.appendChild(trigger);
            wrapper.appendChild(optionsContainer);
            select.parentNode.insertBefore(wrapper, select);
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                w.classList.remove('open');
                w.closest('.card')?.classList.remove('has-open-dropdown');
            });
        });
    }

    // Auto-init if on shipments page and not initialized
    if (window.location.href.includes('shipments.html')) {
        setTimeout(() => {
            const tbody = document.querySelector('.data-table tbody');
            // If table is empty (or has only placeholders), force render
            if (tbody && tbody.children.length < 3) {
                renderShipmentTable();
            }
        }, 300);
    }

    return {
        init: function (page) {
            console.log('MoveX Core: Initializing', page);

            // Apply page fade-in
            const container = document.querySelector('.dashboard-container');
            if (container) {
                container.classList.add('page-fade-in');
            }

            if (initializers[page]) {
                initializers[page]();
            }

            // Initialize custom UI elements
            initCustomSelects();

            // Initialize Flatpickr for any date inputs
            if (window.flatpickr) {
                const dateInputs = document.querySelectorAll('input[type="date"]');
                dateInputs.forEach(input => {
                    // Change type to text to prevent native UI clash
                    input.type = 'text';
                    input.placeholder = 'Select Date...';
                    const fp = window.flatpickr(input, {
                        dateFormat: "Y-m-d",
                        animate: true,
                        position: "auto",
                        static: false,
                        clickOpens: false, // Manual control to prevent loops
                        onOpen: (selectedDates, dateStr, instance) => {
                            instance.element.closest('.card')?.classList.add('has-open-dropdown');
                        },
                        onClose: (selectedDates, dateStr, instance) => {
                            instance.element.closest('.card')?.classList.remove('has-open-dropdown');
                        }
                    });

                    // True toggle behavior
                    input.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (fp.isOpen) {
                            fp.close();
                        } else {
                            fp.open();
                        }
                    });
                });
            } else {
                setTimeout(() => {
                    if (window.flatpickr) window.MoveXAdmin.init(page);
                }, 800);
            }
        },
        toast: showToast,
        modal: createModal
    };

})();
