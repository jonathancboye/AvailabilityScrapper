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
    const browser = await puppeteer.launch({ "headless": dontShowBrowser });
    const page = await browser.newPage();

    await checkAllSitesAndSendEmailWhenAvailable(
        page, checkerFrequency, sites,
        emailSender, emailReciever, emailPassword
    );
    await browser.close();
})();

async function checkAllSitesAndSendEmailWhenAvailable(
    page, frequency, sites,
    emailSender, emailReciever, emailPassword
) {
    let sitesToCheck = getSitesToCheck(sites);

    while (true) {
        let site = sitesToCheck.next().value;
        if (await visitPage(page, site)) {
            let status = await checkStatus(page, availabiltyQuery);

            if (status !== unavailable) {
                sendEmail(site, emailSender, emailReciever, emailPassword);
                break;
            }
        };

        await sleep(frequency);
    }
}

async function checkStatus(page, query) {
    let status = await page.evaluate(query);
    console.log(status);
    return status;
}

async function visitPage(page, site) {
    try {
        await page.goto(site, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        return true;
    }
    catch {
        console.log(`Failed to visit ${site}, trying again`);
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function* getSitesToCheck(sites) {
    let currentSite = 0;
    while (true) {
        yield sites[currentSite++ % sites.length];
    }
}

function sendEmail(site, emailSender, emailReciever, emailPassword) {
    let mailTransporter = getGmailTransporter(emailSender, emailPassword);
    let mailOptions = getMailOptions(emailSender, emailReciever, site);
    sendMail(mailTransporter, mailOptions);
}

function sendMail(transporter, mailOptions) {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function getGmailTransporter(emailSender, emailPassword) {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailSender,
            pass: emailPassword
        }
    });
}

function getMailOptions(emailSender, emailReciever, site) {
    return {
        from: emailSender,
        to: emailReciever,
        subject: 'Web Scrapper: Something is available',
        text: `Something is available: ${site}`
    };
}