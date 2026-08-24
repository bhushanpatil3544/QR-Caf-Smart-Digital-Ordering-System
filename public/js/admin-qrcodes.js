document.addEventListener('DOMContentLoaded', () => {
  const baseUrlInput = document.getElementById('base-url');
  if (!baseUrlInput.value) {
    baseUrlInput.value = window.location.origin;
  }

  document.getElementById('btn-detect-url').addEventListener('click', () => {
    baseUrlInput.value = window.location.origin;
    generateAllQRCodes();
  });

  document.getElementById('btn-generate-all').addEventListener('click', generateAllQRCodes);
  document.getElementById('btn-print-all').addEventListener('click', () => window.print());
  
  // Generate initially if empty
  generateAllQRCodes();
});

function generateAllQRCodes() {
  const baseUrl = document.getElementById('base-url').value.replace(/\/$/, ''); // remove trailing slash
  const grid = document.getElementById('qr-grid');
  grid.innerHTML = '';
  
  // Generate for Tables 1 to 18
  for (let i = 1; i <= 18; i++) {
    const tableUrl = `${baseUrl}/order/${i}`;
    
    // Create card container
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center qr-print-card';
    
    // Header
    const header = document.createElement('div');
    header.className = 'mb-3';
    header.innerHTML = `
      <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Table</span>
      <h3 class="text-2xl font-black text-cafe-dark leading-none">${i}</h3>
    `;
    card.appendChild(header);
    
    // QR Code Container
    const qrContainer = document.createElement('div');
    qrContainer.id = `qr-table-${i}`;
    qrContainer.className = 'bg-white p-2 border border-gray-100 rounded-lg mb-3 qr-code-img';
    card.appendChild(qrContainer);
    
    // URL text
    const urlText = document.createElement('p');
    urlText.className = 'text-[10px] text-gray-400 font-mono break-all leading-tight px-2 mb-4 mt-auto hide-on-print';
    urlText.textContent = tableUrl;
    card.appendChild(urlText);
    
    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 hide-on-print';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
    downloadBtn.onclick = () => downloadQR(i);
    card.appendChild(downloadBtn);
    
    grid.appendChild(card);
    
    // Generate QR (using qrcodejs loaded via CDN)
    new QRCode(qrContainer, {
      text: tableUrl,
      width: 150,
      height: 150,
      colorDark : "#4A2C2A", // cafe dark
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
  }
}

function downloadQR(tableNum) {
  const container = document.getElementById(`qr-table-${tableNum}`);
  const img = container.querySelector('img');
  const canvas = container.querySelector('canvas');
  
  let dataUrl = '';
  if (img && img.src) {
    dataUrl = img.src;
  } else if (canvas) {
    dataUrl = canvas.toDataURL('image/png');
  }
  
  if (dataUrl) {
    const link = document.createElement('a');
    link.download = `table-${tableNum}-qr.png`;
    link.href = dataUrl;
    link.click();
  }
}
