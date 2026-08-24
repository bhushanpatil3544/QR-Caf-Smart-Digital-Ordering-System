const db = require('./database');

const seedData = () => {
  console.log('Starting seed process...');

  const categories = [
    { name: 'Beverages', sort: 1 },
    { name: 'Snacks', sort: 2 },
    { name: 'Main Course', sort: 3 },
    { name: 'Desserts', sort: 4 },
    { name: 'Specials', sort: 5 }
  ];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)');
  
  db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(cat.name, cat.sort);
    }
  })();

  const catMap = {};
  const catRows = db.prepare('SELECT id, name FROM categories').all();
  catRows.forEach(c => catMap[c.name] = c.id);

  const menuItems = [
    // Beverages
    { name: 'Masala Chai', desc: 'Classic Indian spiced tea', price: 40, cat: 'Beverages' },
    { name: 'Filter Coffee', desc: 'Traditional South Indian filter coffee', price: 50, cat: 'Beverages' },
    { name: 'Cold Coffee', desc: 'Creamy iced coffee', price: 120, cat: 'Beverages' },
    { name: 'Fresh Lime Soda', desc: 'Refreshing lime soda, sweet or salted', price: 60, cat: 'Beverages' },
    // Snacks
    { name: 'Samosa (2 pcs)', desc: 'Crispy pastry with spiced potato filling', price: 50, cat: 'Snacks' },
    { name: 'French Fries', desc: 'Crispy salted fries', price: 100, cat: 'Snacks' },
    { name: 'Paneer Tikka', desc: 'Grilled marinated cottage cheese', price: 180, cat: 'Snacks' },
    { name: 'Nachos with Salsa', desc: 'Crispy corn chips with fresh salsa', price: 150, cat: 'Snacks' },
    // Main Course
    { name: 'Veg Biryani', desc: 'Aromatic rice cooked with vegetables and spices', price: 220, cat: 'Main Course' },
    { name: 'Butter Chicken', desc: 'Creamy tomato gravy with chicken', price: 280, cat: 'Main Course' },
    { name: 'Margherita Pizza', desc: 'Classic tomato and basil pizza', price: 250, cat: 'Main Course' },
    { name: 'Penne Alfredo', desc: 'Pasta in creamy white sauce', price: 240, cat: 'Main Course' },
    // Desserts
    { name: 'Gulab Jamun (2 pcs)', desc: 'Deep fried milk solids in sugar syrup', price: 80, cat: 'Desserts' },
    { name: 'Chocolate Brownie', desc: 'Warm fudgy brownie with ice cream', price: 150, cat: 'Desserts' },
    { name: 'Rasmalai', desc: 'Soft paneer soaked in sweetened milk', price: 100, cat: 'Desserts' },
    { name: 'Ice Cream (2 Scoops)', desc: 'Vanilla, Chocolate or Strawberry', price: 90, cat: 'Desserts' },
    // Specials
    { name: 'Cafe Special Burger', desc: 'Double patty burger with extra cheese', price: 200, cat: 'Specials' },
    { name: 'Chef Special Pasta', desc: 'Mixed sauce pasta with exotic veggies', price: 280, cat: 'Specials' },
    { name: 'Monster Shake', desc: 'Heavy chocolate shake loaded with treats', price: 250, cat: 'Specials' },
    { name: 'Sizzler Platter', desc: 'Assorted veggies/meats served on a hot plate', price: 350, cat: 'Specials' }
  ];

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO menu_items (name, description, price, category_id)
    VALUES (?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const item of menuItems) {
      if (catMap[item.cat]) {
        insertItem.run(item.name, item.desc, item.price, catMap[item.cat]);
      }
    }
  })();

  console.log('Seeding complete.');
};

seedData();
