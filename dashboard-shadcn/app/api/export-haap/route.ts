import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Path to the Python script (in dashboard-shadcn directory for Vercel)
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_haap_report.py');
    const outputDir = process.cwd();

    // Execute the Python script to generate HTML
    const command = `python3 "${scriptPath}" ${startDate} ${endDate}`;

    console.log('Executing:', command);
    const { stdout, stderr } = await execAsync(command, {
      cwd: outputDir,
      timeout: 60000, // 60 second timeout
    });

    if (stderr && !stderr.includes('Warning')) {
      console.error('Script error:', stderr);
    }

    console.log('Script output:', stdout);

    // Determine the output filename
    const htmlFilename = `haap_report_${startDate}_to_${endDate}.html`;
    const htmlPath = path.join(outputDir, htmlFilename);
    const pdfFilename = `haap_report_${startDate}_to_${endDate}.pdf`;
    const pdfPath = path.join(outputDir, pdfFilename);

    // Check if HTML file exists
    try {
      await fs.access(htmlPath);
    } catch {
      return NextResponse.json(
        { error: 'Report generation failed - HTML file not found' },
        { status: 500 }
      );
    }

    // Read the HTML content
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');

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

    // Clean up temporary files
    await fs.unlink(htmlPath).catch(() => {});
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
