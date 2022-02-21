import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GithubMarkdownComponent } from './github-markdown.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'readme', component: GithubMarkdownComponent, data: { path: 'README.md' } }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
