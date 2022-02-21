import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home/home.component';

import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { PlaygroundService } from './playground.service';
import { PlaygroundComponent } from './playground/playground.component';
import { FormsModule } from '@angular/forms';
import { MarkdownToHtmlPipe } from './markdown-to-html.pipe';
import { TrustHtmlPipe } from './trust-html.pipe';
import { GithubMarkdownComponent } from './github-markdown.component';
import { GithubMarkdownRouteComponent } from './github-markdown-route.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PlaygroundComponent,
    MarkdownToHtmlPipe,
    TrustHtmlPipe,
    GithubMarkdownComponent,
    GithubMarkdownRouteComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatTabsModule,
    MonacoEditorModule.forRoot({
      baseUrl: './assets'
    })
  ],
  providers: [
    PlaygroundService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
