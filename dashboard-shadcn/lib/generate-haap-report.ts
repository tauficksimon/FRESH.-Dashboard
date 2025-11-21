import fs from 'fs/promises';
import path from 'path';

interface OrderRow {
  'Order ID': string;
  Customer: string;
  Total: number;
  'Final Cost': number;
  Profit: number;
  Express: number;
  'Revenue Net Tax'?: number;
  'Total after Credit Used'?: number;
  Summary?: string;
  'Items Summary'?: string;
  Notes?: string;
  Placed?: string;
  'Date Placed'?: string;
}

function formatCurrency(val: number): string {
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function loadLogo(): Promise<string> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    return `data:image/png;base64,${logoBase64}`;
  } catch (error) {
    console.warn('Could not load logo:', error);
    return '';
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCSV(csvContent: string): OrderRow[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: OrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';

      // Parse numbers for specific columns
      if (['Total', 'Final Cost', 'Profit', 'Express', 'Revenue Net Tax', 'Total after Credit Used'].includes(header)) {
        row[header] = parseFloat(value) || 0;
      } else {
        row[header] = value;
      }
    });

    rows.push(row as OrderRow);
  }

  return rows;
}

function filterByDateRange(orders: OrderRow[], startDate: string, endDate: string): OrderRow[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return orders.filter(order => {
    const orderDate = new Date(order.Placed || order['Date Placed'] || '');
    return orderDate >= start && orderDate <= end;
  });
}

export async function generateHAAPReport(
  startDate: string,
  endDate: string
): Promise<string> {
  // Load orders CSV
  const csvPath = path.join(process.cwd(), 'orders_ALL.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const allOrders = parseCSV(csvContent);

  // Filter by date range
  const orders = filterByDateRange(allOrders, startDate, endDate);

  if (orders.length === 0) {
    throw new Error(`No orders found for date range ${startDate} to ${endDate}`);
  }

  // Calculate summary stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o['Revenue Net Tax'] || o['Total after Credit Used'] || o.Total), 0);
  const totalCost = orders.reduce((sum, o) => sum + o['Final Cost'], 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.Profit, 0);
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  // Load logo
  const logoData = await loadLogo();

  // Generate table rows
  const tableRows = orders.map(order => {
    const isSpecial = (order.Notes || '').includes('450') || (order.Customer || '').includes('Camille Simon');
    const rowClass = isSpecial ? ' class="special"' : '';

    // Format express
    const expressVal = order.Express;
    const expressBadge = expressVal === 1 || expressVal === 1.0
      ? '<span class="express-badge express-yes">YES</span>'
      : '<span class="express-badge express-no">NO</span>';

    // Format items
    const itemsRaw = order.Summary || order['Items Summary'] || '';
    const itemsLines = itemsRaw.split('\n').filter(line => line.trim());
    const itemsHtml = itemsLines.join('<br>');

    // Format currency values
    const totalCharged = `$${order.Total.toFixed(2)}`;
    const haapCost = `$${order['Final Cost'].toFixed(2)}`;
    const profit = `$${order.Profit.toFixed(2)}`;

    // Calculate margin percentage for this order
    const revenueVal = order.Total || 0;
    const profitVal = order.Profit || 0;
    const margin = revenueVal > 0 ? (profitVal / revenueVal * 100) : 0;
    const marginPctStr = `${margin.toFixed(1)}%`;

    // Escape HTML
    const customer = escapeHtml(order.Customer || '');
    const notes = escapeHtml(order.Notes || '');

    // Format date
    const dateVal = order.Placed || order['Date Placed'] || '';

    return `
      <tr${rowClass}>
        <td class="order-id">${order['Order ID']}</td>
        <td class="date">${dateVal}</td>
        <td class="customer">${customer}</td>
        <td class="amount">${totalCharged}</td>
        <td class="amount">${haapCost}</td>
        <td class="amount">${profit}</td>
        <td class="amount">${marginPctStr}</td>
        <td>${expressBadge}</td>
        <td class="items">${itemsHtml}</td>
        <td class="notes">${notes}</td>
      </tr>
    `;
  }).join('\n');

  // Load template
  const templatePath = path.join(process.cwd(), 'templates', 'haap_verification_template.html');
  let template = await fs.readFile(templatePath, 'utf-8');

  // Replace template variables
  const title = `${startDate} to ${endDate}`;
  const generatedDate = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  template = template.replace(/\{\{TITLE\}\}/g, title);
  template = template.replace(/\{\{LOGO_DATA\}\}/g, logoData);
  template = template.replace(/\{\{GENERATED_DATE\}\}/g, generatedDate);
  template = template.replace(/\{\{TOTAL_ORDERS\}\}/g, totalOrders.toString());
  template = template.replace(/\{\{TOTAL_REVENUE\}\}/g, formatCurrency(totalRevenue));
  template = template.replace(/\{\{TOTAL_COST\}\}/g, formatCurrency(totalCost));
  template = template.replace(/\{\{TOTAL_PROFIT\}\}/g, formatCurrency(totalProfit));
  template = template.replace(/\{\{MARGIN_PCT\}\}/g, marginPct.toFixed(1));
  template = template.replace(/\{\{TABLE_ROWS\}\}/g, tableRows);

  console.log(`✅ Report generated for ${totalOrders} orders`);
  console.log(`   - Revenue: $${totalRevenue.toFixed(2)}`);
  console.log(`   - HAAP Cost: $${totalCost.toFixed(2)}`);
  console.log(`   - Profit: $${totalProfit.toFixed(2)} (${marginPct.toFixed(1)}%)`);

  return template;
}
