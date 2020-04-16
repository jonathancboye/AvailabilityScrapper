const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const process = require('process');

// You can change this stuff
//////////////////////////////////
const sites = [
    "https://www.verabradley.com/us/product/Cotton-Face-Mask-(NonMedical)/28001-28001063",
    "https://www.verabradley.com/us/product/Cotton-Face-Mask-(NonMedical)/28001-28001N52",
    "https://www.verabradley.com/us/product/Cotton-Face-Mask-(NonMedical)/28001-28001010"
];
const unavailable = "Restocking Soon";
const availabiltyQuery = 'document.querySelector(".availability-message.js-availability-status").textContent';
const checkerFrequency = 30000; // in milliseconds
const dontShowBrowser = true;
//////////////////////////////////

const emailSender = process.env.EMAILSENDER;
const emailReciever = process.env.EMAILRECIEVER;
const emailPassword = process.env.EMAILPASSWORD;


(async () => {
    const browser = await puppeteer.launch({"headless" : dontShowBrowser});
    const page = await browser.newPage();

    await pollStatus(page);
    await browser.close();
})();

async function pollStatus(page) {
    let siteGen = siteGenerator(sites);

    while (true) {
        let siteToCheck = siteGen.next().value;
        await page.goto(siteToCheck);
        let status = await page.evaluate(availabiltyQuery);
        console.log(status);

        if (status !== unavailable) {
            sendEmail(siteToCheck);
            break;
        }

        await sleep(checkerFrequency);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function* siteGenerator(sites) {
    let currentSite = 0;
    while (true) {
        yield sites[currentSite++ % sites.length];
    }
}

function sendEmail(site) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailSender,
            pass: emailPassword
        }
    });
    
    var mailOptions = {
        from: emailSender,
        to: emailReciever,
        subject: 'Web Scrapper: Something is available',
        text: `Something is available: ${site}`
    };
    
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}