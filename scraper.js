const request = require('request');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

// Get and format today's date
let today = new Date();
let day = today.getDate();
let month = today.getMonth()+1;
let year = today.getFullYear();
// Add 0 in front of day if less than 10
if(day < 10) {
    day = '0' + day;
} 
// Add 0 in front of month if less than 10
if(month < 10) {
    month = '0' + month;
} 
today = year + '-' + month + '-' + day;

// Visit main website url
const entryUrl = 'http://shirts4mike.com/shirts.php';
const shirtRequest = () => {
    const records = [];
    request(entryUrl, (error, response, html) => {
        if (!error && response.statusCode == 200) {
            const $ = cheerio.load(html);
            // Loop through each product on page
            $('.products li a').each((i, el) => {
                const shirtLink = $(el).attr('href');
                const mainUrl = 'http://shirts4mike.com';
                // Add individual shirt links to the main url
                const fullURL = mainUrl + '/' + shirtLink;
                records.push(shirtPage(fullURL));
            });
            Promise.all(records)
            .then(i => {
                csvWriter.writeRecords(i) // returns a promise
                .then(() => console.log('Scraping Done...'));
            });
        } else if (error) {
            console.log("There’s been a 404 error. Cannot connect to http://shirts4mike.com.");
            logErrors(error);
        }
    });
};

// Create data folder in parent folder if data folder doesn't already exist
if (fs.existsSync("./data")) {
    shirtRequest();
} else {
    fs.mkdir("./data", () => {
        shirtRequest();
    });
}

const csvWriter = createCsvWriter({
    path: './data/' + today + '.csv',
    header: [
        {id: 'title', title: 'Title'},
        {id: 'price', title: 'Price'},
        {id: 'imgurl', title: 'ImageURL'},
        {id: 'url', title: 'URL'},
        {id: 'time', title: 'Time'}
    ]
});
 
// visit the individual shirt pages
const shirtPage = (link) => {
    return new Promise((resolve, reject) => {
        request(link, (error, response, html) => {
            if (!error && response.statusCode == 200) {
                try {
                    //load html content
                    const $ = cheerio.load(html);
                    //get shirt price
                    const shirtPrice = $('.shirt-details .price').text();
                    // get shirt title, removing the dollar amount and the comma to place entire title in its own csv column
                    const shirtTitle = $('.shirt-details h1').children().remove().end().text().replace(/,/, '');
                    // get shirt img url
                    const shirtImgURL = 'http://shirts4mike.com/' + $('.shirt-picture span img').attr('src');
                    // get shirt page url
                    const shirtURL = link;
                    // get current time
                    let today = new Date();
                    let hours = today.getHours();
                    let minutes = today.getMinutes();
                    // Add 0 in front of minute number if less than 10
                    if (minutes < 10) {
                        minutes = '0' + minutes;
                    }
                    // Add AM/PM format to time
                    if (hours == 12) {
                        minutes = minutes + ' PM';
                    } else if (hours == 24) {
                        hours = hours - 12;
                        minutes = minutes + ' AM';
                    }
                    else if (hours < 24 && hours > 12) {
                        hours = hours - 12;
                        minutes = minutes + ' PM';
                    } else {
                        minutes = minutes + ' AM';
                    }
                    let time = hours + ':' + minutes;
                    
                    //Write page content into CSV rows
                    // writeCSV.write(`${shirtTitle},${shirtPrice},${shirtImgURL},${shirtURL},${time} \n`);

                    const records = {
                        title: shirtTitle,
                        price: shirtPrice,
                        imgurl: shirtImgURL,
                        url: shirtURL,
                        time: time
                    };
                    resolve(records);
                } 
                catch(err) {
                    reject(err);
                }
            }
        });
    });
};

// Log errors to file "scraper-error.log"
const logErrors = (error) => {
    // Append error to the bottom of the file with a time stamp and error e.g. [Tue Feb 16 2016 10:02:12 GMT-0800 (PST)] <error message>
    let timestamp = new Date();
    let errorMessage = `[${timestamp}] ${error} \n`;
    // if file exists, add to it
    if (fs.existsSync('scraper-error.log')) {
        fs.appendFile('scraper-error.log', errorMessage, (err) => {
            if(err) throw err;
        });
    } else {
        fs.writeFile('scraper-error.log', errorMessage, (err) => {
            if(err) throw err;
        });
    }
};