import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { generateHAAPReport } from '@/lib/generate-haap-report';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    console.log(`Generating HAAP report for ${startDate} to ${endDate}`);

    // Generate HTML content using TypeScript function
    const htmlContent = await generateHAAPReport(startDate, endDate);

    // Define output paths
    const pdfFilename = `haap_report_${startDate}_to_${endDate}.pdf`;
    const pdfPath = path.join('/tmp', pdfFilename);

    // Launch puppeteer and convert to PDF
    console.log('Converting HTML to PDF...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF with landscape orientation and no headers/footers
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '0.4in',
        right: '0.5in',
        bottom: '0.4in',
        left: '0.5in',
      },
    });

    await browser.close();
    console.log('PDF generated successfully');

    // Read the PDF file
    const pdfBuffer = await fs.readFile(pdfPath);

    // Clean up temporary PDF file
    await fs.unlink(pdfPath).catch(() => {});

    // Return the PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: String(error) },
      { status: 500 }
    );
  }
}
