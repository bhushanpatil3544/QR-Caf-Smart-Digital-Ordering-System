const calculateBill = (orderItems, discountPercent = 0, taxPercent = 5) => {
  let subtotal = 0;
  
  orderItems.forEach(item => {
    subtotal += (item.price_at_order * item.quantity);
  });

  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const total = taxableAmount + taxAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

module.exports = {
  calculateBill
};
