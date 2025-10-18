// index.js - Your PDF Generation Microservice

const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Your secret key to prevent abuse of the API
// You will set this as an Environment Variable in Railway
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// Middleware to protect your API
const requireApiKey = (req, res, next) => {
    const apiKey = req.get('x-api-key');
    if (!API_SECRET_KEY || !apiKey || apiKey !== API_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

app.get('/generate-pdf', requireApiKey, async (req, res) => {
    const urlToCapture = req.query.url;

    if (!urlToCapture) {
        return res.status(400).json({ error: 'URL parameter is required.' });
    }

    let browser = null;
    try {
        console.log("Launching browser...");
        
        // Launch Puppeteer with the serverless-friendly chromium package
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        
        console.log(`Navigating to URL: ${urlToCapture}`);
        await page.goto(urlToCapture, { waitUntil: 'networkidle2' }); // Wait for the page to be fully loaded

        console.log("Generating PDF...");
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        console.log("PDF generated successfully. Sending response.");
        
        // Set headers to tell the client this is a PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"'); // The filename can be overridden by the client
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF.', details: error.message });
    } finally {
        if (browser) {
            console.log("Closing browser.");
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`PDF Generator API listening on port ${PORT}`);
});