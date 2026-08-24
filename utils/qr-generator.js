const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const mkdirAsync = promisify(fs.mkdir);

const generateQRCodes = async (baseUrl, totalTables) => {
  const qrDir = path.join(__dirname, '..', 'qr-codes');
  if (!fs.existsSync(qrDir)) {
    await mkdirAsync(qrDir, { recursive: true });
  }

  const results = [];

  for (let i = 1; i <= totalTables; i++) {
    const url = `${baseUrl}/order/${i}`;
    const filePath = path.join(qrDir, `table-${i}.png`);
    
    await QRCode.toFile(filePath, url, {
      width: 400,
      margin: 2
    });

    results.push({
      tableNumber: i,
      filePath,
      url
    });
  }

  return results;
};

const generateQRDataURL = async (url) => {
  return await QRCode.toDataURL(url);
};

module.exports = {
  generateQRCodes,
  generateQRDataURL
};
