/*
BEGIN;


-- Reference tables, Initial values -- 
INSERT INTO roles (name, description) 
  VALUES
    ('admin', 'Full access to all system features'),
    ('standard', 'Limited access to own transactions and summaries');



INSERT INTO categories (name, description, created_at) 
  VALUES
    ('Operating Overhead', 'Miscellaneous expenses (rent, electricity, internet, water) // daily cost', NOW()),
    ('Inventory & Supplies', 'Consumables and short-term items (food & beverages for resale, cleaning supplies, stock peripherals)', NOW()),
    ('Salary', 'Payments to employees (technicians, staff, attendants)', NOW()),
    ('Equipment & Assets', 'Long-term investments (new computers, upgrades, gaming chairs, routers/switches)', NOW()),
    ('Marketing & Advertising', 'Social media ads, outdoor banners, promotional events', NOW());








INSERT INTO users (email, password_hash, role_id) 
  VALUES
    ('edri.a.marinas@gmail.com', '$2b$12$HnnCdwcHMnR2SxDsIgJ1QO9LfNvkAuS5hQ..Di4FThpNryMTvH89G
', 1);


COMMIT;
*/