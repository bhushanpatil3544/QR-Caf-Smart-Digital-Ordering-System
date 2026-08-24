document.addEventListener('DOMContentLoaded', () => {
  const state = {
    menu: { categories: [], items: [] },
    cart: [],
    orders: [],
    sessionId: null,
    tableId: typeof TABLE_ID !== 'undefined' ? TABLE_ID : null,
    tableNumber: typeof TABLE_NUMBER !== 'undefined' ? TABLE_NUMBER : null,
    bill: null
  };

  const DOM = {
    categoryList: document.getElementById('category-list'),
    menuContainer: document.getElementById('menu-container'),
    cartSummaryBar: document.getElementById('cart-summary-bar'),
    cartItemCount: document.getElementById('cart-item-count'),
    cartTotal: document.getElementById('cart-total'),
    viewCartBtn: document.getElementById('view-cart-btn'),
    cartPanel: document.getElementById('cart-panel'),
    closeCartBtn: document.getElementById('close-cart-btn'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartTax: document.getElementById('cart-tax'),
    cartGrandTotal: document.getElementById('cart-grand-total'),
    placeOrderBtn: document.getElementById('place-order-btn'),
    customerNote: document.getElementById('customer-note'),
    previousOrdersSection: document.getElementById('previous-orders-section'),
    ordersList: document.getElementById('orders-list'),
    sessionTotal: document.getElementById('session-total'),
    callWaiterBtn: document.getElementById('call-waiter-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    toastIcon: document.getElementById('toast-icon'),
    viewBillBtn: document.getElementById('view-bill-btn'),
    billModal: document.getElementById('bill-modal'),
    closeBillBtn: document.getElementById('close-bill-btn'),
    billContent: document.getElementById('bill-content')
  };

  async function init() {
    if (!state.tableId) return;
    loadLocalSession();
    bindEvents();
    await fetchTableData();
    await fetchMenu();
    setupIntersectionObserver();
    if (state.sessionId) {
      fetchOrders();
      setInterval(fetchOrders, 30000); // Auto-refresh orders every 30s
    }
    renderCartUI();
  }

  function loadLocalSession() {
    const savedSession = localStorage.getItem(`cafe_session_table_${state.tableId}`);
    if (savedSession) {
      state.sessionId = savedSession;
    }
    const savedCart = localStorage.getItem(`cafe_cart_table_${state.tableId}`);
    if (savedCart) {
      try {
        state.cart = JSON.parse(savedCart);
      } catch (e) {
        state.cart = [];
      }
    }
  }

  function saveLocalCart() {
    localStorage.setItem(`cafe_cart_table_${state.tableId}`, JSON.stringify(state.cart));
  }

  function saveLocalSession() {
    if (state.sessionId) {
      localStorage.setItem(`cafe_session_table_${state.tableId}`, state.sessionId);
    }
  }

  async function fetchTableData() {
    try {
      const res = await fetch(`/api/tables/${state.tableId}`);
      if (res.ok) {
        const data = await res.json();
        const tableData = data.table || data;
        if (tableData.session_id && tableData.session_id !== state.sessionId) {
          state.sessionId = tableData.session_id;
          saveLocalSession();
          state.cart = []; // new session, clear old cart
          saveLocalCart();
        }
      }
    } catch (e) {
      console.error('Error fetching table data:', e);
    }
  }

  async function fetchMenu() {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        state.menu = data;
        renderMenu();
        renderCategoryNav();
      } else {
        showToast('Failed to load menu', 'error');
      }
    } catch (e) {
      showToast('Network error loading menu', 'error');
    }
  }

  function renderCategoryNav() {
    DOM.categoryList.innerHTML = state.menu.categories.map(cat => `
      <li>
        <a href="#category-${cat.id}" class="category-pill inline-block px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200" data-target="category-${cat.id}">
          ${cat.name}
        </a>
      </li>
    `).join('');

    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('data-target');
        const target = document.getElementById(targetId);
        if (target) {
          const headerOffset = 120;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      });
    });
  }

  function renderMenu() {
    let html = '';
    state.menu.categories.forEach(cat => {
      const items = state.menu.items.filter(item => item.category_id === cat.id);
      if (items.length === 0) return;

      html += `<div id="category-${cat.id}" class="category-section mb-8 pt-4">
        <h3 class="text-xl font-bold text-cafe-dark mb-4 border-b border-gray-200 pb-2">${cat.name}</h3>
        <div class="space-y-4">`;
      
      items.forEach(item => {
        const cartItem = state.cart.find(c => c.menuItemId === item.id);
        const qty = cartItem ? cartItem.quantity : 0;
        
        html += `
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 ${!item.available ? 'opacity-50 grayscale' : ''}">
            ${item.image_url ? `<img src="${item.image_url}" class="w-20 h-20 object-cover rounded-lg">` : ''}
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start">
                  <h4 class="font-bold text-gray-800 leading-tight">${item.name}</h4>
                  ${!item.available ? `<span class="text-xs text-red-500 font-bold bg-red-50 px-1 rounded">Sold Out</span>` : ''}
                </div>
                <p class="text-xs text-gray-500 mt-1 line-clamp-2">${item.description || ''}</p>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="font-bold text-cafe-medium">₹${parseFloat(item.price).toFixed(2)}</span>
                ${item.available ? `
                  <div class="menu-item-controls" id="menu-controls-${item.id}">
                    ${qty > 0 ? `
                      <div class="flex items-center space-x-3 bg-cafe-cream rounded-full px-2 py-1">
                        <button class="w-6 h-6 flex items-center justify-center rounded-full bg-white text-cafe-dark shadow-sm active:bg-gray-100" onclick="updateCart(${item.id}, -1)">
                          <i class="fa-solid fa-minus text-xs"></i>
                        </button>
                        <span class="font-bold text-sm w-4 text-center">${qty}</span>
                        <button class="w-6 h-6 flex items-center justify-center rounded-full bg-cafe-dark text-white shadow-sm active:bg-gray-800" onclick="updateCart(${item.id}, 1)">
                          <i class="fa-solid fa-plus text-xs"></i>
                        </button>
                      </div>
                    ` : `
                      <button class="w-8 h-8 rounded-full bg-cafe-cream text-cafe-dark shadow-sm flex items-center justify-center active:bg-cafe-light transition-colors" onclick="updateCart(${item.id}, 1)">
                        <i class="fa-solid fa-plus"></i>
                      </button>
                    `}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });
      html += `</div></div>`;
    });
    DOM.menuContainer.innerHTML = html;
  }

  window.updateCart = function(menuItemId, change) {
    if (navigator.vibrate) navigator.vibrate(50);

    const item = state.menu.items.find(i => i.id === menuItemId);
    if (!item || !item.available) return;

    const existingIdx = state.cart.findIndex(c => c.menuItemId === menuItemId);
    
    if (existingIdx > -1) {
      state.cart[existingIdx].quantity += change;
      if (state.cart[existingIdx].quantity <= 0) {
        state.cart.splice(existingIdx, 1);
      }
    } else if (change > 0) {
      state.cart.push({
        menuItemId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: change,
        notes: ''
      });
    }

    saveLocalCart();
    renderMenu(); // Re-render to update controls
    renderCartUI();
    if (!DOM.cartPanel.classList.contains('hidden-panel')) {
      renderCartPanel();
    }
  };

  window.updateItemNote = function(menuItemId, note) {
    const item = state.cart.find(c => c.menuItemId === menuItemId);
    if (item) {
      item.notes = note;
      saveLocalCart();
    }
  }

  function renderCartUI() {
    const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalQty > 0) {
      DOM.cartItemCount.textContent = totalQty;
      DOM.cartTotal.textContent = totalAmount.toFixed(2);
      
      DOM.cartSummaryBar.classList.remove('translate-y-full');
      DOM.cartItemCount.parentElement.classList.add('cart-badge');
      setTimeout(() => DOM.cartItemCount.parentElement.classList.remove('cart-badge'), 300);
    } else {
      DOM.cartSummaryBar.classList.add('translate-y-full');
      closeCartPanel();
    }
  }

  function openCartPanel() {
    renderCartPanel();
    DOM.cartPanel.classList.remove('hidden-panel');
    // slight delay to allow display:block to apply before animating transform
    setTimeout(() => {
      DOM.cartPanel.classList.remove('translate-y-full');
    }, 10);
  }

  function closeCartPanel() {
    DOM.cartPanel.classList.add('translate-y-full');
    setTimeout(() => {
      DOM.cartPanel.classList.add('hidden-panel');
    }, 300);
  }

  function renderCartPanel() {
    if (state.cart.length === 0) return;

    let html = '';
    let subtotal = 0;
    
    state.cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      html += `
        <div class="bg-white rounded-xl p-3 mb-3 shadow-sm border border-gray-100 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <div class="font-bold text-sm text-gray-800">${item.name}</div>
            <div class="font-bold text-cafe-medium text-sm">₹${itemTotal.toFixed(2)}</div>
          </div>
          <div class="flex justify-between items-center">
            <input type="text" placeholder="Add note (optional)" value="${item.notes || ''}" 
                   class="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 w-1/2 outline-none focus:border-cafe-medium"
                   onchange="updateItemNote(${item.menuItemId}, this.value)">
            <div class="flex items-center space-x-3 bg-cafe-cream rounded-full px-2 py-1">
              <button class="w-6 h-6 flex items-center justify-center rounded-full bg-white text-cafe-dark shadow-sm active:bg-gray-100" onclick="updateCart(${item.menuItemId}, -1)">
                <i class="fa-solid fa-minus text-xs"></i>
              </button>
              <span class="font-bold text-sm w-4 text-center">${item.quantity}</span>
              <button class="w-6 h-6 flex items-center justify-center rounded-full bg-cafe-dark text-white shadow-sm active:bg-gray-800" onclick="updateCart(${item.menuItemId}, 1)">
                <i class="fa-solid fa-plus text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    DOM.cartItemsContainer.innerHTML = html;
    
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    DOM.cartSubtotal.textContent = subtotal.toFixed(2);
    DOM.cartTax.textContent = tax.toFixed(2);
    DOM.cartGrandTotal.textContent = total.toFixed(2);
  }

  async function placeOrder() {
    if (state.cart.length === 0) return;
    
    DOM.placeOrderBtn.disabled = true;
    DOM.placeOrderBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    const orderData = {
      table_id: state.tableId,
      customer_note: DOM.customerNote.value,
      items: state.cart.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes
      }))
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const order = await res.json();
        
        state.cart = [];
        saveLocalCart();
        DOM.customerNote.value = '';
        
        if (order.session_id) {
          state.sessionId = order.session_id;
          saveLocalSession();
        }

        closeCartPanel();
        renderMenu();
        renderCartUI();
        showToast('Order placed successfully!', 'success');
        
        fetchOrders();
        if (!window.orderRefreshInterval) {
          window.orderRefreshInterval = setInterval(fetchOrders, 30000);
        }
      } else {
        showToast('Failed to place order', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      DOM.placeOrderBtn.disabled = false;
      DOM.placeOrderBtn.innerHTML = '<span>Place Order</span>';
    }
  }

  async function fetchOrders() {
    if (!state.sessionId) return;
    
    try {
      const res = await fetch(`/api/orders?table_id=${state.tableId}&session_id=${state.sessionId}`);
      if (res.ok) {
        const orders = await res.json();
        state.orders = orders;
        renderOrders();
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    }
  }

  function renderOrders() {
    if (state.orders.length === 0) {
      DOM.previousOrdersSection.classList.add('hidden');
      return;
    }

    DOM.previousOrdersSection.classList.remove('hidden');
    
    let totalSpent = 0;
    let html = '';

    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      served: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    state.orders.forEach(order => {
      let orderTotal = 0;
      if (order.items) {
        orderTotal = order.items.reduce((sum, item) => sum + ((item.price_at_order || item.price || 0) * item.quantity), 0);
      }
      totalSpent += orderTotal;
      
      const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const statusBadgeClass = statusColors[order.status] || 'bg-gray-100 text-gray-800';

      html += `
        <div class="border border-gray-100 rounded-lg p-3 mb-3 text-sm">
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-gray-700">Order #${order.id} <span class="text-gray-400 font-normal text-xs ml-1">${timeStr}</span></span>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass} uppercase">${order.status}</span>
          </div>
          <ul class="text-gray-600 space-y-1 mb-2">
            ${order.items ? order.items.map(item => `
              <li class="flex justify-between">
                <span>${item.quantity}x ${item.item_name || item.name}</span>
                <span>₹${((item.price_at_order || item.price) * item.quantity).toFixed(2)}</span>
              </li>
            `).join('') : '<li>Items hidden</li>'}
          </ul>
          <div class="text-right font-bold text-cafe-medium">₹${orderTotal.toFixed(2)}</div>
        </div>
      `;
    });

    DOM.ordersList.innerHTML = html;
    DOM.sessionTotal.textContent = totalSpent.toFixed(2);
  }

  async function callWaiter() {
    DOM.callWaiterBtn.disabled = true;
    DOM.callWaiterBtn.classList.add('opacity-50');

    try {
      const res = await fetch(`/api/tables/${state.tableId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_attention' })
      });

      if (res.ok) {
        showToast('Waiter called. We will be right there!', 'success');
      } else {
        showToast('Could not call waiter. Please try again.', 'error');
        DOM.callWaiterBtn.disabled = false;
        DOM.callWaiterBtn.classList.remove('opacity-50');
        return;
      }
    } catch (e) {
      showToast('Network error', 'error');
      DOM.callWaiterBtn.disabled = false;
      DOM.callWaiterBtn.classList.remove('opacity-50');
      return;
    }

    // Cooldown 60s
    let timeLeft = 60;
    const originalIcon = DOM.callWaiterBtn.innerHTML;
    const timer = setInterval(() => {
      DOM.callWaiterBtn.innerHTML = `<span class="text-sm font-bold">${timeLeft}s</span>`;
      timeLeft--;
      if (timeLeft < 0) {
        clearInterval(timer);
        DOM.callWaiterBtn.disabled = false;
        DOM.callWaiterBtn.classList.remove('opacity-50');
        DOM.callWaiterBtn.innerHTML = originalIcon;
      }
    }, 1000);
  }

  async function viewBill() {
    DOM.billContent.innerHTML = '<div class="flex flex-col items-center justify-center py-12"><i class="fa-solid fa-circle-notch fa-spin text-3xl text-cafe-medium mb-3"></i><p class="text-gray-500 text-sm">Loading bill...</p></div>';
    DOM.billModal.classList.remove('hidden-panel');
    try {
      const res = await fetch('/api/billing/' + state.tableId);
      if (!res.ok) {
        const errData = await res.json().catch(function() { return {}; });
        DOM.billContent.innerHTML = '<div class="flex flex-col items-center justify-center py-12"><i class="fa-solid fa-receipt text-4xl text-gray-300 mb-4"></i><p class="text-gray-600 font-semibold mb-1">No Bill Available</p><p class="text-gray-400 text-sm text-center">' + (errData.error || 'Place an order first to view your bill.') + '</p></div>';
        return;
      }
      const data = await res.json();
      const calc = data.calculation || {};
      const items = data.items || [];
      let html = '<div class="text-center mb-6"><h3 class="text-xl font-bold text-cafe-dark">Cafe Receipt</h3><p class="text-gray-500 text-sm">Table ' + state.tableNumber + '</p></div><div class="border-t border-b border-gray-200 py-3 mb-4 space-y-2">';
      if (items.length > 0) {
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var name = item.item_name || item.name || 'Item';
          var price = parseFloat(item.price_at_order || item.price || 0);
          var qty = item.quantity || 1;
          html += '<div class="flex justify-between text-sm"><span>' + qty + 'x ' + name + '</span><span>\u20b9' + (price * qty).toFixed(2) + '</span></div>';
        }
      } else {
        html += '<div class="text-center text-sm text-gray-500">No items found.</div>';
      }
      var subtotal = parseFloat(calc.subtotal || 0);
      var taxAmount = parseFloat(calc.taxAmount || 0);
      var discountAmount = parseFloat(calc.discountAmount || 0);
      var total = parseFloat(calc.total || 0);
      html += '</div><div class="space-y-1 text-sm"><div class="flex justify-between text-gray-600"><span>Subtotal</span><span>\u20b9' + subtotal.toFixed(2) + '</span></div>';
      if (discountAmount > 0) {
        html += '<div class="flex justify-between text-green-600"><span>Discount</span><span>-\u20b9' + discountAmount.toFixed(2) + '</span></div>';
      }
      html += '<div class="flex justify-between text-gray-600"><span>Tax (GST 5%)</span><span>\u20b9' + taxAmount.toFixed(2) + '</span></div>';
      html += '<div class="flex justify-between font-bold text-lg text-cafe-dark pt-2 mt-2 border-t border-gray-200"><span>Total</span><span>\u20b9' + total.toFixed(2) + '</span></div></div>';
      html += '<div class="mt-8 text-center text-xs text-gray-400">Thank you for visiting!</div>';
      DOM.billContent.innerHTML = html;
    } catch (e) {
      DOM.billContent.innerHTML = '<div class="flex flex-col items-center justify-center py-12"><i class="fa-solid fa-wifi text-4xl text-gray-300 mb-4"></i><p class="text-gray-600 font-semibold mb-1">Connection Error</p><p class="text-gray-400 text-sm">Please check your internet and try again.</p></div>';
    }
  }

  function showToast(message, type = 'info') {
    DOM.toastMessage.textContent = message;
    
    if (type === 'success') {
      DOM.toastIcon.innerHTML = '<i class="fa-solid fa-circle-check text-green-400"></i>';
    } else if (type === 'error') {
      DOM.toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation text-red-400"></i>';
    } else {
      DOM.toastIcon.innerHTML = '<i class="fa-solid fa-info-circle text-blue-400"></i>';
    }

    DOM.toast.classList.remove('opacity-0', 'pointer-events-none');
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      DOM.toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
  }

  function setupIntersectionObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '-130px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          document.querySelectorAll('.category-pill').forEach(pill => {
            if (pill.getAttribute('data-target') === id) {
              pill.classList.replace('bg-white', 'bg-cafe-dark');
              pill.classList.replace('text-gray-600', 'text-white');
              pill.classList.replace('border-gray-200', 'border-cafe-dark');
              pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
              pill.classList.replace('bg-cafe-dark', 'bg-white');
              pill.classList.replace('text-white', 'text-gray-600');
              pill.classList.replace('border-cafe-dark', 'border-gray-200');
            }
          });
        }
      });
    }, observerOptions);

    setTimeout(() => {
      document.querySelectorAll('.category-section').forEach(section => {
        observer.observe(section);
      });
    }, 500);
  }

  window.closeBillModal = function() {
    const modal = document.getElementById('bill-modal');
    if (modal) modal.classList.add('hidden-panel');
  };

  function bindEvents() {
    if (DOM.viewCartBtn) DOM.viewCartBtn.addEventListener('click', openCartPanel);
    if (DOM.closeCartBtn) DOM.closeCartBtn.addEventListener('click', closeCartPanel);
    if (DOM.placeOrderBtn) DOM.placeOrderBtn.addEventListener('click', placeOrder);
    if (DOM.callWaiterBtn) DOM.callWaiterBtn.addEventListener('click', callWaiter);
    if (DOM.viewBillBtn) DOM.viewBillBtn.addEventListener('click', viewBill);
    if (DOM.closeBillBtn) DOM.closeBillBtn.addEventListener('click', window.closeBillModal);
    
    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeBillModal();
        closeCartPanel();
      }
    });

    // Expose viewBill globally for inline onclick fallback
    window.viewBillFn = viewBill;
  }

  init();
});
