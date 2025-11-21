import { NextRequest, NextResponse } from 'next/server';
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

    // Add auto-print script to the HTML
    const htmlWithPrint = htmlContent.replace(
      '</body>',
      `<script>
        // Auto-open print dialog after page loads
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
      </body>`
    );

    // Return HTML that will open print dialog
    return new NextResponse(htmlWithPrint, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
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
