import { generateQuotationPdf } from './dist/src/sales/quotations/utils/pdf-generator.js';
import fs from 'fs';

const mockQuotation = {
  id: '123',
  quotationNumber: 'QUO-2026-00001',
  quotationDate: '2026-04-06',
  validUntil: '2026-05-06',
  customerName: 'John Smith',
  customerPhone: '0701234567',
  subtotal: '2250.00',
  discountAmount: '112.50',
  taxAmount: '225.00',
  totalAmount: '2362.50',
  items: [
    {
      productName: 'Cement Bag 50kg',
      quantity: '50',
      unitPrice: '450.00',
      discountPercentage: '5',
      taxRate: '10',
      lineTotal: '2362.50',
    },
  ],
};

const shopInfo = {
  shopName: 'ABC Hardware',
  address: '123 Main Street, Colombo 3',
  phone: '0112 345 678',
  email: 'info@abchardware.com',
  vatRegistrationNumber: 'VAT-LK-123456789',
};

generateQuotationPdf(mockQuotation, { shopInfo })
  .then((pdfBuffer) => {
    fs.writeFileSync('quotation-test.pdf', pdfBuffer);
    console.log('✅ PDF generated successfully!');
    console.log(`📄 File size: ${pdfBuffer.length} bytes`);
    console.log('📁 Saved as: quotation-test.pdf');
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
  });
