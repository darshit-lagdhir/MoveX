-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Seed Data
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Populate Serviceable Cities
INSERT INTO serviceable_cities (name) VALUES
    ('Mumbai, MH'), ('Delhi, NCR'), ('Bangalore, KA'), ('Hyderabad, TS'), ('Ahmedabad, GJ'), 
    ('Chennai, TN'), ('Kolkata, WB'), ('Surat, GJ'), ('Pune, MH'), ('Jaipur, RJ'),
    ('Lucknow, UP'), ('Kanpur, UP'), ('Nagpur, MH'), ('Indore, MP'), ('Thane, MH'), 
    ('Bhopal, MP'), ('Visakhapatnam, AP'), ('Pimpri-Chinchwad, MH'), ('Patna, BR'), 
    ('Vadodara, GJ'), ('Ghaziabad, UP'), ('Ludhiana, PB'), ('Agra, UP'), ('Nashik, MH'), 
    ('Faridabad, HR'), ('Meerut, UP'), ('Rajkot, GJ'), ('Kalyan-Dombivli, MH'), 
    ('Vasai-Virar, MH'), ('Varanasi, UP'), ('Srinagar, JK'), ('Aurangabad, MH'), 
    ('Dhanbad, JH'), ('Amritsar, PB'), ('Navi Mumbai, MH'), ('Allahabad, UP'), 
    ('Howrah, WB'), ('Ranchi, JH'), ('Gwalior, MP'), ('Jabalpur, MP'), ('Coimbatore, TN'), 
    ('Vijayawada, AP'), ('Jodhpur, RJ'), ('Madurai, TN'), ('Raipur, CT'), ('Chandigarh, CH'), 
    ('Guwahati, AS'), ('Solapur, MH'), ('Hubli-Dharwad, KA'), ('Mysore, KA'), 
    ('Tiruchirappalli, TN'), ('Bareilly, UP'), ('Aligarh, UP'), ('Tiruppur, TN'), 
    ('Gurgaon, HR'), ('Moradabad, UP'), ('Jalandhar, PB'), ('Bhubaneswar, OR'), ('Salem, TN'), 
    ('Warangal, TS'), ('Mira-Bhayandar, MH'), ('Thiruvananthapuram, KL'), ('Bhiwandi, MH'), 
    ('Saharanpur, UP'), ('Guntur, AP'), ('Amravati, MH'), ('Bikaner, RJ'), ('Noida, UP'), 
    ('Jamshedpur, JH'), ('Bhilai, CT'), ('Cuttack, OR'), ('Firozabad, UP'), ('Kochi, KL'), 
    ('Nellore, AP'), ('Bhavnagar, GJ'), ('Dehradun, UK'), ('Durgapur, WB'), ('Asansol, WB'), 
    ('Rourkela, OR'), ('Nanded, MH'), ('Kolhapur, MH'), ('Ajmer, RJ'), ('Akola, MH'), 
    ('Gulbarga, KA'), ('Jamnagar, GJ'), ('Ujjain, MP'), ('Loni, UP'), ('Siliguri, WB'), 
    ('Jhansi, UP'), ('Ulhasnagar, MH'), ('Jammu, JK'), ('Sangli-Miraj & Kupwad, MH'), 
    ('Mangalore, KA'), ('Erode, TN'), ('Belgaum, KA'), ('Ambattur, TN'), ('Tirunelveli, TN'), 
    ('Malegaon, MH'), ('Gaya, BR'), ('Jalgaon, MH'), ('Udaipur, RJ'), ('Maheshtala, WB')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Default HQ Organization (if not exists)
INSERT INTO organizations (name, type, status, full_address)
VALUES ('MoveX HQ', 'admin', 'active', 'Main Headquarters, Mumbai')
ON CONFLICT DO NOTHING;
