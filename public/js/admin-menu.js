let menuItems = [];
let categories = [];
let currentCategoryFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Setup forms
  document.getElementById('item-form').addEventListener('submit', saveItem);
  document.getElementById('category-form').addEventListener('submit', saveCategory);
  
  // Setup tabs delegation
  document.getElementById('category-tabs').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      currentCategoryFilter = e.target.dataset.category;
      updateTabsUI();
      renderItems();
    }
  });
});

async function loadData() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    
    categories = data.categories || [];
    menuItems = data.items || [];
    
    renderTabs();
    populateCategoryDropdown();
    renderItems();
  } catch (error) {
    console.error('Error loading menu:', error);
    showToast('Failed to load menu data', 'error');
  }
}

function renderTabs() {
  const container = document.getElementById('category-tabs');
  // keep 'All' tab, remove rest
  container.innerHTML = `<button class="px-5 py-2 rounded-full font-medium shadow-sm transition-colors whitespace-nowrap" data-category="all">All Items</button>`;
  
  categories.sort((a,b) => a.sort_order - b.sort_order).forEach(c => {
    container.innerHTML += `<button class="px-5 py-2 rounded-full font-medium shadow-sm transition-colors whitespace-nowrap" data-category="${c.id}">${c.name}</button>`;
  });
  
  updateTabsUI();
}

function updateTabsUI() {
  const buttons = document.getElementById('category-tabs').querySelectorAll('button');
  buttons.forEach(b => {
    if (b.dataset.category === currentCategoryFilter) {
      b.className = 'px-5 py-2 rounded-full font-medium bg-cafe-dark text-white shadow-sm transition-colors whitespace-nowrap';
    } else {
      b.className = 'px-5 py-2 rounded-full font-medium bg-white text-gray-600 hover:bg-gray-100 shadow-sm border border-gray-200 transition-colors whitespace-nowrap';
    }
  });
}

function populateCategoryDropdown() {
  const select = document.getElementById('item-category');
  select.innerHTML = '<option value="">Select a category...</option>';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderItems() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';
  
  const filtered = currentCategoryFilter === 'all' 
    ? menuItems 
    : menuItems.filter(i => i.category_id.toString() === currentCategoryFilter);
    
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No items found in this category.</div>';
    return;
  }
  
  filtered.forEach(item => {
    const html = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md">
        <div class="p-5 flex-1">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-cafe-medium bg-cafe-cream px-2 py-1 rounded">${item.category_name || 'Uncategorized'}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium ${item.available ? 'text-green-600' : 'text-gray-400'}">${item.available ? 'Available' : 'Hidden'}</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" ${item.available ? 'checked' : ''} onchange="toggleAvailability('${item.id}', this.checked)">
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">${item.name}</h3>
          <p class="text-cafe-accent font-bold text-lg mb-2">₹${parseFloat(item.price).toFixed(2)}</p>
          <p class="text-sm text-gray-500 line-clamp-2">${item.description || ''}</p>
        </div>
        <div class="border-t border-gray-50 p-3 bg-gray-50/50 flex justify-end gap-2">
          <button onclick="editItem('${item.id}')" class="p-2 text-gray-500 hover:text-cafe-accent hover:bg-orange-50 rounded transition-colors"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteItem('${item.id}')" class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    grid.innerHTML += html;
  });
}

// Modals
function openItemModal(id = null) {
  const modal = document.getElementById('item-modal');
  const form = document.getElementById('item-form');
  const title = document.getElementById('item-modal-title');
  
  form.reset();
  document.getElementById('item-id').value = '';
  
  if (id) {
    const item = menuItems.find(i => i.id === id || i.id.toString() === id);
    if (item) {
      title.textContent = 'Edit Menu Item';
      document.getElementById('item-id').value = item.id;
      document.getElementById('item-name').value = item.name;
      document.getElementById('item-price').value = item.price;
      document.getElementById('item-category').value = item.category_id;
      document.getElementById('item-desc').value = item.description || '';
      document.getElementById('item-available').checked = item.available;
    }
  } else {
    title.textContent = 'Add Menu Item';
    if (currentCategoryFilter !== 'all') {
      document.getElementById('item-category').value = currentCategoryFilter;
    }
  }
  
  modal.classList.remove('hidden');
}

function closeItemModal() {
  document.getElementById('item-modal').classList.add('hidden');
}

function openCategoryModal() {
  document.getElementById('category-form').reset();
  document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
}

// API Actions
async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('item-id').value;
  const payload = {
    name: document.getElementById('item-name').value,
    price: parseFloat(document.getElementById('item-price').value),
    category_id: document.getElementById('item-category').value,
    description: document.getElementById('item-desc').value,
    available: document.getElementById('item-available').checked
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/menu/${id}` : '/api/menu';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Item saved successfully', 'success');
      closeItemModal();
      loadData();
    } else throw new Error('Failed to save');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteItem(id) {
  if(!confirm('Are you sure you want to delete this item?')) return;
  try {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    if(res.ok) {
      showToast('Item deleted', 'success');
      loadData();
    } else throw new Error('Failed to delete');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleAvailability(id, isAvailable) {
  try {
    const res = await fetch(`/api/menu/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: isAvailable })
    });
    if(!res.ok) throw new Error('Update failed');
    // update local state
    const item = menuItems.find(i => i.id.toString() === id.toString());
    if(item) item.available = isAvailable;
  } catch (err) {
    showToast(err.message, 'error');
    loadData(); // reload on error to sync state
  }
}

async function saveCategory(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('cat-name').value,
    sort_order: parseInt(document.getElementById('cat-order').value) || 0
  };
  try {
    const res = await fetch('/api/menu/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(res.ok) {
      showToast('Category added', 'success');
      closeCategoryModal();
      loadData();
    } else throw new Error('Failed to save');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  toast.className = `flex items-center gap-3 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg toast-enter`;
  toast.innerHTML = `<i class="fa-solid fa-info-circle"></i> <span class="font-medium text-sm">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
