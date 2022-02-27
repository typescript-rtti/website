import { Component, Input, Output } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatest } from "rxjs";

@Component({ 
    selector: `rtti-github-markdown`,
    template: `
        <div class="markdown" [innerHTML]="readme | markdownToHtml | trustHtml"></div>
        <footer>
            <a [href]="githubUrl">View on Github</a>
        </footer>
    `,
    styles: [
        `
        footer { text-align: center;}
        `
    ]
})
export class GithubMarkdownComponent {
    constructor() {}

    private _path : string;

    @Input() get path() { 
        return this._path;
    }

    set path(value) {
        this._path = value;
        this.name = value;
        setTimeout(() => {
            this.reload();
        });
    }

    get url() {
        return `https://raw.githubusercontent.com/typescript-rtti/typescript-rtti/main/${this.path}`;
    }

    get githubUrl() {
        return `https://github.com/typescript-rtti/typescript-rtti/blob/main/${this.path}`;
    }

    async reload() {
        let response = await fetch(this.url);
        let readme = await response.text();
        this.readme = readme;
        this.readme = this.readme.replace(/\.\/logo-long.svg/g, '/assets/logo-long.svg');
        this.readme = this.readme.replace(/(\[!\[CircleCI\])/, "\n\n$1")
        this.readme = this.readme.replace(/^.*\[NPM\]\(.*?\).*$/mg, '');
    }

    name : string;
    readme : string;
}