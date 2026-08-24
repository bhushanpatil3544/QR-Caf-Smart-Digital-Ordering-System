let allOrders = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  setupSSE();
  setupFilters();
  
  // Update times every minute
  setInterval(updateTimes, 60000);
});

async function loadOrders() {
  try {
    const res = await fetch('/api/orders/active');
    const data = await res.json();
    
    // Use the flat array directly
    allOrders = data;
    
    // Sort by created_at desc (newest first)
    allOrders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    renderOrders();
  } catch (error) {
    console.error('Failed to load orders:', error);
    document.getElementById('orders-grid').innerHTML = '<div class="col-span-full text-center text-red-500 py-8">Failed to load orders</div>';
  }
}

function setupFilters() {
  document.getElementById('order-filters').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      currentFilter = e.target.dataset.filter;
      
      // Update UI
      const buttons = document.getElementById('order-filters').querySelectorAll('button');
      buttons.forEach(b => {
        if (b.dataset.filter === currentFilter) {
          b.className = 'px-4 py-2 rounded-md text-sm font-medium bg-white shadow-sm text-cafe-dark';
        } else {
          b.className = 'px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-cafe-dark hover:bg-gray-200 transition-colors';
        }
      });
      
      renderOrders();
    }
  });
}

function renderOrders() {
  const grid = document.getElementById('orders-grid');
  grid.innerHTML = '';
  
  const filtered = currentFilter === 'all' 
    ? allOrders 
    : allOrders.filter(o => o.status === currentFilter);
    
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fa-solid fa-clipboard-check text-5xl mb-4 opacity-30"></i>
        <p class="text-lg">No ${currentFilter !== 'all' ? currentFilter : 'active'} orders at the moment.</p>
      </div>`;
    return;
  }
  
  filtered.forEach(order => {
    const timeAgo = getTimeAgo(order.created_at);
    
    // Determine badge colors based on status
    let badgeClass = '';
    let nextAction = '';
    let nextStatus = '';
    let btnClass = '';
    
    switch(order.status) {
      case 'pending': 
        badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        nextAction = 'Confirm Order';
        nextStatus = 'confirmed';
        btnClass = 'bg-yellow-500 hover:bg-yellow-600';
        break;
      case 'confirmed': 
        badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
        nextAction = 'Start Preparing';
        nextStatus = 'preparing';
        btnClass = 'bg-blue-500 hover:bg-blue-600';
        break;
      case 'preparing': 
        badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
        nextAction = 'Mark Served';
        nextStatus = 'served';
        btnClass = 'bg-green-500 hover:bg-green-600';
        break;
      default:
        badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
    }

    const itemsHtml = order.items.map(i => `
      <div class="flex justify-between py-2 border-b border-gray-50 last:border-0">
        <span class="text-sm font-medium text-gray-800"><span class="text-cafe-accent mr-1">${i.quantity}x</span> ${i.item_name}</span>
      </div>
    `).join('');

    const isNew = new Date() - new Date(order.created_at) < 30000; // < 30s old

    const html = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden ${isNew ? 'order-card-new border-cafe-accent ring-2 ring-cafe-accent/20' : ''}" data-order-id="${order.id}">
        <!-- Header -->
        <div class="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-baseline gap-2">
            <span class="text-sm text-gray-500 font-medium">Table</span>
            <span class="text-2xl font-black text-cafe-dark">${order.table_number}</span>
          </div>
          <div class="text-right flex flex-col items-end">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}">${order.status}</span>
            <span class="text-xs text-gray-400 mt-1 time-ago" data-time="${order.created_at}"><i class="fa-regular fa-clock"></i> ${timeAgo}</span>
          </div>
        </div>
        
        <!-- Items -->
        <div class="p-4 flex-1 bg-white">
          <div class="space-y-1 mb-4">
            ${itemsHtml}
          </div>
          ${order.customer_note ? `
            <div class="bg-amber-50 border border-amber-100 rounded p-2 mt-2">
              <span class="text-xs font-bold text-amber-800 uppercase block mb-1">Note</span>
              <p class="text-sm text-amber-900 italic">"${order.customer_note}"</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Actions -->
        ${order.status !== 'served' && order.status !== 'cancelled' ? `
          <div class="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <button onclick="updateStatus('${order.id}', '${nextStatus}')" class="flex-1 ${btnClass} text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
              ${nextAction}
            </button>
            ${order.status === 'pending' ? `
              <button onclick="updateStatus('${order.id}', 'cancelled')" class="px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors" title="Cancel Order">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
    grid.innerHTML += html;
  });
}

async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (res.ok) {
      showToast(`Order marked as ${newStatus}`, 'success');
      // Optimistic update
      const idx = allOrders.findIndex(o => o.id.toString() === orderId.toString());
      if (idx > -1) {
        allOrders[idx].status = newStatus;
        if(newStatus === 'served' || newStatus === 'cancelled') {
           // typically served/cancelled fall off the active list, let's just reload to be safe
           loadOrders();
        } else {
           renderOrders();
        }
      }
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

function setupSSE() {
  const evtSource = new EventSource('/api/sse/orders');
  
  evtSource.addEventListener('new_order', (e) => {
    showToast('New order received!', 'info');
    playSound();
    loadOrders(); // Reload to get fresh data
  });
  
  evtSource.addEventListener('order_status', (e) => {
    loadOrders();
  });
}

function playSound() {
  // subtle beep
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) { console.log('Audio not supported or auto-played blocked'); }
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000); // seconds
  if (diff < 60) return 'Just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function updateTimes() {
  document.querySelectorAll('.time-ago').forEach(el => {
    const time = el.dataset.time;
    if(time) {
      el.innerHTML = `<i class="fa-regular fa-clock"></i> ${getTimeAgo(time)}`;
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-cafe-accent';
  toast.className = `flex items-center gap-3 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg toast-enter`;
  toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span class="font-medium text-sm">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
