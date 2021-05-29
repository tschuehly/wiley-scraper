const puppeteer = require('puppeteer');
fs = require('fs');
function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time)
    });
}
(async () => {

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    })
    page.setDefaultTimeout(60000)

    let articles = [{}];
    for (let i = 53; i > 0; i--) {
        for (let j = 6; j > 0; j--){
            let issuelink = 'https://www.sciencedirect.com/journal/long-range-planning/vol/'+ i + '/issue/' + j
            await page.goto(issuelink)
            try{
                await page.waitForSelector('.js-article-list.article-list-items');
                let unfilteredArticles = []
                let volArticles = []
                unfilteredArticles = await page.$$eval('dl.js-article', dl => {
                    return dl.map(function (div) {
                        let article = {}

                        let h3 = div.querySelector('dt > h3')
                        article.url = h3.getElementsByTagName('a')[0].href
                        article.name = h3.getElementsByClassName('js-article-title')[0].textContent
                        article.id = div.querySelector('.js-article-page-range').textContent
                        return article
                    })
                });

                volArticles = unfilteredArticles.filter(function (art) {
                    return !(art.name === "Editorial Board"
                        || art.name === "Erratum");
                })
                volArticles.map(article => {
                    article.issue = j
                    article.volume = i
                })

                for (const article of volArticles) {
                    console.log("visiting: " + article.url)
                    await page.goto(article.url)
                    article.authors = []
                    await page.click('#show-more-btn')
                    article.authors = await page.$$eval('#author-group', topDiv => {
                        return topDiv.map(function (div) {
                            let authorlist = []
                            div.querySelectorAll('.author').forEach(
                                function (div){
                                let author = {}
                                author.givenName = div.querySelector('.text.given-name').textContent
                                author.surName = div.querySelector('.text.surname').textContent
                                author.origin = [...div.querySelectorAll('.author-ref')].map(ref => ref.textContent)
                                authorlist.push(author)
                            })

                            div.querySelectorAll('.affiliation').forEach(aff => {
                                authorlist = authorlist.map(author => {
                                    author.origin = author.origin.map(ref => {
                                        if(ref === aff.querySelector('sup').textContent){
                                            return aff.querySelector('dd').textContent
                                        }else{
                                            return ref
                                        }
                                    })
                                    return author
                                })

                            })

                            return authorlist
                        })

                    });
                    console.log(JSON.stringify(article))
                }
                console.log(JSON.stringify(volArticles[0]))
                articles.push.apply(articles, volArticles)
            }catch (e){
                console.error("Error: " + e)
            }

            fs.writeFile('lrp_research_data.json', JSON.stringify(articles, null, 2), function (err) {
                if (err) return console.log(err);
                console.log(Date().toString() + ' : smj_research_data.json');
            });
        }
    }

})();
