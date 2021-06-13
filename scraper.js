const puppeteer = require('puppeteer');
fs = require('fs');

function delay(time) {
    return new Promise(function (resolve) {
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
    page.setDefaultNavigationTimeout(5000)
        page.setDefaultTimeout(1000)
    page.on('console', msg => console.log('PAGE LOG:', msg.text));
    page.on('pageerror', error => {
        console.error(error.message);
    });
    let articles = [];
    let csvEntries = [];
    for (let i = 39; i > 0; i--) {
        for (let j = 6; j > 0; j--) {
            let issuelink = 'https://www.sciencedirect.com/journal/long-range-planning/vol/' + i + '/issue/' + j
            await page.goto(issuelink)
            console.log(issuelink)
            try {
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
                console.log(JSON.stringify(volArticles))
                for (const article of volArticles) {
                    console.log("visiting: " + article.url)
                    // await page.goto('https://www.sciencedirect.com/science/article/abs/pii/S0024630117301140#!')
                    await page.goto(article.url)
                    let authorlist = []
                    for (let k = 0; k < 10; k++) {
                        try {
                            let author = {}
                            await page.click(".author:nth-child(" + k + ") .surname")
                            
                                author.givenName = await page.$eval(".author:nth-child(" + k + ") .given-name", text =>{
                                    return text.textContent
                                })

                                author.surName = await page.$eval(".author:nth-child(" + k + ") .surname", text =>{
                                    return text.textContent
                                })
                            try {
                                await page.waitForSelector("div.Workspace.text-s div.affiliation")
                                author.origin = await page.evaluate(() => {
                                    const elements = document.querySelectorAll("div.Workspace.text-s div.affiliation")
                                    return [...elements].map(element => element.textContent.replace(/(\r\n|\n|\r)/gm, "").trim() || null).slice(0,);
                                });
                            } catch {
                                console.log("Couldn't find div.Workspace.text-s div.affiliation")
                            }
                            if(author.origin === null){
                                try {
                                    await page.waitForSelector("div.content p")
                                    let originEval = () => {
                                        const element = document.querySelector("div.content p")
                                        return element.textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
                                    }
                                    author.origin = await page.evaluate(originEval);
                                    // if (author.origin === null || author.origin === "") { // The content could be dynamically loaded. Waiting a bit...
                                    //     await page.waitForTimeout(4000);
                                    //     author.origin = await page.evaluate(originEval);
                                    // }
                                } catch {
                                    console.log("Couldn't find div.content p")
                                }

                            }
                            // author.origin = author.origin.map(o => o.filter(a => a!=null))
                            console.log(author.origin)
                            authorlist.push(author)
                            }catch{

                            }
                        }
                        article.authors = authorlist
                        // await page.goto(article.url)
                        // await page.goto('https://www.sciencedirect.com/science/article/abs/pii/S0024630116302047#!')
                        // article.authors = []
                        // await page.click('#show-more-btn')
                        // await page.waitForTimeout(1000)
                        // let authors = await page.$$('#author-group > .author')
                        // for (let k = 0; k < authors.length; k++) {
                        //     let author = {}
                        //
                        //     author.givenName = authors[k].$('.text.given-name')?.textContent
                        //     author.surName = ref.querySelector('.text.surname')?.textContent
                        //     await page.$eval(authors[k], (ref) => {
                        //     })
                        //     await authors[k].click()
                        // }
                        // article.authors = await page.$eval('#author-group', async (div) => {
                        //     let authorlist = []
                        //     let authors = div.querySelectorAll('.author')
                        //
                        //     div.querySelectorAll('.author').forEach(
                        //         await async function (div2) {
                        //             let author = {}
                        //             author.givenName = div2.querySelector('.text.given-name')?.textContent
                        //             author.surName = div2.querySelector('.text.surname')?.textContent
                        //             await div2.click()
                        //             try{
                        //                 author.origin = page.$eval('.WorkspaceAuthor > .article-biography' , _=>{
                        //                     return this.textContent
                        //                 })
                        //             }catch (e){
                        //                 console.log(e)
                        //                 try {
                        //                     author.origin = [...page.$$eval('.WorkspaceAuthor > .affiliation')].map(aff => aff.textContent)
                        //                 }catch (e) {
                        //                     console.log(e)
                        //                 }
                        //             }
                        //             console.log(JSON.stringify(author))
                        //             await page.waitForTimeout(100000)
                        //             // if (div2.querySelectorAll('.author-ref').length === 0) {
                        //             //     author.origin = div.querySelector('.affiliation')?.textContent
                        //             // } else {
                        //             //     author.origin = [...div2.querySelectorAll('.author-ref')].map(ref => ref.textContent)
                        //             // }
                        //             authorlist.push(author)
                        //         })
                        //     if (div.querySelectorAll('.affiliation').length !== 1) {
                        //         let affiliations = div.querySelectorAll('.affiliation')
                        //         affiliations.forEach(aff => {
                        //             authorlist = authorlist.map(author => {
                        //                 author.origin = author.origin.map(ref => {
                        //                     if (ref === aff.querySelector('sup').textContent) {
                        //                         console.log(aff.querySelector('dd').textContent)
                        //                         console.log(ref)
                        //                         return aff.querySelector('dd').textContent
                        //                     } else {
                        //                         return ref
                        //                     }
                        //                 })
                        //                 return author
                        //             })
                        //
                        //         })
                        //     }
                        //     return authorlist
                        //
                        // });

                        for (let author of article.authors) {
                            let authorString = article.url + " ;" + article.name + ";" + article.id + ";" + article.issue + ";" + article.volume + ";" + author.givenName + ";" + author.surName
                            if (Array.isArray(author.origin)) {
                                for (let origin of author.origin) {
                                    authorString = authorString.concat(";" + origin)
                                }
                            } else {
                                authorString.concat(";" + author.origin)
                            }
                            console.log(authorString)
                            csvEntries.push(authorString)
                        }
                    console.log(JSON.stringify(article))

                    fs.writeFile('lrp_research_data.csv', csvEntries.join("\n"), function (err) {
                        if (err) return console.log(err);
                        console.log(Date().toString() + ' : lrp_research_data.csv');
                    });
                    }
                    console.log(JSON.stringify(volArticles[0]))
                    articles.push.apply(articles, volArticles)
                }
            catch
                (e)
                {
                    console.error("Error: " + e)
                }

            }
        }

    }
)
();
