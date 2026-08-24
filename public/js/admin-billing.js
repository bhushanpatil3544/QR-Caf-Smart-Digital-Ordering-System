let currentTableId = null;
let currentBillData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if URL passed a tableId
  const urlParams = new URLSearchParams(window.location.search);
  const paramTableId = urlParams.get('tableId');
  const bodyTableId = document.body.dataset.tableId;
  
  currentTableId = paramTableId || bodyTableId || null;
  
  loadTables();
  
  if (currentTableId) {
    loadBill(currentTableId);
  }

  // Setup event listeners
  document.getElementById('btn-apply-discount').addEventListener('click', applyDiscount);
  document.getElementById('btn-generate').addEventListener('click', generateBill);
  document.getElementById('btn-pay').addEventListener('click', markPaid);
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  
  // Date for print
  document.getElementById('print-date').textContent = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
});

async function loadTables() {
  try {
    const res = await fetch('/api/tables');
    const tables = await res.json();
    
    // Only show occupied or needs_attention tables
    const activeTables = tables.filter(t => t.status !== 'empty');
    
    const container = document.getElementById('table-selector');
    container.innerHTML = '';
    
    if (activeTables.length === 0) {
      container.innerHTML = '<div class="col-span-2 text-center py-8 text-gray-500 text-sm">No active tables found.</div>';
      return;
    }
    
    activeTables.forEach(t => {
      const isSelected = t.id.toString() === currentTableId;
      const html = `
        <button onclick="selectTable('${t.id}')" class="p-4 border rounded-xl flex flex-col items-center justify-center transition-all ${isSelected ? 'border-cafe-accent bg-orange-50 ring-2 ring-cafe-accent/30' : 'border-gray-200 bg-white hover:border-cafe-medium hover:bg-gray-50'}">
          <span class="text-xs text-gray-500 uppercase font-bold mb-1">Table</span>
          <span class="text-2xl font-black ${isSelected ? 'text-cafe-accent' : 'text-cafe-dark'}">${t.table_number}</span>
          <span class="text-xs font-bold mt-2 ${t.status==='needs_attention'?'text-red-500': 'text-green-600'}">₹${(t.running_total||0).toFixed(2)}</span>
        </button>
      `;
      container.innerHTML += html;
    });
  } catch (error) {
    console.error('Error loading tables:', error);
  }
}

function selectTable(id) {
  // Update URL without reload
  const url = new URL(window.location);
  url.searchParams.set('tableId', id);
  window.history.pushState({}, '', url);
  
  currentTableId = id;
  loadTables(); // re-render selection state
  loadBill(id);
}

async function loadBill(tableId) {
  try {
    const res = await fetch(`/api/billing/${tableId}`);
    if (!res.ok) throw new Error('Failed to load bill');
    
    currentBillData = await res.json();
    renderBill();
    
    document.getElementById('no-table-selected').classList.add('hidden');
    document.getElementById('bill-view').classList.remove('hidden');
    
  } catch (err) {
    console.error(err);
    showToast('Failed to load bill data', 'error');
  }
}

function renderBill() {
  if (!currentBillData) return;
  
  const d = currentBillData;
  
  // Header
  document.getElementById('bill-table-number').textContent = d.table_number;
  document.getElementById('print-table-no').textContent = d.table_number;
  document.getElementById('bill-session-id').textContent = d.session_id || 'N/A';
  
  // Status badge
  const badge = document.getElementById('bill-status-badge');
  if (d.status === 'unpaid') {
    badge.textContent = 'Unpaid';
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800';
    document.getElementById('btn-generate').classList.remove('hidden');
    document.getElementById('btn-pay').classList.add('hidden');
  } else if (d.status === 'generated') {
    badge.textContent = 'Bill Generated';
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-800';
    document.getElementById('btn-generate').classList.add('hidden');
    document.getElementById('btn-pay').classList.remove('hidden');
  } else {
    badge.textContent = d.status;
  }
  
  // Items
  const tbody = document.getElementById('bill-items');
  tbody.innerHTML = '';
  
  if (d.items && d.items.length > 0) {
    d.items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      tbody.innerHTML += `
        <tr class="border-b border-gray-100 last:border-0">
          <td class="py-3 pr-2">
            <span class="font-medium text-gray-800 block">${item.name}</span>
            ${item.category_name ? `<span class="text-xs text-gray-400">${item.category_name}</span>` : ''}
          </td>
          <td class="py-3 text-center text-sm font-medium text-gray-600">${item.quantity}</td>
          <td class="py-3 text-right text-sm text-gray-500">₹${item.unit_price.toFixed(2)}</td>
          <td class="py-3 text-right text-sm font-bold text-gray-800">₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-gray-400">No items ordered yet.</td></tr>';
  }
  
  // Totals
  document.getElementById('bill-subtotal').textContent = (d.subtotal || 0).toFixed(2);
  
  if (d.discount_amount > 0) {
    document.getElementById('discount-row').classList.remove('hidden');
    document.getElementById('discount-percent').textContent = d.discount_percent;
    document.getElementById('bill-discount-amt').textContent = (d.discount_amount).toFixed(2);
  } else {
    document.getElementById('discount-row').classList.add('hidden');
  }
  
  document.getElementById('bill-tax').textContent = (d.tax_amount || 0).toFixed(2);
  document.getElementById('bill-total').textContent = (d.total_amount || 0).toFixed(2);
}

async function applyDiscount() {
  if (!currentBillData || !currentBillData.id) {
    showToast('Generate bill first to apply discount', 'error');
    return;
  }
  
  const pct = parseInt(document.getElementById('discount-input').value) || 0;
  
  try {
    const res = await fetch(`/api/billing/${currentBillData.id}/discount`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discount_percent: pct })
    });
    
    if (res.ok) {
      showToast('Discount applied', 'success');
      loadBill(currentTableId); // Reload fresh data
    } else {
      showToast('Failed to apply discount', 'error');
    }
  } catch (err) {
    showToast('Error applying discount', 'error');
  }
}

async function generateBill() {
  if (!currentTableId) return;
  
  try {
    const res = await fetch(`/api/billing/${currentTableId}/generate`, { method: 'POST' });
    if (res.ok) {
      showToast('Bill generated successfully', 'success');
      loadBill(currentTableId);
    } else {
      showToast('Failed to generate bill', 'error');
    }
  } catch(err) {
    showToast('Error generating bill', 'error');
  }
}

async function markPaid() {
  if (!currentTableId) return;
  
  if(!confirm('Mark this bill as paid and clear the table?')) return;
  
  try {
    const res = await fetch(`/api/billing/${currentTableId}/pay`, { method: 'POST' });
    if (res.ok) {
      showToast('Payment successful! Table cleared.', 'success');
      // Reset UI
      currentTableId = null;
      document.getElementById('bill-view').classList.add('hidden');
      document.getElementById('no-table-selected').classList.remove('hidden');
      // Clear URL
      window.history.pushState({}, '', '/admin/billing');
      loadTables();
    } else {
      showToast('Failed to process payment', 'error');
    }
  } catch(err) {
    showToast('Error processing payment', 'error');
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
