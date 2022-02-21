import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatest } from "rxjs";

@Component({
    template: `<rtti-github-markdown [path]="path"></rtti-github-markdown>`,
    styles: [`
        :host {
            display: block;
            margin: 0 auto;
            width: 960px;
            max-width: 100%;
        }
    `]
})
export class GithubMarkdownRouteComponent {
    constructor(
        private route : ActivatedRoute
    ) {

    }

    path : string;

    ngOnInit() {
        this.route.data.subscribe(data => this.path = data['path']);
    }
}