document.addEventListener('DOMContentLoaded', () => {
  updateTime();
  setInterval(updateTime, 60000);
  
  loadTables();
  setupSSE();
});

function updateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  document.getElementById('current-datetime').textContent = now.toLocaleDateString('en-IN', options);
}

async function loadTables() {
  try {
    const res = await fetch('/api/tables');
    const tables = await res.json();
    renderTables(tables);
    updateStats(tables);
  } catch (error) {
    console.error('Error loading tables:', error);
    document.getElementById('tables-grid').innerHTML = '<div class="col-span-full text-center text-red-500 py-8">Failed to load tables</div>';
  }
}

function updateStats(tables) {
  let empty = 0, occupied = 0, attention = 0;
  tables.forEach(t => {
    if (t.status === 'empty') empty++;
    else if (t.status === 'occupied') occupied++;
    else if (t.status === 'needs_attention') attention++;
  });
  
  document.getElementById('stat-empty').textContent = empty;
  document.getElementById('stat-occupied').textContent = occupied;
  document.getElementById('stat-attention').textContent = attention;
}

function renderTables(tables) {
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = '';
  
  tables.forEach(table => {
    const isOccupied = table.status !== 'empty';
    const borderClass = table.status === 'empty' ? 'table-border-empty' : 
                        table.status === 'occupied' ? 'table-border-occupied' : 'table-border-attention';
    const badgeClass = table.status === 'empty' ? 'badge-empty' : 
                       table.status === 'occupied' ? 'badge-occupied' : 'badge-attention';
    const statusText = table.status.replace('_', ' ');

    const html = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 ${borderClass} table-card flex flex-col h-full overflow-hidden cursor-pointer" onclick="handleTableClick('${table.id}', '${table.status}')">
        <div class="p-4 flex justify-between items-start border-b border-gray-50 bg-gray-50/50">
          <div>
            <span class="text-xs text-gray-500 uppercase font-bold tracking-wider">Table</span>
            <h3 class="text-3xl font-bold text-cafe-dark leading-none">${table.table_number}</h3>
          </div>
          <span class="text-[10px] uppercase font-bold px-2 py-1 rounded-md ${badgeClass}">${statusText}</span>
        </div>
        
        <div class="p-4 flex-1 flex flex-col justify-center">
          ${isOccupied ? `
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-500"><i class="fa-solid fa-receipt mr-1"></i> Orders:</span>
              <span class="font-bold text-gray-800">${table.order_count || 0}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-500"><i class="fa-solid fa-indian-rupee-sign mr-1"></i> Total:</span>
              <span class="font-bold text-cafe-accent text-lg">₹${(table.running_total || 0).toFixed(2)}</span>
            </div>
          ` : `
            <div class="text-center text-gray-400 py-2">
              <i class="fa-solid fa-chair text-3xl mb-2 opacity-50"></i>
              <p class="text-sm">Available</p>
            </div>
          `}
        </div>
        
        ${isOccupied ? `
          <div class="bg-gray-50 p-2 flex gap-1 border-t border-gray-100">
            <button onclick="event.stopPropagation(); window.location.href='/admin/billing?tableId=${table.id}'" class="flex-1 py-1.5 bg-white border border-gray-200 text-xs font-medium text-cafe-dark rounded hover:bg-gray-100 transition-colors">Bill</button>
            <button onclick="event.stopPropagation(); resetTable('${table.id}')" class="flex-1 py-1.5 bg-red-50 text-xs font-medium text-red-600 rounded hover:bg-red-100 transition-colors">Reset</button>
          </div>
        ` : ''}
      </div>
    `;
    grid.innerHTML += html;
  });
}

function handleTableClick(tableId, status) {
  if (status !== 'empty') {
    window.location.href = `/admin/billing?tableId=${tableId}`;
  }
}

async function resetTable(id) {
  if (!confirm('Are you sure you want to reset this table? This will clear its current session.')) return;
  
  try {
    const res = await fetch(`/api/tables/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'empty' })
    });
    
    if (res.ok) {
      showToast('Table reset successfully', 'success');
      loadTables(); // Reload
    } else {
      showToast('Failed to reset table', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

function setupSSE() {
  const evtSource = new EventSource('/api/sse/orders');
  
  evtSource.addEventListener('table_update', (e) => {
    loadTables(); // Refresh entire grid for simplicity on update
  });
  
  evtSource.addEventListener('new_order', (e) => {
    loadTables(); // Update order counts/totals
    showToast('New order received!', 'info');
    // Optional: play sound
  });

  evtSource.onerror = () => {
    console.error('SSE Connection lost. Reconnecting...');
  };
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle';
  
  toast.className = `flex items-center gap-3 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg toast-enter`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span class="font-medium text-sm">${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
