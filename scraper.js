const puppeteer = require('puppeteer');
fs = require('fs');

(async () => {

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    })
    page.setDefaultTimeout(60000)

    const issueLinks = [];
    for (let i = 2021; i > 1979; i--) {
        await page.goto('https://onlinelibrary.wiley.com/loi/10970266/year/' + i)
        try{
            await page.waitForSelector('.parent-item');
        }catch (e){
            console.error("Error")
        }
        var yearLinks = await page.$$eval('.parent-item', li => {
            return li.map(function (el){
                    return el.getElementsByTagName('a')[0].href
                }
            )});
        issueLinks.push.apply(issueLinks,yearLinks)
    }
    let articles = [{}];
    let authorObj;
    for (const issuelink of issueLinks) {
        await page.goto(issuelink)
        let articlelink = issuelink.split('/')
        let volArticles = []
        let unfilteredArticles = []
        unfilteredArticles = await page.$$eval('div.issue-item', div => {
            return div.map(function (div) {
                let article = {}
                article.url = div.getElementsByTagName('a')[0].href
                article.pageRange = div.getElementsByClassName('page-range')[0].lastChild.textContent
                article.name = div.getElementsByTagName('h2')[0].textContent
                return article
            })
        });
        volArticles = unfilteredArticles.filter(function (art) {
            return !(art.name === "Table of Contents"
                || art.name === "Erratum"
                || art.name === "Issue Information"
                || art.name === "Masthead"
                || art.name === "Copyright Page");
        })
        volArticles.map(article => {
            article.id = articlelink[articlelink.length - 1]
            article.volume = articlelink[articlelink.length - 2]
            article.year = articlelink[articlelink.length - 3]
        })
        for (const article of volArticles) {
            console.log("visiting: " + article.url)
            await page.goto(article.url)
            article.authors = []
            const autInfo = await page.$$('.loa-authors .accordion-tabbed__tab-mobile')
            for (const aut of autInfo) {
                authorObj = {}
                authorObj.name = await aut.$eval('a.author-name', name => name.textContent)
                authorObj.origin = await aut.$eval('.author-info', el => {
                    let p = el.getElementsByTagName('p')
                    switch (p.length) {
                        case 0:
                            return ""
                        case 1:
                            return p[0].textContent
                    }
                    if (p.length > 1) {
                        return p[1].textContent
                    }
                })
                article.authors.push(authorObj)
            }
        }
        articles.push.apply(articles, volArticles)
        fs.writeFile('smj_research_data.json', JSON.stringify(articles, null, 2), function (err) {
            if (err) return console.log(err);
            console.log(Date().toString() + ' : smj_research_data.json');
        });
    }
})();
