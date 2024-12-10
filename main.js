const fs = require('fs-extra');
const path = require('path');

class StaticSearchPlugin {
    constructor(API, name, config) {
        this.API = API;
        this.name = name;
        this.config = config;
        this.outputFile = 'search.json';
    }

    addInsertions() {
        this.API.addInsertion('customSearchInput', this.addSearchInput, 1, this);
        this.API.addInsertion('customSearchContent', this.addSearchContent, 1, this);
    }

    addSearchInput(rendererInstance, context) {
        let searchUrl = '';
        let searchAutofocus = '';

        if (rendererInstance.globalContext && rendererInstance.globalContext.website) {
            searchUrl = rendererInstance.globalContext.website.searchUrl;
        }

        if (this.config.searchAutofocus) {
            searchAutofocus = `autofocus`;
        }

        return `<form action="${searchUrl}" class="search__form">
            <input
                class="search__input"
                type="search"
                name="${this.config.searchParam}"
                placeholder="${this.config.searchPlaceholder}" 
                aria-label="${this.config.searchPlaceholder}"
                ${searchAutofocus}
                required
            />
            <button type="submit" class="search__button"><span>
                ${this.config.searchSubmitLabel}</span>
            </button>
        </form>`;
    }

    addSearchContent(rendererInstance, context) {
        this.rendererInstance = rendererInstance;
        this.globalContext = this.rendererInstance.globalContext;
        this.context = {
            siteName: this.rendererInstance.siteConfig.displayName,
            siteDomain: this.rendererInstance.siteConfig.domain,
            siteLogo: this.globalContext.config.basic.logo,
            siteAuthor: context.siteOwner,
            items: this.rendererInstance.contentStructure.pages.concat(this.rendererInstance.contentStructure.posts),
        };

        this.renderSearchFeed();

        let searchUrl = '';

        if (this.globalContext && this.globalContext.website) {
            searchUrl = this.globalContext.website.searchUrl;
        }

        return `<form action="${searchUrl}" class="search-page-form">
            <input
                type="search"
                name="${this.config.searchParam}"
                placeholder="${this.config.searchPlaceholder}"
                class="search-page-input"
                required
            />
            <button type="submit" class="search-page-button"><span>
                ${this.config.searchSubmitLabel}</span>
            </button>
        </form>
        <div id="search-results"></div>
        <script>(async function () {
            let url = "./${this.outputFile}";
            let response = await fetch(url);
            let jsonData = await response.json();
          
            const params = new URLSearchParams(window.location.search)
            let searchTerm = params.get("${this.config.searchParam}");
            let results = [];
            
            document.querySelector(".search-page-input").value = searchTerm;
          
            jsonData.items.forEach((item) => {
              let title = item.title.toLowerCase();
              let summary = item.summary.toLowerCase();
              let url = item.url;
          
              if (title.includes(searchTerm.toLowerCase()) || summary.includes(searchTerm.toLowerCase())) {
                results.push(item);
              }
            });
          
            let elm = document.querySelector("#search-results");
            if (results.length > 0) {
              results.forEach((result)=>{
                elm.innerHTML += '<h5><a href="'+ result.url +'">' + result.title + '</a></h5><p>' + result.summary + '</p>'
              });
            } else {
              elm.innerHTML = '<p>No Results Found</p>';
            }
        })();                        
        </script>`;
    }

    renderSearchFeed() {
        if (this.rendererInstance.menuContext.length !== 1 || (this.rendererInstance.menuContext[0] !== 'frontpage' && this.rendererInstance.menuContext[0] !== 'blogpage')) {
            return;
        }

        // Load template
        let inputFile = 'search-feed.hbs';
        let compiledTemplate = this.rendererInstance.compileTemplate(inputFile);

        let content = this.rendererInstance.renderTemplate(compiledTemplate, this.context, this.globalContext, inputFile);

        this.saveOutputFile(this.outputFile, content);
    }

    saveOutputFile(fileName, content) {
        let filePath = path.join(this.rendererInstance.outputDir, fileName);

        fs.ensureDirSync(path.parse(filePath).dir);
        fs.outputFileSync(filePath, content, 'utf-8');
    }
}

module.exports = StaticSearchPlugin;
